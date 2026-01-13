import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import ProductVariant from "../../models/productVariantSchema.js";
import Category from "../../models/categorySchema.js";
import Wishlist from "../../models/wishlistSchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";
import Cart from "../../models/cartSchema.js";
import { calculateVariantPrice, getProductOffers } from "../../utils/offerCalculator.js";


export const getWishlist = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        if(!userId){
            return res.redirect('/signin');
        }

        let wishlist = await Wishlist.findOne({userId})
                .populate('items.productId', 'name coverImage isListed categoryId')
                .populate('items.productVariantId', 'color size stock images price discountedPrice isListed');

        if(!wishlist || wishlist.items.length === 0){
            return res.render('user/wishlist',{
                Title:'My Wishlist',
                wishlist : {items: []},
                pageCss: '/public/css/user/wishlist.css',
                pageJs: '/public/js/user/wishlist.js',
                user: res.locals.user || null,
                is404: true
            });
        }

        const categoryIds = wishlist.items.map(item => item.productId?.categoryId).filter(Boolean);
        const categories = await Category.find({_id: {$in: categoryIds}}).lean()

        const categoryMap = {};
        categories.forEach(cat =>{
            categoryMap[cat._id.toString()] = cat
        });

        const itemsWithOfferPrices = await Promise.all(
            wishlist.items.map(async (item) =>{
                const product = item.productId;
                const variant = item.productVariantId;
                const category = product?.categoryId ? categoryMap[product.categoryId.toString()] : null;
                const isProductListed = product?.isListed;
                const isVariantListed = variant?.isListed;
                const isCategoryListed = category?.isListed;

                if(isProductListed && isVariantListed && isCategoryListed){
                    let priceData = null;
                    if(variant){
                        priceData = await calculateVariantPrice(variant._id);
                    }

                    let productOffers = [];
                    if(product){
                        productOffers = await getProductOffers(product._id);
                    }

                    return {
                        ...item.toObject(),
                        calculatedPriceData: priceData,
                        productOffers: productOffers.length > 0 ? productOffers[0] : null 
                    };
                }
                return null
            })
        );

        const validItems = itemsWithOfferPrices.filter( item => item !== null);
        
        return res.render('user/wishlist',{
            Title: 'My wishlist',
            user: res.locals.user || null,
            wishlist: {items: validItems},
            pageCss: '/public/css/user/wishlist.css',
            pageJs: '/public/js/user/wishlist.js',
            is404: true
        })
    } catch (err) {
        console.error('Error in getWishlist :',err);
        next(err)
    }
}


export const addToWishlist = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.UNAUTHORIZED,
                message: 'Please login to add items to wishlist',
                redirectTo: '/signin'
            });
        }

        const { productId, productVariantId } = req.body;

        if (!productId || !productVariantId) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Product and variant are required'
            });
        }

        const product = await Product.findById(productId).populate('categoryId');
        if (!product) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.PRODUCT_NOT_FOUND
            });
        }

        if (!product.isListed) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This product is currently unavailable'
            });
        }

        if (!product.categoryId || !product.categoryId.isListed) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This product category is currently unavailable'
            });
        }

        const variant = await ProductVariant.findById(productVariantId);
        if (!variant) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Product variant not found'
            });
        }

        if (!variant.isListed) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This product variant is currently unavailable'
            });
        }

        if (variant.productId.toString() !== productId) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Invalid product variant'
            });
        }

        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
        }

        const existingItemIndex = wishlist.items.findIndex(
            item => item.productVariantId.toString() === productVariantId
        );

        if (existingItemIndex > -1) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This item is already in your wishlist'
            });
        }

        wishlist.items.push({
            productId,
            productVariantId,
            addedAt: new Date()
        });

        await wishlist.save();

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: 'Added to wishlist successfully',
            data: {
                productName: product.name,
                variantDetails: {
                    color: variant.color,
                    size: variant.size
                },
                wishlistItemsCount: wishlist.items.length
            }
        });

    } catch (err) {
        console.error("Error in addToWishlist:", err);
        next(err);
    }
};

