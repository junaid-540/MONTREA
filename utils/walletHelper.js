import Wallet from "../models/walletSchema.js";

/**
 * Get or create wallet for a user
 */

export const getOrCreateWallet = async (userId) =>{
    try {
        let wallet = await Wallet.findOne({userId});
        if(!wallet){
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: []
            });
            await wallet.save()
        }
        return wallet;
    } catch (error) {
        console.error('Error in getOrCreateWallet :',error)
        throw error;
    }
};


/**
 * Add money to wallet (Credit)
 * Without using mongoDB transaction
 */

export const creditWallet = async (userId, amount, description, orderId = null , orderIdDisplay = null, razorpayDetails = {}) =>{
    try {
        const wallet = await Wallet.findOne({userId});
        if(!wallet){
            throw new Error('Wallet not found');
        }

        const newBalance = wallet.balance + amount;
        const transaction = {
            type: 'credit',
            amount,
            description,
            orderId,
            orderIdDisplay,
            balanceAfter: newBalance,
            status: 'completed',
            razorpayOrderId: razorpayDetails.razorpayOrderId || null,
            razorpayPaymentId: razorpayDetails.razorpayPaymentId || null
        };

        wallet.balance = newBalance;
        wallet.transactions.push(transaction)
        await wallet.save()

        return {
            success : true,
            wallet,
            newBalance,
            transaction: wallet.transactions[wallet.transactions.length-1]
        }

    } catch (error) {
        console.error('Error in creditWallet :',error);
        throw error;
    }
}


/**
 * Deduct money from wallet (debit)
 * Without using mongoDB transaction
 */

export const debitWallet = async (userId, amount, description, orderId = null, orderIdDisplay = null) => {
    try {
        const wallet = await Wallet.findOne({ userId });
        
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        
        if (wallet.balance < amount) {
            throw new Error('Insufficient wallet balance');
        }
        
        const newBalance = wallet.balance - amount;
        
        const transaction = {
            type: 'debit',
            amount,
            description,
            orderId,
            orderIdDisplay,
            balanceAfter: newBalance,
            status: 'completed'
        };
        
        wallet.balance = newBalance;
        wallet.transactions.push(transaction);        
        await wallet.save();
        
        return { 
            success: true, 
            wallet, 
            newBalance,
            transaction: wallet.transactions[wallet.transactions.length - 1]
        };
    } catch (error) {
        console.error('Error in debitWallet:', error);
        throw error;
    }
};

/**
 * Check if user has sufficient balance
 */
export const checkWalletBalance = async (userId, requiredAmount) => {
    try {
        const wallet = await Wallet.findOne({ userId });
        
        if (!wallet) {
            return { sufficient: false, balance: 0 };
        }
        
        return {
            sufficient: wallet.balance >= requiredAmount,
            balance: wallet.balance
        };
    } catch (error) {
        console.error('Error in checkWalletBalance:', error);
        throw error;
    }
};


/**
 * Get wallet balance
 */
export const getWalletBalance = async (userId) => {
    try {
        const wallet = await Wallet.findOne({ userId });
        return wallet ? wallet.balance : 0;
    } catch (error) {
        console.error('Error in getWalletBalance:', error);
        throw error;
    }
};



export const calculateRefundAmount = (order) => {
    // No refund for COD orders
    if (order.paymentMethod === 'COD') {
        return 0;
    }
    
    // Only refund if payment was successful
    if ((order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Wallet') && order.paymentStatus === 'Paid') {
        // Calculate total of cancelled items
        if (order.paymentMethod === 'COD') return 0;

        if (order.paymentStatus !== 'Paid') return 0;
        
        return Math.round(order.totalAmount);
    }
    
    return 0;
};



export const calculateItemRefundAmount = (item, order) => {

     if (order.paymentMethod === 'COD') return 0;
    
    if(order.paymentStatus !== 'Paid') return 0;

    const itemShare = item.itemTotal / order.subtotal;
    
    let refundAmount = item.itemTotal;

    if(order.couponApplied && order.discountAmount > 0 && order.subtotal > 0){
        const itemDiscountShare = order.discountAmount * itemShare;
        refundAmount = item.itemTotal - itemDiscountShare;
    }

    const shippingCharge = order.shippingCharge * itemShare;

    const taxShare = order.tax * itemShare;

    const totalRefund = refundAmount + shippingCharge + taxShare;
    
    return Math.max(0, Math.round(totalRefund));
};


export const calculateItemReturnAmount = (item, order) => {
    // For COD: Only refund if order was delivered (customer paid cash)
    if (order.paymentMethod === 'COD') {
        if (item.itemStatus !== 'Delivered' && item.itemStatus !== 'Returned') {
            return 0; 
        }
        
        const itemShare = item.itemTotal / order.subtotal;

        let refundAmount = item.itemTotal;
        
        if (order.couponApplied && order.discountAmount > 0 && order.subtotal > 0) {
            const itemDiscountShare = order.discountAmount * itemShare;
            refundAmount = item.itemTotal - itemDiscountShare;
        }
        
        const taxShare = order.tax * itemShare;

        const totalRefund = refundAmount + taxShare;

        return Math.max(0, Math.round(totalRefund))

    }
    
    // For Online payments: Only refund if payment was successful
    if ((order.paymentMethod === 'Razorpay' || order.paymentMethod === 'Wallet') && order.paymentStatus === 'Paid') {
        
        const itemShare = item.itemTotal / order.subtotal;

        let refundAmount = item.itemTotal;
        
        // If coupon was applied, calculate proportional discount
        if (order.couponApplied && order.discountAmount > 0 && order.subtotal > 0) {
            
            const itemDiscountShare = order.discountAmount * itemShare;

            refundAmount = item.itemTotal - itemDiscountShare;
        }
        
        const taxShare = order.tax * itemShare;

        const totalRefund = refundAmount + taxShare;

        // Ensure refund is not negative
        return Math.max(0, Math.round(totalRefund));
    }
    
    return 0;
};