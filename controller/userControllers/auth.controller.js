import User from '../../models/userSchema.js'
import bcrypt from 'bcrypt'
import Otp from '../../models/otpSchema.js'
import { signupValidation, signinValidation } from '../../validations/userValidations.js'
import { sendEmail } from '../../utils/email.js'
import { generateSecureOTP } from '../../utils/otp.js'
import errorMessages from '../../utils/errorMessages.js'
import statusCodes from '../../utils/statusCodes.js'
import { sendResponse } from '../../utils/responseHandler.js'
import { generateReferralCode, validateReferralCode, processReferral } from '../../utils/referralHelper.js'


// function for the user to return to the old page when signin 
function isValidReturnUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('/') || url.startsWith('//')) return false;
    const blockedPaths = ['/admin', '/api'];
    if (blockedPaths.some(path => url.startsWith(path))) return false;
    return true;
}

export const getSignup = (req, res) => {
    res.render('user/signup')
}


export const postSignup = async (req, res, next) => {
    try {
        console.log(req.body)

        const { error } = signupValidation.validate(req.body, { abortEarly: false })
        if (error) {
            const message = error.details.map(e => e.message);
            console.log("User Validation Error", message)

            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: message.join(', ')
            })
        }

        const { name, email, phone, password, referralCode } = req.body
        
        let referrerUser = null;
        if (referralCode && referralCode.trim()) {
            referrerUser = await validateReferralCode(referralCode);
            
            if (!referrerUser) {
                return sendResponse(res, {
                    success: false,
                    statusCode: statusCodes.BAD_REQUEST,
                    message: "Unable to apply referral code. Please try again."
                })
            }

            // Prevent self-referral
            if (referrerUser.email === email) {
                return sendResponse(res, {
                    success: false,
                    statusCode: statusCodes.BAD_REQUEST,
                    message: 'You cannot use your own referral code.'
                })
            }
        }

        const existingUser = await User.findOne({ $or: [{email},{phone}] })

        if(existingUser && existingUser.isVerified && existingUser.phone === phone){
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.CONFLICT,
                message: 'Unable to complete signup. Please verify your details and try again.'
            })
        }

        if (existingUser && existingUser.isVerified) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.CONFLICT,
                message: errorMessages.EMAIL_ALREADY_REGISTERED
            })
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const newUserReferralCode = await generateReferralCode();

        if (existingUser && !existingUser.isVerified) {
            await User.updateOne(
                { email },
                {
                    $set: {
                        name,
                        phone,
                        password: hashPassword,
                        referralCode: newUserReferralCode,
                        unverifiedCreatedAt: Date.now()
                    }
                })

            console.log("Unverified user updated :", email);

        } else {
            await User.create({
                name,
                email,
                phone,
                password: hashPassword,
                referralCode: newUserReferralCode,
                unverifiedCreatedAt: Date.now(),
                isVerified: false
            })
        }

        if (referrerUser) {
            req.session.pendingReferrerId = referrerUser._id.toString();
            console.log(` Pending referral: ${referrerUser.referralCode} → ${email}`);
        }

        const otp = generateSecureOTP();
        console.log("OTP:", otp)

        await Otp.deleteMany({ email })

        try {
            await Otp.create({ email, otp })
        } catch (err) {
            console.log("Error Saving OTP :", err)
        }

        await sendEmail(email, 'Verify Your MONTRÉA Account', otp)

        req.session.signupEmail = email;

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.CREATED,
            message: "OTP sent successfully! Redirecting to verification...",
            data: { redirect: '/verify-otp' }
        })

    } catch (err) {
        console.error("Error in signup:", err);
        next(err)
    }
}


export const getVerifyOtp = async (req,res,next) =>{
    try {
        
        const email = req.session.signupEmail;
        if(!email){
            return res.redirect('/signup');
        }
        res.render('user/verify-otp',{
            email
        });
    } catch (err) {
        console.error('Error loading verify OTP page :',err);
        next(err)
    }
}


