import Cart from "../../models/cartSchema.js";
import Address from "../../models/addressSchema.js";
import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import ProductVariant from "../../models/productVariantSchema.js";
import Category from "../../models/categorySchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";

// Helper to set session messages
const setSessionError = (req, message) => {
    if (!req.session.messages) {
        req.session.messages = [];
    }
    req.session.messages.push({ type: 'error', text: message });
};

export const getCheckoutPage = async (req,res,next) =>{
    try {
        const userId = req.session.userId;

        let cart = await Cart.findOne({userId})
                .populate('items.productId','name coverImage isListed categoryId')
                .populate('items.productVariantId', 'color size stock images price discountedPrice isListed');

        if(!cart || cart.items.length === 0){
            setSessionError(req,'Your cart is empty');
            return res.redirect('/cart')
        }

        const categoryIds = cart.items.map(item => item.productId?.categoryId).filter(Boolean);
        const categories  = await Category.find({_id: {$in: categoryIds}}).lean()
            
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat._id.toString()] = cat;
        })

        let hasInvalidItems = false;
        const enrichedItems = [];

        for(const item of cart.items) {
            const product = item.productId;
            const variant = item.productVariantId;
            const category = item.productId?.categoryId ? categoryMap[product.categoryId.toString()] : null;

            const isProductBlocked = !product?.isListed;
            const isVariantBlocked = !variant?.isListed;
            const isCategoryBlocked = !category?.isListed;
            const isOutOfStock = (variant?.stock || 0) === 0;

            const isInvalid = isProductBlocked || isVariantBlocked || isCategoryBlocked || isOutOfStock ;
            if(isInvalid){
                hasInvalidItems = true;
            }

            enrichedItems.push({
                productId: product?._id,
                productVariantId: variant?._id,
                productName: product?.name || 'Unknown Product',
                productImage: product?.coverImage?.url || variant?.images?.[0].url || '/images/placeholder.jpg',
                color: variant?.color,
                size: variant?.size,
                quantity: item.quantity,
                priceAtTime: item.priceAtTime,
                discountedPriceAtTime: item.discountedPriceAtTime || 0,
                isInvalid
            });
        }

        if(hasInvalidItems){
            setSessionError(req,'Please remove invalid or out-of-stock items before checkout');
            return res.redirect('/cart');
        }

        const subtotal = enrichedItems.reduce((sum, item)=>{
            const price = item.discountedPriceAtTime > 0 ? item.discountedPriceAtTime : item.priceAtTime;
            return sum +(price * item.quantity);
        },0)

        const shippingCharge = subtotal >= 1000 ? 0 : 50; // free shipping over 1000
        const tax = subtotal * 0.18   // Calculate tax (18% GST included in price, just for display)
        const totalAmount = subtotal + shippingCharge + tax;

        const addresses = await Address.find({userId}).sort({isDefault: -1 , createdAt: -1}).lean();

        const messages = req.session.messages || [];
        delete req.session.messages;

        res.render('user/checkout',{
            Title: 'Checkout',
            cart:{
                items: enrichedItems,
                subtotal: subtotal,
                itemsCount: enrichedItems.length
            },
            addresses,
            shippingCharge,
            tax,
            totalAmount,
            messages,
            user: res.locals.user || null,
            pageCss: '/public/css/user/checkout.css',
            pageJs: '/public/js/user/checkout.js',
            is404: true
        });
    } catch (err) {
        console.error('Error in getchecckoutPage :',err);
        next(err)
    }
}



export const addAddress = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);
        if(!user){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:errorMessages.USER_NOT_FOUND});
        }

        const addressData = {
            userId,
            addressType: req.body.addressType,
            fullName: req.body.fullName.trim(),
            phone: req.body.phone.trim(),
            alternatePhone: req.body.alternatePhone?.trim() || '',
            addressLine1: req.body.addressLine1.trim(),
            addressLine2: req.body.addressLine2?.trim() || '',
            city: req.body.city.trim(),
            state: req.body.state,
            pincode: req.body.pincode.trim(),
            country: req.body.country || 'India',
            isDefault: req.body.isDefault || false
        };

        const addressCount = await Address.countDocuments({userId});
        if(addressCount === 0){
            addressData.isDefault = true
        };

        if(addressData.isDefault){
            await Address.updateMany(
                {userId, isDefault:true},
                {$set: {isDefault: false}}
            );
        }

        const newAddress = new Address(addressData);
        await newAddress.save();

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Address added successfully.'
        });
    } catch (err) {
        console.error("Error in addAddress:", err);
        if (err.code === 11000) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'This address already exists'
            });
        }
        next(err);
    }
}


export const continueToPayment = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {addressId} = req.body;

        if(!addressId){
            return sendResponse(res,{success:false,statusCode:statusCodes.BAD_REQUEST,message:'Please select a delivery address'});
        }

        const address = await Address.findOne({_id: addressId , userId});
        if(!address){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:'Selected address not found'});
        }

        req.session.selectedAddressId = addressId;

        return sendResponse(res,{
            success:true,
            statusCode: statusCodes.OK,
            message: 'Proceeding to payment'
        });
    } catch (err) {
        console.error("Error in continueToPayment :",err);
        next(err);
    }
};