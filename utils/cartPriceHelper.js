import { calculateVariantPrice } from "./offerCalculator.js";
import ProductVariant from "../models/productVariantSchema.js";
import mongoose from "mongoose";


export const calculateCartItemsPrice = async (variant, variantId) => {

    // Make sure we have a valid variant
        if (!variant) {
            console.error("No variant provided to calculateCartItemsPrice");
            return {
                displayPrice: 0,
                originalPrice: 0,
                discountedPercentage: 0,
                hasDiscount: false,
                hasOffer: false,
                discountType: 'none',
                offerDetails: null
            };
        }
        
        // Use the provided variantId or get it from variant
        const actualVariantId = variantId || variant._id;
        
        const offerData = await calculateVariantPrice(actualVariantId);

    if(offerData.hasOffer){
        return {
            displayPrice: offerData.finalPrice,
            originalPrice: offerData.originalPrice,
            discountedPercentage: offerData.discountPercentage,
            hasDiscount: true,
            hasOffer: true,
            discountType: offerData.discountType,
            offerDetails: offerData.offerDetails
        };
    }

    // check for manual discount
    if(variant.discountedPrice && variant.discountedPrice > 0 && variant.discountedPrice < variant.price){
        const discountPercentage = Math.round(((variant.price - variant.discountedPrice)/ variant.price) * 100);
        return {
            displayPrice: Math.round(variant.discountedPrice),
            originalPrice: Math.round(variant.price),
            discountPercentage,
            hasDiscount: true,
            hasOffer: false,
            discountType: 'manual',
            offerDetails: null
        };
    }
    // No discount at all
    return {
        displayPrice: Math.round(variant.price),
        originalPrice: Math.round(variant.price),
        discountPercentage: 0,
        hasDiscount: false,
        hasOffer: false,
        discountType: 'none',
        offerDetails: null
    };

}



export const enrichCartItemsWithPrices = async (cartItems) => {
    return await Promise.all(
        cartItems.map(async (item)=>{
            const variantData = item.variantData || item.productVariantId;
            if(!variantData){
                return {
                    ...item,
                    calculatedPrice: null
                };
            }

            if(typeof variantData === 'object' && variantData.price !== undefined){

                const priceData = await calculateCartItemsPrice(variantData, variantData._id);
                
                return {
                    ...item,
                    calculatedPrice: priceData
                };
            }else{
                const variant = await ProductVariant.findById(variantData).select('price discountedPrice isListed');

                if(!variant){
                    return{
                        ...item,
                        calculatedPrice: null
                    };
                }

                const priceData = await calculateCartItemsPrice(variant, variant._id);
                return {
                    ...item,
                    calculatedPrice: priceData
                };
            }

        })
    );
};



export const calculateCartSubtotalWithOffers = async (items) => {
    let subtotal = 0 ;
    for(const item of items){
        const variant = item.productVariantId;
        if(!variant) continue;

        let variantObj = variant;
        if(typeof variant === 'string' && variant instanceof mongoose.Types.ObjectId){
            variantObj = await ProductVariant.findById(variant).select('price discountedPrice');
        }

        if(!variantObj) continue;

        const priceData = await calculateCartItemsPrice(variantObj, variantObj._id);
        subtotal += priceData.displayPrice * item.quantity;
    }
    return Math.round(subtotal);
}


export const getCartItemDispayPrice = async (item) =>{
    const variant = item.productVariantId;
    if(!variant){
       return {
         displayPrice: 0,
        originalPrice: 0,
        saveAmount: 0,
        hasDiscount: false
       };
    }
    const priceData = await calculateCartItemsPrice(variant, variant._id);
    const saveAmount = priceData.hasDiscount ? (priceData.originalPrice - priceData.displayPrice) * item.quantity : 0 ;
    return {
        displayPrice: priceData.displayPrice,
        originalPrice: priceData.originalPrice,
        saveAmount: Math.round(saveAmount),
        hasDiscount: priceData.hasDiscount,
        discountPercentage: priceData.discountPercentage,
        hasOffer: priceData.hasOffer,
        offerDetails: priceData.offerDetails
    };
};