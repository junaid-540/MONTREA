import User from "../models/userSchema.js";
import { creditWallet } from '../utils/walletHelper.js'


export const generateReferralCode = async () =>{
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    while(!isUnique && attempts < MAX_ATTEMPTS){
        const randomPart = Array.from({length:5}, () =>
            characters.charAt(Math.floor(Math.random() * characters.length))
        ).join('');

        code = `REF-${randomPart}`;

        const existingUser = await User.findOne({ referralCode: code});

        if(!existingUser){
            isUnique = true;
        }
        attempts++;
    }
    if(!isUnique){
        throw new Error('Failed to generate unique referral code');
    }
    return code;
}



export const validateReferralCode = async (code) =>{
    if(!code || typeof code !== 'string'){
        return null;
    }

    const normalizedCode = code.trim().toUpperCase();
    
    const referrer = await User.findOne({
        referralCode: normalizedCode,
        status: 'active',
        isVerified: true
    });

    return referrer;

}


export const processReferral = async (newUserId, referrerId) =>{
    try {
        const REFERRAL_REWARD_AMOUNT = 300;

        await User.findByIdAndUpdate(newUserId,{
            referredBy: referrerId
        });

        await User.findByIdAndUpdate(referrerId,{
            $inc:{
                referralCount: 1,
                referralEarnings: REFERRAL_REWARD_AMOUNT
            },
            $push: {
                referredUsers: {
                    userId: newUserId,
                    referredAt: new Date()
                }
            }
        });

        const newUser = await User.findById(newUserId).select('name email');
        const referredUser = await User.findById(referrerId).select('name');

        await creditWallet(
            referrerId,
            REFERRAL_REWARD_AMOUNT,
            `Referral Reward - ${newUser.name} (${newUser.email}) joined using your code`,
            null,
            null,
            {}
        );

        console.log(` Referral processed: ${newUser.email} referred by ${referrerUser.name}`);
        console.log(` Credited ₹${REFERRAL_REWARD_AMOUNT} to ${referrerUser.name}'s wallet`);

        return {
            success: true,
            amount: REFERRAL_REWARD_AMOUNT
        };
    } catch (error) {
        console.error("Error in processing referral :",error);
        throw error;
    }
}


export const getReferralStats = async (userId) => {
    try {
        const user = await User.findById(userId).populate('referredUsers.userId', 'name email createdAt').lean();

        if(!user){
            throw new Error('User not found');
        }

        return {
            referralCode: user.referralCode,
            totalReferrals: user.referralCount || 0,
            totalEarnings: user.referralEarnings || 0,
            referredUsers: user.referredUsers || []
        };
    } catch (error) {
        console.error('Error getting referral stats :',error);
        throw error;
    }
}