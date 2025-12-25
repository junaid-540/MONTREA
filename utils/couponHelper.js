
import Coupon from "../models/couponSchema.js";


export const calculateDiscount = (coupon, cartSubtotal) => {
    let discount = 0;

    if (coupon.discountType === 'percentage') {
        // Calculate percentage discount
        discount = (cartSubtotal * coupon.discountValue) / 100;
        
        // Apply max cap if it exists
        if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
            discount = coupon.maxDiscountAmount;
        }
    } else if (coupon.discountType === 'fixed') {
        // Fixed amount discount
        discount = coupon.discountValue;
    }

    // Discount cannot exceed subtotal
    discount = Math.min(discount, cartSubtotal);

    return Math.round(discount * 100) / 100; // Round to 2 decimals
};


export const getUserUsageCount = (coupon, userId) => {
    const userUsage = coupon.usedBy.find(
        u => u.userId.toString() === userId.toString()
    );
    return userUsage ? userUsage.usageCount : 0;
};


export const validateCoupon = (coupon, cartSubtotal, userId) => {
    
    if (!coupon.isActive) {
        return { valid: false, message: 'This coupon is not active' };
    }

    // Date validation
    const now = new Date();
    if (now < coupon.startDate) {
        const startDateStr = coupon.startDate.toLocaleDateString('en-IN');
        return { 
            valid: false, 
            message: `This coupon will be available from ${startDateStr}` 
        };
    }
    if (now > coupon.endDate) {
        return { valid: false, message: 'This coupon has expired' };
    }

    // Global usage limit
    if (coupon.usageCount >= coupon.usageLimit) {
        return { 
            valid: false, 
            message: 'This coupon has reached its usage limit' 
        };
    }

   
    const userUsageCount = getUserUsageCount(coupon, userId);
    if (userUsageCount >= coupon.perUserLimit) {
        return { 
            valid: false, 
            message: `You have already used this coupon ${coupon.perUserLimit} time(s)` 
        };
    }

    // Minimum purchase requirement
    if (cartSubtotal < coupon.minPurchaseAmount) {
        const amountNeeded = coupon.minPurchaseAmount - cartSubtotal;
        return { 
            valid: false, 
            message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required. Add ₹${Math.round(amountNeeded)} more to your cart` 
        };
    }

    // All validations passed!
    const discount = calculateDiscount(coupon, cartSubtotal);
    
    return { 
        valid: true, 
        discount,
        message: `Coupon applied! You saved ₹${Math.round(discount)}` 
    };
};


export const getAvailableCoupons = async (userId, cartSubtotal = 0) => {
    try {
        const now = new Date();

        // Find all active, non-expired coupons
        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $expr: { $lt: ['$usageCount', '$usageLimit'] }
        }).lean();

        // Filter coupons user can still use
        const availableCoupons = [];

        for (const coupon of coupons) {
            const userUsageCount = getUserUsageCount(coupon, userId);
            
            // Skip if user has used it max times
            if (userUsageCount >= coupon.perUserLimit) {
                continue;
            }

            // Check if user can apply it now
            const canApply = cartSubtotal >= coupon.minPurchaseAmount;
            let estimatedDiscount = 0;

            if (canApply) {
                estimatedDiscount = calculateDiscount(coupon, cartSubtotal);
            }

            availableCoupons.push({
                _id: coupon._id,
                code: coupon.code,
                description: coupon.description,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                maxDiscountAmount: coupon.maxDiscountAmount,
                minPurchaseAmount: coupon.minPurchaseAmount,
                endDate: coupon.endDate,
                canApply,
                estimatedDiscount,
                amountNeeded: canApply ? 0 : (coupon.minPurchaseAmount - cartSubtotal),
                userUsesRemaining: coupon.perUserLimit - userUsageCount
            });
        }

        return availableCoupons;

    } catch (error) {
        console.error('Error getting available coupons:', error);
        return [];
    }
};


export const calculateCartTotals = (subtotal, couponDiscount = 0) => {
    const subtotalAfterDiscount = subtotal - couponDiscount;
    const shippingCharge = subtotalAfterDiscount >= 1000 ? 0 : 50;
    const taxableAmount = subtotalAfterDiscount + shippingCharge;
    const tax = taxableAmount * 0.18;
    const totalAmount = taxableAmount + tax;

    return {
        subtotal: Math.round(subtotal),
        couponDiscount: Math.round(couponDiscount),
        shippingCharge: Math.round(shippingCharge),
        tax: Math.round(tax),
        totalAmount: Math.round(totalAmount)
    };
};



export const formatCouponDisplay = (coupon) => {
    let discountText = '';
    
    if (coupon.discountType === 'percentage') {
        discountText = `${coupon.discountValue}% OFF`;
        if (coupon.maxDiscountAmount) {
            discountText += ` (Max ₹${coupon.maxDiscountAmount})`;
        }
    } else {
        discountText = `₹${coupon.discountValue} OFF`;
    }

    return {
        code: coupon.code,
        description: coupon.description,
        discountText,
        minPurchase: coupon.minPurchaseAmount,
        validUntil: coupon.endDate.toLocaleDateString('en-IN'),
        expiresIn: Math.ceil((coupon.endDate - new Date()) / (1000 * 60 * 60 * 24)) // Days remaining
    };
};

/**
 * Increment coupon usage after successful order
 */
export const incrementCouponUsage = async (couponId, userId, orderId) => {
    try {
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            throw new Error('Coupon not found');
        }

        // Increment global usage count
        coupon.usageCount += 1;

        // Find or create user usage record
        const userUsageIndex = coupon.usedBy.findIndex(
            u => u.userId.toString() === userId.toString()
        );

        if (userUsageIndex === -1) {
            // User hasn't used this coupon before
            coupon.usedBy.push({
                userId,
                usageCount: 1,
                lastUsedAt: new Date(),
                orders: [orderId]
            });
        } else {
            // User has used this coupon before
            coupon.usedBy[userUsageIndex].usageCount += 1;
            coupon.usedBy[userUsageIndex].lastUsedAt = new Date();
            coupon.usedBy[userUsageIndex].orders.push(orderId);
        }

        await coupon.save();
        return { success: true };

    } catch (error) {
        console.error('Error incrementing coupon usage:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Decrement coupon usage (for order cancellation/return)
 */
export const decrementCouponUsage = async (couponId, userId, orderId) => {
    try {
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            throw new Error('Coupon not found');
        }

        // Decrement global usage count
        if (coupon.usageCount > 0) {
            coupon.usageCount -= 1;
        }

        // Find user usage record
        const userUsageIndex = coupon.usedBy.findIndex(
            u => u.userId.toString() === userId.toString()
        );

        if (userUsageIndex !== -1) {
            // Decrement user's usage count
            if (coupon.usedBy[userUsageIndex].usageCount > 0) {
                coupon.usedBy[userUsageIndex].usageCount -= 1;
            }

            // Remove order from the orders array
            coupon.usedBy[userUsageIndex].orders = 
                coupon.usedBy[userUsageIndex].orders.filter(
                    o => o.toString() !== orderId.toString()
                );

            // If user has no more uses, remove them from usedBy array
            if (coupon.usedBy[userUsageIndex].usageCount === 0) {
                coupon.usedBy.splice(userUsageIndex, 1);
            }
        }

        await coupon.save();
        return { success: true };

    } catch (error) {
        console.error('Error decrementing coupon usage:', error);
        return { success: false, error: error.message };
    }
};