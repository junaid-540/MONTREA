export const calculateMetrics = (orders) => {
    let totalSales = 0; 
    let totalSubtotal = 0; 
    let totalProductDiscount = 0; 
    let totalCouponDiscount = 0; 
    let totalOrders = orders.length;
    let totalItemsSold = 0;
    let totalShipping = 0;
    let totalTax = 0;
    let totalReturns = 0; 
    let totalReturnAmount = 0; 
    let totalCancellations = 0; 
    let totalCancellationAmount = 0; 
    
    // Order status breakdown
    const statusBreakdown = {
        Placed: 0,
        Processing: 0,
        Shipped: 0,
        'Out for Delivery': 0,
        Delivered: 0,
        Cancelled: 0,
        'Partially Cancelled': 0,
        'Partially Delivered': 0
    };

    // Payment method breakdown
    const paymentBreakdown = {
        COD: { count: 0, amount: 0 },
        Wallet: { count: 0, amount: 0 },
        Razorpay: { count: 0, amount: 0 }
    };

    orders.forEach(order => {
        // Count order status
        if (statusBreakdown[order.orderStatus] !== undefined) {
            statusBreakdown[order.orderStatus]++;
        }

        // Separate items by status
        const validItems = order.items.filter(item => 
            item.itemStatus !== 'Cancelled' && item.itemStatus !== 'Returned'
        );
        const cancelledItems = order.items.filter(item => item.itemStatus === 'Cancelled');
        const returnedItems = order.items.filter(item => item.itemStatus === 'Returned');
        
        // Count items sold (only valid items)
        totalItemsSold += validItems.reduce((sum, item) => sum + item.quantity, 0);

        // Calculate cancelled items
        totalCancellations += cancelledItems.reduce((sum, item) => sum + item.quantity, 0);
        const cancelledItemsTotal = cancelledItems.reduce((sum, item) => sum + item.itemTotal, 0);
        
        // Calculate returned items
        totalReturns += returnedItems.reduce((sum, item) => sum + item.quantity, 0);
        const returnedItemsTotal = returnedItems.reduce((sum, item) => sum + item.itemTotal, 0);

        // Calculate actual subtotal (excluding cancelled AND returned items)
        const actualSubtotal = order.subtotal - cancelledItemsTotal - returnedItemsTotal;

        // Calculate product-level discount from valid items only
        validItems.forEach(item => {
            const itemProductDiscount = (item.priceAtPurchase - item.discountedPriceAtPurchase) * item.quantity;
            totalProductDiscount += itemProductDiscount;
        });

        // Calculate refund amounts for cancelled items
        if (cancelledItems.length > 0) {
            cancelledItems.forEach(item => {
                const itemShare = item.itemTotal / order.subtotal;
                let refundAmount = item.itemTotal;
                
                if (order.couponApplied && order.discountAmount > 0) {
                    const itemDiscountShare = order.discountAmount * itemShare;
                    refundAmount -= itemDiscountShare;
                }
                
                const taxShare = (order.tax || 0) * itemShare;
                refundAmount += taxShare;
                
                const shippingShare = (order.shippingCharge || 0) * itemShare;
                refundAmount += shippingShare;
                
                totalCancellationAmount += Math.max(0, refundAmount);
            });
        }

        // Calculate refund amounts for returned items
        if (returnedItems.length > 0) {
            returnedItems.forEach(item => {
                const itemShare = item.itemTotal / order.subtotal;
                let refundAmount = item.itemTotal;
                
                if (order.couponApplied && order.discountAmount > 0) {
                    const itemDiscountShare = order.discountAmount * itemShare;
                    refundAmount -= itemDiscountShare;
                }
                
                const taxShare = (order.tax || 0) * itemShare;
                refundAmount += taxShare;
                                
                totalReturnAmount += Math.max(0, refundAmount);
            });
        }

        //  Only process if there are valid (non-cancelled, non-returned) items
        if (validItems.length > 0) {
            // Calculate proportional coupon discount for valid items
            let actualCouponDiscount = 0;
            if (order.couponApplied && order.discountAmount > 0) {
                const validItemsRatio = actualSubtotal / order.subtotal;
                actualCouponDiscount = Math.round(order.discountAmount * validItemsRatio);
            }

            // Calculate shipping (free if subtotal after coupon >= 1000)
            const subtotalAfterCoupon = actualSubtotal - actualCouponDiscount;
            const actualShipping = subtotalAfterCoupon >= 1000 ? 0 : 50;

            // Calculate tax on the subtotal after coupon discount
            const actualTax = Math.round(subtotalAfterCoupon * 0.18);

            // Calculate final order total
            const actualOrderTotal = subtotalAfterCoupon + actualShipping + actualTax;

            // Accumulate totals
            totalSales += actualOrderTotal;
            totalSubtotal += actualSubtotal;
            totalCouponDiscount += actualCouponDiscount;
            totalTax += actualTax;
            totalShipping += actualShipping;

            // Payment method breakdown (only count orders with valid items)
            const paymentMethod = order.paymentMethod;
            if (paymentBreakdown[paymentMethod]) {
                paymentBreakdown[paymentMethod].count++;
                paymentBreakdown[paymentMethod].amount += actualOrderTotal;
            }
        }
        // If all items are cancelled/returned, we don't add anything to revenue
        // This prevents negative revenue showing in the report
    });

    return {
        totalSales: Math.round(totalSales),
        totalSubtotal: Math.round(totalSubtotal), 
        totalDiscount: Math.round(totalProductDiscount), 
        totalCouponDiscount: Math.round(totalCouponDiscount), 
        totalOrders,
        totalItemsSold,
        totalShipping: Math.round(totalShipping),
        totalTax: Math.round(totalTax),
        totalReturns, 
        totalReturnAmount: Math.round(totalReturnAmount), 
        totalCancellations, 
        totalCancellationAmount: Math.round(totalCancellationAmount), 
        totalRefunds: Math.round(totalReturnAmount + totalCancellationAmount), 
        paymentBreakdown,
        statusBreakdown 
    };
};