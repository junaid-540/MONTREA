import Cart from "../../models/cartSchema.js";
import Address from "../../models/addressSchema.js";
import Order from "../../models/orderSchema.js";
import Product from "../../models/productSchema.js";
import ProductVariant from "../../models/productVariantSchema.js";
import Category from "../../models/categorySchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";


const setSessionError = (req, message) => {
    if (!req.session.messages) {
        req.session.messages = [];
    }
    req.session.messages.push({ type: 'error', text: message });
};

export const getPaymentPage = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const selectedAddressId = req.session.selectedAddressId;

        
        const cart = await Cart.findOne({userId})
        .populate('items.productId', 'name coverImage isListed categoryId')
        .populate('items.productVariantId', 'color size stock images price discountedPrice isListed');
        
        if(!cart || cart.items.length === 0){
            setSessionError(req,'Your cart is empty');
            return res.redirect('/cart');
        }
        
        if(!selectedAddressId){
            setSessionError(req,'Please select a delivery address');
            return res.redirect('/checkout');
        }
        const categoryIds = cart.items.map(item => item.productId?.categoryId).filter(Boolean);
        const categories  = await Category.find({_id: {$in: categoryIds}}).lean();

        const categoryMap = {};
        categories.forEach(cat =>{
            categoryMap[cat._id.toString()] = cat;
        })

        let hasInvalidItems = false;
        const enrichedItems = [];

        for (const item of cart.items) {
            const product = item.productId;
            const variant = item.productVariantId;
            const category = item.productId?.categoryId ? categoryMap[product.categoryId.toString()] : null;

            const isProductBlocked = !product?.isListed;
            const isVariantBlocked = !variant?.isListed;
            const isCategoryBlocked = !category?.isListed;
            const isOutOfStock = (variant?.stock || 0) === 0;
            const insufficientStock = (variant?.stock || 0) < item.quantity;

            const isInvalid = isProductBlocked || isVariantBlocked || isCategoryBlocked || isOutOfStock || insufficientStock;
            
            if (isInvalid) {
                hasInvalidItems = true;
            }

            enrichedItems.push({
                productId: product?._id,
                productVariantId: variant?._id,
                productName: product?.name || 'Unknown Product',
                productImage: product?.coverImage?.url || variant?.images?.[0]?.url || '/images/placeholder.jpg',
                color: variant?.color,
                size: variant?.size,
                quantity: item.quantity,
                priceAtTime: item.priceAtTime,
                discountedPriceAtTime: item.discountedPriceAtTime || 0,
                isInvalid
            });
        }

        if(hasInvalidItems){
            setSessionError(req,'Some items in your cart are invalid or out of stock. Please review your cart.');
            return res.redirect('/cart');
        }

        const subtotal = enrichedItems.reduce((sum, item)=>{
            const price = item.discountedPriceAtTime > 0 ? item.discountedPriceAtTime : item.priceAtTime;
            return sum + (price * item.quantity);
        },0);

        const shippingCharge = subtotal >= 1000 ? 0 : 50;
        const tax = subtotal * 0.18 / 1.18;
        const totalAmount = subtotal + shippingCharge + tax;

        const shippingAddress = await Address.findOne({_id: selectedAddressId, userId}).lean();
        if(!shippingAddress){
            setSessionError(req,'Selected address not found');
            return res.redirect('/checkout');
        }

        const messages = req.session.messages || [];
        delete req.session.messages;

        res.render('user/payment',{
            Title: 'payment',
            cart:{
                items: enrichedItems,
                itemsCount: enrichedItems.length
            },
            user: res.locals.user || null,
            shippingAddress,
            shippingCharge,
            subtotal,
            tax,
            totalAmount,
            messages,
            pageCss: '/public/css/user/payment.css',
            pageJs: '/public/js/user/payment.js',
            is404: true
        });
    } catch (err) {
        console.error("Error in getPaymentPage :",err),
        next(err)
    }
}


