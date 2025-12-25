export const calculateMetrics = (orders) => {
    let totalSales = 0; 
    let totalSubtotal = 0; 
    let totalProductDiscount = 0; 
    let totalCouponDiscount = 0; 
    let totalOrders = orders.length;
    let totalItemsSold = 0;
    let totalShipping = 0;
    let totalTax = 0;
    
    // Payment method breakdown
    const paymentBreakdown = {
        COD: { count: 0, amount: 0 },
        Wallet: { count: 0, amount: 0 },
        Razorpay: { count: 0, amount: 0 }
    };

    orders.forEach(order => {
        // Count only non-cancelled items
        const validItems = order.items.filter(item => item.itemStatus !== 'Cancelled');
        totalItemsSold += validItems.reduce((sum, item) => sum + item.quantity, 0);

        // Calculate cancelled items total to adjust revenue
        const cancelledItemsTotal = order.items
            .filter(item => item.itemStatus === 'Cancelled')
            .reduce((sum, item) => sum + item.itemTotal, 0);

        // If items are cancelled, we need to recalculate tax and shipping for the actual order
        let actualOrderTotal;
        let actualTax;
        let actualShipping;
        
        if (cancelledItemsTotal > 0) {
            // Recalculate for non-cancelled items
            const actualSubtotal = order.subtotal - cancelledItemsTotal;
            const subtotalAfterCoupon = actualSubtotal - (order.discountAmount || 0);
            actualShipping = subtotalAfterCoupon >= 1000 ? 0 : 50;
            const taxableAmount = subtotalAfterCoupon + actualShipping;
            actualTax = Math.round(taxableAmount * 0.18);
            actualOrderTotal = taxableAmount + actualTax;
        } else {
            // No cancellations, use original values
            actualOrderTotal = order.totalAmount;
            actualTax = order.tax || 0;
            actualShipping = order.shippingCharge || 0;
        }

        // Accumulate totals
        totalSales += actualOrderTotal;
        totalSubtotal += (order.subtotal - cancelledItemsTotal);
        totalProductDiscount += order.discount || 0;
        totalCouponDiscount += order.discountAmount || 0;
        totalTax += actualTax;
        totalShipping += actualShipping;
        
        // Payment method breakdown
        const paymentMethod = order.paymentMethod;
        if (paymentBreakdown[paymentMethod]) {
            paymentBreakdown[paymentMethod].count++;
            paymentBreakdown[paymentMethod].amount += actualOrderTotal;
        }
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
        paymentBreakdown
    };
};