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
        //data from signup//
        console.log(req.body)

        const { error } = signupValidation.validate(req.body, { abortEarly: false })
        if (error) {
            const message = error.details.map(e => e.message);

            console.log("User Validation Error", message)

            return res.status(statusCodes.BAD_REQUEST).render('user/signup', {
                errorMessage: message.join(', ') // it will combine multiple messages
            })
        }

        const { name, email, phone, password, referralCode } = req.body
        
        let referrerUser = null;
        if (referralCode && referralCode.trim()) {
            referrerUser = await validateReferralCode(referralCode);
            
            if (!referrerUser) {
                return res.status(statusCodes.BAD_REQUEST).render('user/signup', {
                    errorMessage: 'Invalid referral code. Please check and try again or leave it empty.'
                });
            }

            // Prevent self-referral
            if (referrerUser.email === email) {
                return res.status(statusCodes.BAD_REQUEST).render('user/signup', {
                    errorMessage: 'You cannot use your own referral code.'
                });
            }
        }

        const existingUser = await User.findOne({ email })

        if (existingUser && existingUser.isVerified) {
            return res.status(statusCodes.CONFLICT).render('user/signup', {
                errorMessage: errorMessages.EMAIL_ALREADY_REGISTERED
            });

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

        // console.log("Email save in session", email)

        res.status(statusCodes.CREATED).render('user/verify-otp', {
            email,
        });

    } catch (err) {
        console.error("Error in signup:", err);
        next(err)
    }
}


export const postVerifyOtp = async (req, res, next) => {

    try {
        const { otp } = req.body;

        const email = req.session.signupEmail;

        if (!email) {
            return res.status(statusCodes.BAD_REQUEST).render('user/verify-otp', {
                email: null,
                error: errorMessages.SESSION_EXPIRED || "Session expired. Please sign up again."
            })
        }


        const otpRecord = await Otp.findOne({ email, otp });
        console.log("OTP Details :", otpRecord)


        if (!otpRecord) {
            return res.status(statusCodes.NOT_FOUND).render('user/verify-otp', {
                email,
                error: errorMessages.OTP_NOT_FOUND || "OTP expired or not found. Please resend OTP."
            })
        }


        if (otpRecord.otp !== otp) {
            return res.status(statusCodes.BAD_REQUEST).render('user/verify-otp', {
                email,
                error: errorMessages.OTP_INVALID || "Invalid OTP. Please try again."
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

        req.session.successMessage = `Welcome to MONTRÉA, ${verifiedUser.name}! Your email has been verified successfully 🎉`;

        res.redirect('/')

    } catch (err) {

        console.error("Error veifying OTP:", err)
        next(err)
    }
}


export const getResendOtp = async (req, res, next) => {
    try {
        const email = req.session.signupEmail;

        if (!email) {
            return res.status(statusCodes.BAD_REQUEST).render('user/verify-otp', {
                email: null,
                error: errorMessages.SESSION_EXPIRED || "Session expired. Please sign up again."
            });
        }

        await Otp.deleteMany({ email })

        const newOtp = generateSecureOTP();
        console.log("New OTP :", newOtp)

        await Otp.create({ email, otp: newOtp });



        await sendEmail(email, "Your New MONTRÉA OTP", newOtp);

        res.render('user/verify-otp', {
            email,
            success: true,
            message: "New OTP sent successfully"
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
            return res.status(statusCodes.BAD_REQUEST).render('user/signin', {
                 errorMessage: message,
                 returnUrl: req.session.returnUrl || null
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(statusCodes.NOT_FOUND).render('user/signin', {
                errorMessage: errorMessages.EMAIL_NOT_REGISTERED,
                returnUrl: req.session.returnUrl || null
            });
        }

        if (user.status === 'blocked') {
            return res.render('user/signin', {
                 error: 'Your account has been blocked by the admin. Please contact support.',
                 returnUrl: req.session.returnUrl || null
            })
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(statusCodes.UNAUTHORIZED).render('user/signin', {
                errorMessage: errorMessages.INVALID_PASSWORD,
                returnUrl: req.session.returnUrl || null
            });
        }

        if (!user.isVerified) {
            return res.status(statusCodes.FORBIDDEN).render('user/signin', {
                errorMessage: "Please verify your email before signing in.",
                returnUrl: req.session.returnUrl || null
            });
        }
        const returnUrl = req.session.returnUrl
        delete req.session.returnUrl

        req.session.userId = user._id;
        req.session.successMessage = `Welcome back, ${user.name}! 🎉`;

        if(returnUrl && isValidReturnUrl(returnUrl)){
            return res.redirect(returnUrl);
        }

        res.redirect('/')
    } catch (err) {
        console.error('Signin Error :', err)
        next(err)
    }
}


export const oauthCallbackController = async (req, res) => {
    if (!req.user) {
        return res.redirect('/signin');
    }
    // const user = await User.findById(req.session.userId)
    // if(user.status === 'blocked'){
    //     res.render('user/signin',{error: "Your account has been blocked by admin."})
    // }
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

        if (req.isAuthenticated && req.isAuthenticated()) {
            req.logout(err => {
                if (err) return next(err)
            })
        }
        if (req.session.userId) delete req.session.userId
        if (req.session.passport) delete req.session.passport

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        // req.flash('success', 'You have logged out successfully!')
        // console.log(req.flash())
        // console.log(req.flash()[0])

        return res.redirect('/')
    } catch (err) {
        console.error("User Logout Error : ", err)
        next(err)
    }
}

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
            message: "OTP has been sent to your email address."
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

        console.log("📩 Email in session:", email);
        console.log("🔢 Confirmation code received:", confirmationCode);

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

        const otpRecord = await Otp.findOne({ email, otp: confirmationCode });
        console.log(" OTP record found:", otpRecord);

        if (!otpRecord || otpRecord.otp !== confirmationCode) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: errorMessages.OTP_INVALID || "Invalid OTP. Please try again."
            })
        }

        await Otp.deleteOne({ email });
        req.session.forgotPasswordOtpVerified = true;

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: "OTP verified successfully."
        })

    } catch (err) {
        console.error("Error in postVerifyForgotOtp:", err)
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