export const placeOrder = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {paymentMethod} = req.body;
        const selectedAddressId = req.session.selectedAddressId;

        if(!paymentMethod || paymentMethod !== 'COD'){
            return sendResponse(res,{success:false, statusCode: statusCodes.BAD_REQUEST, message: 'Invalid payment method. Only COD is available currently'});
        }

        if(!selectedAddressId){
            return sendResponse(res,{success: false , statusCode:statusCodes.BAD_REQUEST, message: 'No delivery address selected'});
        }

        const cart = await Cart.findOne({userId})
                    .populate('items.productId', 'name coverImage isListed categoryId')
                    .populate('items.productVariantId', 'color size stock images price discountedPrice isListed');

        if(!cart || cart.items.length === 0){
            return sendResponse(res,{success:false, statusCode:statusCodes.BAD_REQUEST, message: 'Your cart is empty'});
        }

        const categoryIds = cart.items.map(item => item.productId?.categoryId).filter(Boolean)
        const categories = await Category.find({_id: {$in: categoryIds}}).lean();

        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat._id.toString()] = cat;
        });

        const orderItems = [];
        let subtotal = 0;

        for (const item of cart.items) {
            const product = item.productId;
            const variant = item.productVariantId;
            const category = product?.categoryId ? categoryMap[product.categoryId.toString()] : null;

            // Validation checks
            if (!product?.isListed || !variant?.isListed || !category?.isListed) {
                return sendResponse(res, {
                    success: false,
                    statusCode: statusCodes.BAD_REQUEST,
                    message: `Product "${product?.name || 'Unknown'}" is no longer available`
                });
            }

            if (variant.stock < item.quantity) {
                return sendResponse(res, {
                    success: false,
                    statusCode: statusCodes.BAD_REQUEST,
                    message: `Insufficient stock for "${product.name}". Only ${variant.stock} available.`
                });
            }

            const priceAtPurchase = item.priceAtTime;
            const discountedPriceAtPurchase = item.discountedPriceAtTime || 0;
            const finalPrice = discountedPriceAtPurchase > 0 ? discountedPriceAtPurchase : priceAtPurchase;
            const itemTotal = finalPrice * item.quantity;

            orderItems.push({
                productId: product._id,
                productVariantId: variant._id,
                name: product.name,
                color: variant.color,
                size: variant.size,
                image: product.coverImage?.url || variant.images?.[0]?.url || '',
                quantity: item.quantity,
                priceAtPurchase,
                discountedPriceAtPurchase,
                itemTotal,
                itemStatus: 'Placed'
            });

            subtotal += itemTotal;
        }

        const address = await Address.findOne({ _id: selectedAddressId, userId }).lean();
        if (!address) {
            return sendResponse(res, {success: false,statusCode: statusCodes.NOT_FOUND,message: 'Selected address not found'});
        }

        const shippingCharge = subtotal >= 1000 ? 0 : 50;
        const tax = subtotal * 0.18 / 1.18;
        const totalAmount = subtotal + shippingCharge + tax;

        const newOrder = new Order({
            userId,
            items: orderItems,
            shippingAddress: {
                fullName: address.fullName,
                phone: address.phone,
                alternatePhone: address.alternatePhone || '',
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2 || '',
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                country: address.country || 'India',
                addressType: address.addressType
            },
            paymentMethod: 'COD',
            paymentStatus: 'Pending',
            orderStatus: 'Placed',
            subtotal,
            tax,
            shippingCharge,
            totalAmount,
            placedAt: new Date(),
            expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        await newOrder.save();

        // Reduce stock for each variant
        for (const item of orderItems) {
            await ProductVariant.findByIdAndUpdate(
                item.productVariantId,
                { $inc: { stock: -item.quantity } }
            );
        }

        await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [] } }
        );
        delete req.session.selectedAddressId;

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: 'Order placed successfully',
            data:{orderId : newOrder.orderId } 
        });

    } catch (err) {
        console.error("Error in placeOrder :",err);
        next(err)
    }
}


