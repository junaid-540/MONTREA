import Wallet from "../../models/walletSchema.js";
import User from "../../models/userSchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import razorpay from "../../config/razorpayConfig.js";
import statusCodes from "../../utils/statusCodes.js";
import crypto from 'crypto'
import { getOrCreateWallet, creditWallet } from "../../utils/walletHelper.js";
import dotenv from 'dotenv'
import { stat } from "fs";
dotenv.config()


export const getWalletPage = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const wallet = await getOrCreateWallet(userId);
        const user = await User.findById(userId).select('name profileImage').lean();

            // sort transaction by newest
        const transactions = wallet.transactions
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0,50); // show last 50 transactions

        const messages = req.session.messages || [];
        delete req.session.messages;

        res.render('user/wallet',{
            Title: 'My Wallet',
            wallet: {
                balance: wallet.balance,
                transactions
            },
            user :{
                name: user.name,
                profileImage: user.profileImage || 'https://res.cloudinary.com/denu4amwx/image/upload/v1763464812/User_icon_ua556r.jpg'
            },
            messages,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            pageCss: '/public/css/user/wallet.css',
            pageJs: '/public/js/user/wallet.js',
            is404: true,
            activePage: 'wallet'
        })
        
    } catch (err) {
        console.error("Error in getWalletPage :",err);
        next(err)
    }
}

export const createWalletTopUpOrder = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {amount} = req.body;

        if(!amount || amount < 100){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Minimum top-up amount is ₹100'
            });
        }
        if(amount > 10000){
            return sendResponse(res,{
                success:false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Maximum top-up amount is ₹10,000'
            });
        }
        const options ={
            amount: Math.round(amount * 100),
            currency: 'INR',
           receipt: `WT_${userId.slice(-6)}_${Math.floor(Date.now() / 1000)}`,
            payment_capture: 1
        };

        let razorpayOrder;
        try {
            razorpayOrder = await razorpay.orders.create(options)
        } catch (razorpayError) {
            console.error('Razorpay API error :', razorpayError)
            if (razorpayError.code === 'ECONNREFUSED' || 
                razorpayError.code === 'ETIMEDOUT' || 
                razorpayError.code === 'ENOTFOUND') {
                return sendResponse(res, {
                    success: false,
                    statusCode: statusCodes.SERVICE_UNAVAILABLE,
                    message: 'Payment service temporarily unavailable. Please try again.'
                });
            }
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: razorpayError.error?.description || 'Failed to create payment order'
            });
        }

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Razorpay order created',
            data: {
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                keyId: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (err) {
        console.error("Error in createWalletTopUpOrder :",err)
        next(err)
    }
}


export const verifyWalletTopUp = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {razorpay_order_id, razorpay_payment_id, razorpay_signature, amount} = req.body;

        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if(razorpay_signature !== expectedSign){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Payment verification failed'
            });
        }
        const result = await creditWallet(
            userId,
            amount/100,
            'Wallet top-up via Razorpay',
            null,
            null,
            {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id
            }
        );

        const finalAmount = Math.round(amount / 100)

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: `₹${finalAmount} added to wallet successfully`,
            data:{
                newBalance: result.newBalance,
                transaction: result.transaction
            }
        });
    } catch (err) {
    console.error("Error in verifyWalletTopUp :",err);
    next(err)   
    }
};


export const getWalletBalance = async(req,res,next) =>{
    try {
        const userId = req.session.userId;
        const wallet = await getOrCreateWallet(userId);

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            data: {
                balance: wallet.balance
            }
        });
    } catch (err) {
        console.error("Error in getWalletBalance :",err);
        next(err)
    }
}


export const getTransactionHistory = async (req,res,next) =>{
    try {
        const userId = req.session.userId;
        const {limit = 50, skip = 0, type} = req.query;

        const wallet = await getOrCreateWallet(userId);

        let transactions = wallet.transactions;

        if(type && ['credit', 'debit'].includes(type)){
            transactions = transactions.filter(t => t.type === type);
        }

        transactions = transactions
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(parseInt(skip), parseInt(skip) + parseInt(limit));

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            data: {
                transactions,
                total: wallet.transactions.length
            }
        });
    } catch (err) {
        console.error("Error in getTransactionHistory :",err);
        next(err)
    }
}