export const postVerifyOtp = async (req, res, next) => {

    try {
        const { otp } = req.body;
        const email = req.session.signupEmail;

        if (!email) {
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Session expired. Please sign up again.'
            });
        }

        if(!otp || !otp.trim()){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Please enter the OTP.'
            });
        }

        const OTP_EXPIRE_MS = 60 * 1000 ; // 1 minute

        const otpRecord = await Otp.findOne({ email });
        console.log("OTP Details :", otpRecord)


        if (!otpRecord) {
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.OTP_NOT_FOUND || 'OTP expired or not found. Please resend OTP.'
            });
        }

        const isExpired = Date.now() - otpRecord.createdAt.getTime() > OTP_EXPIRE_MS
        if(isExpired){
            await Otp.deleteOne({email})
            console.log('OTP time out')
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Invalid or expired OTP.'
            })
        }

        if (otpRecord.otp !== otp) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: errorMessages.OTP_INVALID || "Invalid OTP. Please try again."
            })
        }

        // await User.updateOne({email},{$set:{isVerified:true}});
        const verifiedUser = await User.findOneAndUpdate({ email }, { $set: { isVerified: true, unverifiedCreatedAt: null } }, { new: true })

        await Otp.deleteOne({ email })

        const pendingReferrerId = req.session.pendingReferrerId;
        if(pendingReferrerId){
            try {
                await processReferral(verifiedUser._id, pendingReferrerId);
                delete req.session.pendingReferrerId;
            } catch (referralError) {
                console.error('Error processing referral reward :',referralError)
            }
        }

        req.session.signupEmail = null;
        req.session.userId = verifiedUser._id;

        console.log("OTP verified and User Activated :", email);

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: `Welcome to MONTRÉA, ${verifiedUser.name}! Your email has been verified successfully 🎉`,
            data: { redirect: '/'}
        })

    } catch (err) {
        console.error("Error veifying OTP:", err)
        next(err)
    }
}


export const getResendOtp = async (req, res, next) => {
    try {
        const email = req.session.signupEmail;

        if (!email) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: "Session expired. Please sign up again."
            });
        }

        await Otp.deleteMany({ email })

        const newOtp = generateSecureOTP();
        console.log("New OTP :", newOtp)

        await Otp.create({ email, otp: newOtp });

        await sendEmail(email, "Your New MONTRÉA OTP", newOtp);

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: "New OTP sent successfully! Please check your email."
        })
    } catch (err) {
        console.error("Error resending OTP :", err)
        next(err)
    }
}


export const getSignin = (req, res) => {

    const resetPasswordSuccess = req.session.resetSuccessMessage || null;
    const successMessage = req.session.successMessage || null;
    req.session.resetSuccessMessage = null;
    req.session.successMessage = null;

    let error = null;
    if(req.query.error === 'blocked'){
        error = 'Your account has been blocked by the admin. Please contact support.';
    }

    let querySuccess = null;
    if (req.query.success === 'email_updated') {  // ← This condition might fail
        querySuccess = `Email updated successfully! Please log in with your new email: ${req.query.newEmail || 'the updated one'}`;
    }

    if (req.query.success === 'password_reset') {  // ← This condition might fail
        querySuccess = 'Password reset successfully! Please sign in with your new password.';
    }

    if(req.query.returnUrl){
        req.session.returnUrl = req.query.returnUrl;
    }


    res.render('user/signin', {
        resetPasswordSuccess,
        successMessage,
        querySuccess ,
        error,
        returnUrl: req.session.returnUrl || null
    });
};

export const postSignin = async (req, res, next) => {
    try {

        console.log(req.body);
        const { email, password } = req.body;
        const { error } = signinValidation.validate(req.body, { abortEarly: false })
        if (error) {
            const message = error.details.map(e => e.message).join(', ');
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: message
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.INVALID_CREDENTIALS
            });
        }

        if (user.status === 'blocked') {
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.FORBIDDEN,
                message: 'Your account has been blocked by the admin. Please contact support.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.UNAUTHORIZED,
                message: errorMessages.INVALID_CREDENTIALS
            });
        }

        if (!user.isVerified) {
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.FORBIDDEN,
                message: 'Please verify your email before signing in.'
            });
        }
        const returnUrl = req.session.returnUrl
        delete req.session.returnUrl
        req.session.userId = user._id;
        
        let redirectUrl = '/'

        if(returnUrl && isValidReturnUrl(returnUrl)){
            redirectUrl = returnUrl;
        }

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: `Welcome back ${user.name}! 🎉`,
            data: { redirect: redirectUrl }
        });
    } catch (err) {
        console.error('Signin Error :', err)
        next(err)
    }
}