export const checkVariantInWishlist = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return sendResponse(res, {
                success: true,
                statusCode: statusCodes.OK,
                data: { inWishlist: false }
            });
        }

        const { variantId } = req.params;
        if (!variantId) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Variant ID is required'
            });
        }

        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return sendResponse(res, {
                success: true,
                statusCode: statusCodes.OK,
                data: { inWishlist: false }
            });
        }

        const itemInWishlist = wishlist.items.find(
            item => item.productVariantId.toString() === variantId
        );

        if (itemInWishlist) {
            return sendResponse(res, {
                success: true,
                statusCode: statusCodes.OK,
                data: { inWishlist: true }
            });
        }

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            data: { inWishlist: false }
        });

    } catch (err) {
        console.error("Error in checkVariantInWishlist:", err);
        next(err);
    }
};


export const removeFromWishlist = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        if(!userId){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.UNAUTHORIZED,
                message: 'Please signin in to manage your wishlist'
            });
        }

        const {variantId} = req.params;
        console.log("params",variantId)
        if(!variantId){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Product variant ID is required'
            });
        }

        const wishlist = await Wishlist.findOne({userId});
        if(!wishlist || wishlist.items.length === 0){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Wishlist is empty'
            });
        }

        const originalCount = wishlist.items.length;

        wishlist.items = wishlist.items.filter(
            item => item.productVariantId.toString() !== variantId
        );

        if(originalCount === wishlist.items.length){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Item not found in wishlist'
            });
        }

        await wishlist.save();

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Item removed from wishlist successfully.',
            data:{
                wishlistItemsCount : wishlist.items.length,
                isEmpty: wishlist.items.length === 0
            }
        })
    } catch (err) {
        console.error("Error in removeFromWishlist :",err);
        next(err)
    }
}

export const moveToCart = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        if(!userId){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.UNAUTHORIZED,
                message: 'Please signin to continue'
            });
        }

        const {productId , productVariantId , quantity = 1} = req.body;

        if(!productId || !productVariantId){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Product and variant are required'
            });
        }

        const qty = parseInt(quantity);
        if(isNaN(qty) || qty < 1){
            return sendResponse(res,{
                success: false, 
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Invalid quantity'
            });
        }

        const MAX_QUANTITY_PER_PRODUCT = 5;
        if(qty > MAX_QUANTITY_PER_PRODUCT){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: `Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product`
            });
        }

        const product = await Product.findById(productId).populate('categoryId');
        if(!product){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.PRODUCT_NOT_FOUND
            });
        }

        if(!product.isListed){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This product is currently unavailable'
            });
        }

        if(!product.categoryId || !product.categoryId.isListed){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This product category is currently unavailable'
            });
        }

        const variant = await ProductVariant.findById(productVariantId);
        if(!variant){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Product variant not found'
            });
        }

        if(!variant.isListed){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This product variant is currently unavailable'
            });
        }

        if(variant.productId.toString() !== productId){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Invalid product variant'
            });
        }

        if (variant.stock === 0) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This product is out of stock'
            });
        }

        if (variant.stock < qty) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: `Only ${variant.stock} items available in stock`
            });
        }

        // Get or create cart
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Check if item already in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.productVariantId.toString() === productVariantId
        );

        if (existingItemIndex > -1) {
            const existingItem = cart.items[existingItemIndex];
            const newQuantity = existingItem.quantity + qty;

            if (newQuantity > variant.stock) {
                return sendResponse(res, {
                    success: false,
                    statusCode: statusCodes.BAD_REQUEST,
                    message: `Only ${variant.stock} stock available`
                });
            }

            if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
                 return sendResponse(res, {
                     success: false,
                     statusCode: statusCodes.BAD_REQUEST,
                     message: `Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product. You already have ${existingItem.quantity} in cart.`
                 });
            }

            existingItem.quantity = newQuantity;
            existingItem.priceAtTime = variant.price;
            existingItem.discountedPriceAtTime = variant.discountedPrice || 0;
        } else {
            cart.items.push({
                productId,
                productVariantId,
                quantity: qty,
                priceAtTime: variant.price,
                discountedPriceAtTime: variant.discountedPrice || 0
            });
        }

        await cart.save();

        // Remove from wishlist
        const wishlist = await Wishlist.findOne({ userId });
        if (wishlist) {
            wishlist.items = wishlist.items.filter(
                item => item.productVariantId.toString() !== productVariantId
            );
            await wishlist.save();
        }

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: 'Item moved to cart successfully',
            data: {
                productName: product.name,
                variantDetails: {
                    color: variant.color,
                    size: variant.size
                },
                quantity: existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : qty,
                cartItemsCount: cart.items.length,
                wishlistItemsCount: wishlist ? wishlist.items.length : 0
            }
        });

    } catch (err) {
        console.error("Error in moveToCart:", err);
        next(err);
    }
};