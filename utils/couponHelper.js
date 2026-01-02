import Coupon from "../models/couponSchema.js";

// Configuration constants for business rules
const COUPON_CONFIG = {
    MAX_PERCENTAGE_DISCOUNT: 70, // Maximum percentage discount allowed (70% max)
    MAX_DISCOUNT_TO_SUBTOTAL_RATIO: 0.80 // Discount can't exceed 80% of subtotal
};

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

    //  Discount cannot exceed 80% of subtotal (user must pay at least 20%)
    const maxAllowedDiscount = cartSubtotal * COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO;
    discount = Math.min(discount, maxAllowedDiscount);
    
    // Discount cannot exceed subtotal
    discount = Math.min(discount, cartSubtotal);

    return Math.round(discount * 100) / 100; 
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

        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $expr: { $lt: ['$usageCount', '$usageLimit'] }
        }).lean();

        const availableCoupons = [];

        for (const coupon of coupons) {
            const userUsageCount = getUserUsageCount(coupon, userId);
            
            if (userUsageCount >= coupon.perUserLimit) {
                continue;
            }

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
    const shippingCharge = subtotal >= 1000 ? 0 : 50;
    const tax = subtotalAfterDiscount * 0.18;
    const totalAmount = subtotalAfterDiscount + tax + shippingCharge;

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
        expiresIn: Math.ceil((coupon.endDate - new Date()) / (1000 * 60 * 60 * 24))
    };
};

/**
 * This prevents creation of invalid coupons
 */
export const validateCouponCreation = (couponData) => {
    const errors = [];

    // 1. Percentage discount cannot exceed max limit
    if (couponData.discountType === 'percentage') {
        if (couponData.discountValue > COUPON_CONFIG.MAX_PERCENTAGE_DISCOUNT) {
            errors.push(`Percentage discount cannot exceed ${COUPON_CONFIG.MAX_PERCENTAGE_DISCOUNT}%`);
        }

        // 2. If maxDiscount exists, it should be less than minPurchase
        if (couponData.maxDiscountAmount && couponData.minPurchaseAmount) {
            // Max discount should be reasonable compared to min purchase
            const maxDiscountRatio = couponData.maxDiscountAmount / couponData.minPurchaseAmount;
            if (maxDiscountRatio >= COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO) {
                errors.push(
                    `Maximum discount (₹${couponData.maxDiscountAmount}) is too high compared to minimum purchase (₹${couponData.minPurchaseAmount}). ` +
                    `It should not exceed ${COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO * 100}% of minimum purchase.`
                );
            }
        }
    }

    // 3. For fixed discount, it should be less than minPurchase
    if (couponData.discountType === 'fixed') {
        if (couponData.minPurchaseAmount && couponData.discountValue >= couponData.minPurchaseAmount) {
            errors.push(
                `Fixed discount (₹${couponData.discountValue}) cannot be equal to or greater than minimum purchase (₹${couponData.minPurchaseAmount})`
            );
        }

        // Fixed discount shouldn't be too close to min purchase
        if (couponData.minPurchaseAmount) {
            const discountRatio = couponData.discountValue / couponData.minPurchaseAmount;
            if (discountRatio >= COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO) {
                errors.push(
                    `Fixed discount should not exceed ${COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO * 100}% of minimum purchase amount`
                );
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

export const incrementCouponUsage = async (couponId, userId, orderId) => {
    try {
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            throw new Error('Coupon not found');
        }

        coupon.usageCount += 1;

        const userUsageIndex = coupon.usedBy.findIndex(
            u => u.userId.toString() === userId.toString()
        );

        if (userUsageIndex === -1) {
            coupon.usedBy.push({
                userId,
                usageCount: 1,
                lastUsedAt: new Date(),
                orders: [orderId]
            });
        } else {
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

export const decrementCouponUsage = async (couponId, userId, orderId) => {
    try {
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            throw new Error('Coupon not found');
        }

        if (coupon.usageCount > 0) {
            coupon.usageCount -= 1;
        }

        const userUsageIndex = coupon.usedBy.findIndex(
            u => u.userId.toString() === userId.toString()
        );

        if (userUsageIndex !== -1) {
            if (coupon.usedBy[userUsageIndex].usageCount > 0) {
                coupon.usedBy[userUsageIndex].usageCount -= 1;
            }

            coupon.usedBy[userUsageIndex].orders = 
                coupon.usedBy[userUsageIndex].orders.filter(
                    o => o.toString() !== orderId.toString()
                );

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