export const oauthCallbackController = async (req, res) => {
    if (!req.user) {
        return res.redirect('/signin');
    }
    
    const returnUrl = req.session.returnUrl;
    delete req.session.returnUrl;
    req.session.userId = req.user._id;
    req.session.successMessage = `Welcome, ${req.user.name}! 🎉`;


    if (returnUrl && isValidReturnUrl(returnUrl)) {
        return res.redirect(returnUrl);
    }
        res.redirect("/")

}


export const userLogout = (req, res, next) => {
    try {
        req.session.successMessage = "You have logged out successfully!"

        const adminData = req.session.admin;

        // For Google OAuth users
        if (req.isAuthenticated && req.isAuthenticated()) {
            req.logout(err => {
                if (err) return next(err);
                
                if (adminData) {
                    req.session.admin = adminData;
                }
                
                // Clear only user data
                delete req.session.userId;
                delete req.session.signupEmail;
                delete req.session.forgotPasswordEmail;
                delete req.session.forgotPasswordOtpVerified;
                delete req.session.pendingReferrerId;
                delete req.session.returnUrl;
                
                // Force save session with admin data
                req.session.save(err => {
                    if (err) {
                        console.error("Session save error:", err);
                        return next(err);
                    }
                    
                    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
                    res.set('Pragma', 'no-cache');
                    res.set('Expires', '0');
                    
                    return res.redirect('/');
                });
            });
        } else {
            // For regular email/password users
            delete req.session.userId;
            delete req.session.signupEmail;
            delete req.session.forgotPasswordEmail;
            delete req.session.forgotPasswordOtpVerified;
            delete req.session.pendingReferrerId;
            delete req.session.returnUrl;
            
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            
            return res.redirect('/');
        }

    } catch (err) {
        console.error("User Logout Error:", err);
        next(err);
    }
};

export const loadForgetPassword = async (req, res, next) => {
    try {
        res.render('user/forgot-password', {
            Title: "Forgot Password",
            pageCss: "/public/css/user/forgot-password.css",
        })
    } catch (err) {
        console.error("Error loading forget password page:", err)
        next(err)
    }
}


export const postForgetPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.EMAIL_INVALID
            })
        }

        if (user.status === 'blocked') {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.FORBIDDEN,
                message: errorMessages.ACCOUNT_BLOCKED
            })
        }

        const otp = generateSecureOTP();
        await Otp.deleteMany({ email });
        await Otp.create({ email, otp });
        console.log("Generated OTP for password reset:", otp);
        await sendEmail(email, 'Reset Your MONTRÉA Password', otp);

        req.session.forgotPasswordEmail = email;
        console.log("Forgot Password Email saved in session:", email);

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: "OTP has been sent to your email address.",
            data: {
                redirect: '/verify-forgot-otp',
                otpSentAt: Date.now()
            }
        })

    } catch (err) {
        console.error("Error in postForgetPassword:", err);
        next(err)
    }
}


export const getVeriyForgotOtp = async (req, res, next) => {
    try {
        const email = req.session.forgotPasswordEmail
        if (!email) {
            return res.redirect('/forgot-password')
        }

        const isLoggedIn = !!req.session.userId;
        const pageType = isLoggedIn ? 'password-reset' : 'forgot';

        res.render('user/verify-forgot-otp', { pageType, email })
    } catch (err) {
        console.error("Error loading verify forgot OTP page:", err)
        next(err)
    }
}


