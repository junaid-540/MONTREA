import Cart from "../../models/cartSchema.js";
import Address from "../../models/addressSchema.js";
import Order from "../../models/orderSchema.js";
import Product from "../../models/productSchema.js";
import ProductVariant from "../../models/productVariantSchema.js";
import Category from "../../models/categorySchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";
import razorpay from '../../config/razorpayConfig.js'
import dotenv from "dotenv";
import crypto from 'crypto'
dotenv.config()


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
        const tax = subtotal * 0.18 ;
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
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            pageCss: '/public/css/user/payment.css',
            pageJs: '/public/js/user/payment.js',
            is404: true
        });
    } catch (err) {
        console.error("Error in getPaymentPage :",err);
        next(err)
    }
}


export const placeOrder = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {paymentMethod} = req.body;
        const selectedAddressId = req.session.selectedAddressId;

        if(!paymentMethod || !['COD', 'Razorpay'].includes(paymentMethod)){
            return sendResponse(res,{success:false, statusCode: statusCodes.BAD_REQUEST, message: 'Invalid payment method'});
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
        const tax = subtotal * 0.18;
        const totalAmount = subtotal + shippingCharge + tax;

        // FOR COD - complete the order immediately
        if(paymentMethod === 'COD'){
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
                paymentMethod: paymentMethod,
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
        }

        // FOR RAZORPAY - Do NOT create order in DB yet
        if(paymentMethod === 'Razorpay'){
            // Create a temporary order reference
            const tempOrderId = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            req.session.tempOrderData = {
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
                paymentMethod: 'Razorpay',
                subtotal,
                tax,
                shippingCharge,
                totalAmount,
                tempOrderId,
                createdAt: Date.now() // Add timestamp for cleanup
            };

            return sendResponse(res, {
                success: true,
                statusCode: statusCodes.OK,
                message: 'Proceed to payment',
                data: {
                    tempOrderId,
                    amount: totalAmount,
                    needsPayment: true
                }
            });
        }        
    } catch (err) {
        console.error("Error in placeOrder :",err);
        next(err)
    }
}


export const createRazorpayOrder = async (req,res,next) =>{
    try {
        const { tempOrderId, amount } = req.body; 
        
        if(!tempOrderId || !amount){
            return sendResponse(res,{success:false,statusCode:statusCodes.BAD_REQUEST,message:'Order ID and amount are required'});
        }

        const tempOrderData = req.session.tempOrderData;
        
        if (!tempOrderData || tempOrderData.tempOrderId !== tempOrderId) {
            return sendResponse(res, { 
                success: false, 
                statusCode: statusCodes.BAD_REQUEST, 
                message: 'Invalid order data or session expired' 
            });
        }

        // Clean up expired temp data older than 30 minutes
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        if (tempOrderData.createdAt && tempOrderData.createdAt < thirtyMinutesAgo) {
            delete req.session.tempOrderData;
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Order session expired. Please start over.'
            });
        }

        const options = {
            amount : Math.round(amount * 100),
            currency: 'INR',
            receipt: tempOrderId,
            payment_capture: 1
        };
        
        let razorpayOrder;
        try {
            razorpayOrder = await razorpay.orders.create(options);
        } catch (razorpayError) {
            console.error('Razorpay API error:', razorpayError);
            
            delete req.session.tempOrderData;
            
            // Check if it's a network error
            if (razorpayError.code === 'ECONNREFUSED' || 
                razorpayError.code === 'ETIMEDOUT' || 
                razorpayError.code === 'ENOTFOUND') {
                return sendResponse(res, {
                    success: false,
                    statusCode: statusCodes.SERVICE_UNAVAILABLE,
                    message: 'Payment service temporarily unavailable. Please check your connection and try again.'
                });
            }
            
            // Other Razorpay errors
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: razorpayError.error?.description || 'Failed to create payment order'
            });
        }

        // NOW create the actual order in database only after Razorpay success
        const newOrder = new Order({
            userId: tempOrderData.userId,
            items: tempOrderData.items,
            shippingAddress: tempOrderData.shippingAddress,
            paymentMethod: 'Razorpay',
            paymentStatus: 'Pending',
            razorpayOrderId: razorpayOrder.id,
            orderStatus: 'Pending',
            subtotal: tempOrderData.subtotal,
            tax: tempOrderData.tax,
            shippingCharge: tempOrderData.shippingCharge,
            totalAmount: tempOrderData.totalAmount,
            placedAt: new Date(),
            expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        await newOrder.save();

        // Clear temp data from session
        delete req.session.tempOrderData;

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Razorpay order created',
            data:{
                razorpayOrderId: razorpayOrder.id,
                orderId: newOrder.orderId, 
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                keyId: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (err) {
        console.error('Error in createRazorpayOrder :',err);
        delete req.session.tempOrderData;
        next(err)
    }
}


export const verifyRazorpayPayment = async (req,res,next) =>{
    try {
        
        const {orderId , razorpay_order_id , razorpay_payment_id , razorpay_signature} = req.body

        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const exptectedSign = crypto
                            .createHmac('sha256' , process.env.RAZORPAY_KEY_SECRET)
                            .update(sign.toString())
                            .digest('hex');

        if(razorpay_signature !== exptectedSign){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Payment verification failed'
            });
        }

        const userId = req.session.userId;
        const order = await Order.findOne({orderId: orderId , userId});
        if(!order){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Order not found'
            });
        }

        for (const item of order.items){
            const variant = await ProductVariant.findById(item.productVariantId);
            if(!variant || variant.stock < item.quantity){
                return sendResponse(res,{
                    success: false,
                    statusCode: statusCodes.BAD_REQUEST,
                    message: `Insufficient stock for ${item.name}. Please update your order.`
                });
            }
        }

        order.paymentStatus = 'Paid';
        order.paymentMethod = 'Razorpay';
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = razorpay_signature;
        order.orderStatus = 'Placed';
        await order.save()

        // Reduce stock
        for (const item of order.items){
            await ProductVariant.findByIdAndUpdate(
                item.productVariantId,
                {$inc: {stock: -item.quantity}}
            );
        }

        // Clear cart
        await Cart.findOneAndUpdate(
            {userId},
            {$set:{items: []}}
        );

        delete req.session.selectedAddressId;
        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Payment verified successfully',
            data:{orderId: order.orderId}
        });
    } catch (err) {
        console.error('Error in verifyRazorpayPayment :',err);
        next(err)
    }
}


export const handlePaymentFailure = async (req,res,next) =>{
    try {
        
        const {orderId , reason} = req.body;
        const userId = req.session.userId;

        const order = await Order.findOne({orderId: orderId , userId});
        if(!order){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.ORDER_NOT_FOUND
            });
        }

        order.paymentStatus = 'Failed';
        order.orderStatus = 'Pending';
        await order.save()

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Payment failure recorded',
            data:{orderId : order.orderId}
        });
    } catch (err) {
        console.error("Error in handlePaymentFailure :",err);
        next(err)
    }
}

