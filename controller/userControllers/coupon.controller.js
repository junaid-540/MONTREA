import Coupon from "../../models/couponSchema.js";
import Cart from "../../models/cartSchema.js";
import statusCodes from "../../utils/statusCodes.js";
import { sendResponse } from "../../utils/responseHandler.js";
import { validateCoupon, calculateDiscount, getAvailableCoupons, calculateCartTotals, formatCouponDisplay } from "../../utils/couponHelper.js";


export const getAvailableCouponsForUser = async(req,res,next) =>{
    try {
        const userId = req.session.userId;

        const cart = await Cart.findOne({userId})
                .populate('items.productId', 'name')
                .populate('items.productVariantId', 'price discountedPrice')

        let cartSubtotal = 0;
        if(cart && cart.items.length > 0){
            cartSubtotal = cart.items.reduce((sum, item)=>{
                const price = item.discountedPriceAtTime > 0
                            ? item.discountedPriceAtTime
                            : item.priceAtTime
                return sum + (price * item.quantity)
            },0);
        }

        const coupons = await getAvailableCoupons(userId, cartSubtotal);

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Available coupons fetched',
            data:{
                coupons,
                cartSubtotal
            }
        });
    } catch (err) {
        console.error("Error in getAvaialableCouponsForUser :",err);
        next(err)
    }
}


export const applyCouponToCart = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {couponCode} = req.body;

        if(!couponCode || !couponCode.trim()){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Please enter a coupon code'
            });
        }

        const cart = await Cart.findOne({userId})
                .populate('items.productId', 'name')
                .populate('items.productVariantId', 'price discountedPrice');

        if(!cart || cart.items.length === 0){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Your cart is empty'
            });
        }

        const subtotal = cart.items.reduce((sum, item)=>{
            const price = item.discountedPriceAtTime > 0
                        ? item.discountedPriceAtTime : item.priceAtTime
            return sum + (price * item.quantity)
        },0);

        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase().trim()
        });

        if(!coupon){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Invalid coupon code'
            });
        }

        const validation = validateCoupon(coupon, subtotal, userId);
        if(!validation.valid){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: validation.message
            });
        }

        req.session.appliedCoupon = {
            couponId: coupon._id.toString(),
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: validation.discount,
            appliedAt: new Date()
        };

        const updatedTotals = calculateCartTotals(subtotal, validation.discount);

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: validation.message,
            data:{
                coupon: {
                    code: coupon.code,
                    discountAmount: validation.discount
                },
                ...updatedTotals
            }
        });
    } catch (err) {
        console.error("Error in applyCouponToCart :",err);
        next(err)
    }
}


export const removeCoupon = async (req,res,next) =>{
    try {
        const userId = req.session.userId;

        if(!req.session.appliedCoupon){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'No coupon applied'
            });
        }

        const cart = await Cart.findOne({userId})
                    .populate('items.productId', 'name')
                    .populate('items.productVariantId', 'price discountedPrice');

        if(!cart || cart.items.length === 0){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Your cart is empty'
            });
        }          
               
        const subtotal = cart.items.reduce((sum, item)=>{
            const price = item.discountedPriceAtTime > 0
                        ? item.discountedPriceAtTime : item.priceAtTime
            return sum + (price * item.quantity)
        },0);

        delete req.session.appliedCoupon;
        const updatedTotals = calculateCartTotals(subtotal, 0);

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Coupon removed successfully',
            data: updatedTotals
        });
    } catch (err) {
        console.error("Error in removeCoupon :",err);
        next(err)
    }
}


export const validateCouponBeforePayment = async (req,res,next) => {
    try {
        const userId = req.session.userId;
        if(!req.session.appliedCoupon){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.OK,
                data: {valid: true, hasCoupon: false}
            });
        }

        const appliedCoupon = req.session.appliedCoupon;

        const cart = await Cart.findOne({userId})
                    .populate('items.productId', 'name')
                    .populate('items.productVariantId', 'price discountedPrice');

        if(!cart || cart.items.length === 0){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Your cart is empty'
            });
        }

        const subtotal = cart.items.reduce((sum, item)=>{
            const price = item.discountedPriceAtTime > 0 
                        ? item.discountedPriceAtTime : item.priceAtTime
            return sum + (price * item.quantity)
        },0);

        const coupon = await Coupon.findById(appliedCoupon.couponId);
        if(!coupon){
            delete req.session.appliedCoupon;
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Applied coupon is no longer valid'
            });
        }

        const validation = validateCoupon(coupon, subtotal, userId)
        if(!validation.valid){
            delete req.session.appliedCoupon;
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: `Coupon is no longer valid: ${validation.message}`
            });
        }

        req.session.appliedCoupon.discountAmount = validation.discount

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            data: {
                valid: true,
                hasCoupon: true,
                discount: validation.discount
            }
        });
    } catch (err) {
        console.error('Error in validateCouponBeforePayment :',err);
        next(err)
    }
}