export const postVerifyForgotOtp = async (req, res, next) => {
    try {
        const { confirmationCode } = req.body;
        const email = req.session.forgotPasswordEmail;

        console.log(" Email in session:", email);
        console.log(" Confirmation code received:", confirmationCode);

        if (!email) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: "Session expired. Please try again."
            })
        }

        if (!confirmationCode) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: "Please enter the confirmation code.",
            });
        }

        const OTP_EXPIRE_MS = 60 * 1000; // 1 minute

        const existingOtpRecord = await Otp.findOne({ email });
        console.log(" OTP Record for email:", existingOtpRecord);

        if (!existingOtpRecord) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: "OTP expired or not found. Please resend OTP."
            })
        }

        const isExpired = Date.now() - existingOtpRecord.createdAt.getTime() > OTP_EXPIRE_MS;
        if (isExpired) {
            await Otp.deleteOne({ email });
            console.log(' OTP expired and deleted');
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'OTP has expired. Please request a new one.'
            })
        }

        if (existingOtpRecord.otp !== confirmationCode) {
            console.log(` Wrong OTP entered. Expected: ${existingOtpRecord.otp}, Got: ${confirmationCode}`);
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: "Invalid OTP. Please check and try again."
            })
        }

        await Otp.deleteOne({ email });
        req.session.forgotPasswordOtpVerified = true;

        console.log(" OTP verified successfully for:", email);

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: "OTP verified successfully."
        })

    } catch (err) {
        console.error(" Error in postVerifyForgotOtp:", err)
        next(err)
    }
}


export const getResendForgotOtp = async (req, res, next) => {
    try {
        const email = req.session.forgotPasswordEmail
        console.log(" Email in session for resending OTP:", email);

        if (!email) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: "Session expired. Please try again.",
            });
        }

        await Otp.deleteMany({ email });
        const newOtp = generateSecureOTP();

        await Otp.create({ email, otp: newOtp });
        console.log("New OTP for forgot password:", newOtp);
        await sendEmail(email, "Your New MONTRÉA Password Reset OTP", newOtp);

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: "New OTP sent successfully.",
        });
    } catch (err) {
        console.error("Error in getResendForgotOtp:", err)
        next(err);
    }
}

export const LoadResetPassword = async (req, res, next) => {
    try {
        if (!req.session.forgotPasswordOtpVerified) {
            const redirectPath = req.session.userId ? '/change-password' : '/forgot-password';
            return res.redirect(redirectPath);
        }
        res.render('user/reset-password');
    } catch (error) {
        console.error("Error loading reset password page:", err);
        next(err);
    }
}

export const resetPassword = async (req, res, next) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        console.log("New Password Received:", newPassword);
        console.log("Confirm Password Received:", confirmPassword);

        const email = req.session.forgotPasswordEmail;
        const isLoggedIn = !!req.session.userId;

        if (!email) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: "Session expired. Please restart the forgot password process."
            });
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/;
        if (!passwordRegex.test(newPassword)) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: "Password must include letters and numbers only, min 6 characters."
            })
        }

        if (newPassword !== confirmPassword) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: errorMessages.CONFIRM_PASSWORD_MISMATCH
            })
        }

        if (isLoggedIn) {
            const user = await User.findOne({ email });
            const isSamePassword = await bcrypt.compare(newPassword, user.password);
            if (isSamePassword) {
                return sendResponse(res, {
                    success: false,
                    statusCode: statusCodes.BAD_REQUEST,
                    message: "New password must be different from the old password."
                });
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updateOne({ email }, { $set: { password: hashedPassword } });

        req.session.forgotPasswordEmail = null;
        req.session.forgotPasswordOtpVerified = null;

        if (isLoggedIn) {
            req.session.destroy((err) => {
                if (err) console.error("Session destroy error:", err);
            });

            return sendResponse(res, {
                success: true,
                statusCode: statusCodes.OK,
                message: "Password reset successfully! Please sign in with your new password.",
                data: { redirect: "/signin?success=password_reset" }
            });
        } else {
            req.session.resetSuccessMessage = "Your password has been reset successfully. Please sign in.";

            return sendResponse(res, {
                success: true,
                statusCode: statusCodes.OK,
                message: "Password reset successfully!",
                data: { redirect: "/signin" }
            });
        }

    } catch (err) {
        console.error("Error in resetPassword:", err);
        next(err);
    }
};