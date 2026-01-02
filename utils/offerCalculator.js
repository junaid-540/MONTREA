import ProductOffer from "../models/productOfferSchema.js";
import CategoryOffer from "../models/categoryOfferSchema.js";
import Product from "../models/productSchema.js";
import ProductVariant from "../models/productVariantSchema.js";

export const calculateVariantPrice = async (variantId) => {
    try {
        const variant = await ProductVariant.findById(variantId)
                    .populate({
                        path: 'productId',
                        populate: {
                            path: 'categoryId',
                            select: 'name'
                        }
                    });

        if(!variant || !variant.productId || !variant.productId.categoryId){
            return {
                originalPrice: variant?.price || 0,
                finalPrice: variant?.price || 0,
                discountPercentage: 0,
                discountType: 'none',
                hasOffer: false,
                hasManualDiscount: false
            };
        }

        const product = variant.productId;
        const now = new Date();


        const productOffers = await ProductOffer.find({
            productId: product._id,
            isActive: true,
            startDate: { $lte : now },
            endDate : { $gte : now }
        }).sort({ offerPercentage: -1}); 

        const categoryOffers = await CategoryOffer.find({
            categoryId: product.categoryId._id,
            isActive: true,
            startDate: { $lte : now },
            endDate: {$gte : now }
        }).sort({ offerPercentage: -1 });

        let bestOffer = null;
        let bestOfferPercentage = 0;
        let discountType = "none";

        if(productOffers.length > 0){
            bestOffer = productOffers[0];
            bestOfferPercentage = productOffers[0].offerPercentage;
            discountType = 'product';
        }

        if(categoryOffers.length > 0 && categoryOffers[0].offerPercentage > bestOfferPercentage){
            bestOffer = categoryOffers[0];
            bestOfferPercentage = categoryOffers[0].offerPercentage;
            discountType = 'category';
        }

        const originalPrice = variant.price;
        let finalPrice = originalPrice;
        let discountPercentage = 0;

        if(bestOffer){
            discountPercentage = bestOfferPercentage;
            const discountAmount = (originalPrice * discountPercentage) / 100;
            finalPrice = originalPrice - discountAmount;
        }else if(variant.discountedPrice && variant.discountedPrice > 0 && variant.discountedPrice < originalPrice){
            finalPrice = variant.discountedPrice;
            discountPercentage = ((originalPrice - finalPrice) / originalPrice) * 100;
            discountType = 'manual';
        }

        return {
            variantId,
            originalPrice: Math.round(originalPrice),
            finalPrice: Math.round(finalPrice),
            discountPercentage: Math.round(discountPercentage),
            discountType,
            hasOffer: discountType === 'product' || discountType === 'category',
            hasManualDiscount: discountType === 'manual',
            offerDetails: bestOffer
        }
        
    } catch (error) {
        console.error("Error calculating variant price :",error);
        return {
            originalPrice: 0,
            finalPrice: 0,
            discountPercentage: 0,
            discountType: "none",
            hasOffer: false,
            hasManualDiscount: false
        };
    }
}



/**
 * Get all active offers for a product (for display purposes)
 */
export const getProductOffers = async (productId) => {
    try {
        const product = await Product.findById(productId)
            .populate("categoryId", "name")
            .lean();

        if (!product) return [];

        const now = new Date();
        const offers = [];

        // Get product offers
        const productOffers = await ProductOffer.find({
            productId,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).sort({ offerPercentage: -1 });

        if (productOffers.length > 0) {
            offers.push({
                type: "product",
                percentage: productOffers[0].offerPercentage,
                offerName: productOffers[0].offerName,
                startDate: productOffers[0].startDate,
                endDate: productOffers[0].endDate
            });
        }

        // Get category offers
        if (product.categoryId) {
            const categoryOffers = await CategoryOffer.find({
                categoryId: product.categoryId._id,
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            }).sort({ offerPercentage: -1 });

            if (categoryOffers.length > 0) {
                const categoryOffer = categoryOffers[0];
                // Only add if better than existing product offer
                if (offers.length === 0 || categoryOffer.offerPercentage > offers[0].percentage) {
                    if (offers.length > 0) offers.shift(); // Remove product offer if category is better
                    offers.push({
                        type: "category",
                        percentage: categoryOffer.offerPercentage,
                        offerName: categoryOffer.offerName,
                        startDate: categoryOffer.startDate,
                        endDate: categoryOffer.endDate,
                        categoryName: product.categoryId.name
                    });
                }
            }
        }

        return offers;
    } catch (error) {
        console.error("Error getting product offers:", error);
        return [];
    }
};