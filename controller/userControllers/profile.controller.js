import User from "../../models/userSchema.js";
import { deleteOldProfileImage } from "../../utils/cloudinaryHelper.js";
import errorMessages from "../../utils/errorMessages.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import Otp from "../../models/otpSchema.js";
import { sendEmail } from "../../utils/email.js";
import { generateSecureOTP } from "../../utils/otp.js";
import bcrypt from 'bcrypt'


export const getProfile = async (req,res,next) =>{
    try {

        const user = await User.findById(req.session.userId).select('-password');
        if(!user){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.USER_NOT_FOUND,
            })
        }

        res.render('user/profile',{
        Title: "Profile",
        pageCss: '/public/css/user/profile.css',
        pageJs: '/public/js/user/profile.js',
        activePage: 'profile',
        is404: true,
        user:{
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            profileImage: user.profileImage || 'https://res.cloudinary.com/denu4amwx/image/upload/v1763464812/User_icon_ua556r.jpg',
        },
        isGoogleUser : !!user.googleId,
    });
    } catch (err) {
        console.log("Erron fron getProfile :",err);
        next(err)
    }
}


export const getEditProfile = async (req,res,next) =>{
    try {

        const user = await User.findById(req.session.userId).select("-password");
        if(!user){
            return sendResponse(res,{
                success:false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.USER_NOT_FOUND,
            });
        }
        res.render('user/edit-profile',{
            Title: 'Edit Profile',
            activePage: 'profile',
            pageCss: '/public/css/user/edit-profile.css',
            pageJs: '/public/js/user/edit-profile.js',
            is404: true,
            user:{
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                profileImage: user.profileImage || 'https://res.cloudinary.com/denu4amwx/image/upload/v1763464812/User_icon_ua556r.jpg'
            },
            isGoogleUser : !!user.googleId,
        });
    } catch (err) {
        console.error("Error caught in getEditProfile :",err);
        next(err)
    }
}


export const updateProfile = async (req,res,next) =>{
    try {

        const {name,email,phone} = req.body;
        console.log("Profile Name :",name);
        console.log("Profile Email :",email);
        console.log("Profile Phone :",phone);
        
        const userId = req.session.userId;
        const user = await User.findById(userId).select('email profileImage')

        if(!user){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.USER_NOT_FOUND,
            });
        }

        const isEmailChanged = email?.trim().toLowerCase() !== user.email?.toLowerCase();
        if(!isEmailChanged){
            const updateData = {
            name: name?.trim(),
            email: email?.trim(),
            phone,
        }
        
        
        if(req.file){
            await deleteOldProfileImage(user?.profileImage) // To delete old images
            updateData.profileImage = req.file.path;
        }
        
        const updatedUser = await User.findByIdAndUpdate(userId,updateData,{
            new:true,
            runValidators: true,
        }).select("-password");
        
        if(!updatedUser){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.USER_NOT_FOUND,
            });
        }
        
        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Profile updated successfully!',
            data:{
                user:{
                    name:updatedUser.name,
                    email:updatedUser.email,
                    phone: updatedUser.phone,
                    profileImage: updatedUser.profileImage,
                },
            },
        });
    }

    const trimmedNewEmail  = email.trim().toLowerCase();
    const existingUser = await User.findOne({email: trimmedNewEmail});
    if(existingUser && existingUser._id.toString() !== userId.toString()){
        return sendResponse(res,{
            success: false,
            statusCode: statusCodes.CONFLICT,
            message: errorMessages.EMAIL_ALREADY_REGISTERED
        });
    }

    const otp = generateSecureOTP();
    console.log("Email Change otp:",otp);
    await Otp.deleteMany({email:trimmedNewEmail});
    await Otp.create({email: trimmedNewEmail, otp});
    await sendEmail(trimmedNewEmail, 'Verify Your New Email for MONTRÉA',otp);

    req.session.pendingEmailChanges = {
        newEmail : trimmedNewEmail,
        name : name?.trim(),
        phone,
        hasImage: !!req.file,
        imagePath: req.file?.path || null
    };

    return sendResponse(res,{
        success: true,
        statusCode:statusCodes.OK,
        message: 'OTP sent to your new email. Please verify to complete the update.',
        data:{
            otpSent: true,
            newEmail: trimmedNewEmail,
        }
    });

    } catch (err) {
        console.error("Error in updateProfile :",err)
        next(err)
    }
}



export const getVerifyEmailChange = async (req,res,next) =>{
    try {
        const pending = req.session.pendingEmailChanges;
        if(!pending || !pending.newEmail){
            return res.redirect('/profile');
        }

        res.render('user/verify-forgot-otp',{
            pageType: 'email-change',
            email: pending.newEmail,
        });
    } catch (err) {
        console.error("Error loading verify email change page :",err);
        next(err)
    }
};



export const postVerifyEmailChange = async (req,res,next) =>{
    try {
        const {confirmationCode} = req.body;
        const pending = req.session.pendingEmailChanges;

        if(!pending || !pending.newEmail){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: "Session expired. Please try updating your profile again.",
            });
        }

        const email = pending.newEmail;
        if(!confirmationCode){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: "Please enter the confirmation code.",
            });
        }

        const otpRecord = await Otp.findOne({email , otp:confirmationCode});
        console.log("Email Change OTP Record:",otpRecord)
        if(!otpRecord || otpRecord.otp !== confirmationCode){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: errorMessages.OTP_INVALID || "Invalid OTP. Please try again",
            });
        }
        
        const updateData = {
            email,
            name: pending.name || '',
            phone: pending.phone || '',
        };

        const userId = req.session.userId;
        const currentUser = await User.findById(userId).select('profileImage');

        if(pending.hasImage && pending.imagePath){
            await deleteOldProfileImage(currentUser.profileImage);
            updateData.profileImage = pending.imagePath;
        }

        const updatedUser = await User.findByIdAndUpdate(userId,updateData,{
            new: true,
            runValidators: true,
        }).select("-password");

        await Otp.deleteOne({email})
        delete req.session.pendingEmailChanges;

        req.session.destroy((err)=>{
            if(err) console.error("Session destroy error:", err)
        });

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Email verified and profile updated successfully!',
            data: {  // ← ADD THIS WRAPPER
                redirect: `/signin?success=email_updated&newEmail=${encodeURIComponent(updatedUser.email)}`
            }
        })

    } catch (err) {
        console.error("Error in postVerifyEmailChange:",err)
        next(err);
    }
}


export const getResendEmailChangeOtp = async (req,res,next) =>{
    try {
        const pending = req.session.pendingEmailChanges;
        const email = pending?.newEmail;

        if(!pending || !email){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: "Session expired. Please try updating your profile again",
            });
        }

        await Otp.deleteMany({email});
        const newOtp = generateSecureOTP();
        console.log("New Resnd OTP",newOtp);
        await Otp.create({email,otp:newOtp});
        await sendEmail(email,"Your New MONTRÉA Email Verification OTP",newOtp);

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: "New OTP sent successfully.",
        })
    } catch (err) {
        console.error("Error resending email change OTP:",err);
        next(err)
    }
}


export const getChangePassword = async (req,res,next) =>{
    try {
        const user = await User.findById(req.session.userId)
        if (user?.googleId) {
            req.flash('error', 'Google account users cannot change password here. Use Google account settings.')
            return res.redirect('/profile');
        }
        res.render('user/change-password')
    } catch (err) {
        console.error("Error in getChangePassword :",err);
        next(err)
    }
}


export const postChangePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        console.log("Old password : ",oldPassword)
        console.log("New password : ",newPassword)
        console.log("Confirm password : ",confirmPassword)
        const userId = req.session.userId;

        if (!userId) {
            return sendResponse(res, {success: false,statusCode: statusCodes.UNAUTHORIZED,message: "Please log in again."});
        }

        const user = await User.findById(userId); 
        if (!user) {
            return sendResponse(res, {success: false,statusCode: statusCodes.NOT_FOUND,message: "User not found."});
        }

        if (user.googleId) {
            return sendResponse(res, {success: false,statusCode: statusCodes.FORBIDDEN,message: "Google account users cannot change password here."});
        }

        const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password);

        if (!isOldPasswordCorrect) {
            return sendResponse(res, {success: false,statusCode: statusCodes.BAD_REQUEST,message: "The current password you entered is incorrect."});
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return sendResponse(res, {success: false,statusCode: statusCodes.BAD_REQUEST,message: "New password must be different from the old password."});
        }

        if (newPassword !== confirmPassword) {
            return sendResponse(res, {success: false,statusCode: statusCodes.BAD_REQUEST,message: "New password and confirmation password do not match."});
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/;
        if (!passwordRegex.test(newPassword)) {
            return sendResponse(res, {success: false,statusCode: statusCodes.BAD_REQUEST,message: "Password must be at least 6 characters and contain both letters and numbers." });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return sendResponse(res, {success: true,statusCode: statusCodes.OK,message: "Your password has been successfully updated!"});

    } catch (err) {
        console.error("Change Password Error:", err);
        next(err);
    }
};


export const getPasswordReset = async (req,res,next) =>{
    try {
        const user = await User.findById(req.session.userId);
        if(!user){
            return sendResponse(res,{success:false,statusCode:statusCodes.NOT_FOUND,message:errorMessages.USER_NOT_FOUND});
        }

        if(user.googleId){
            return sendResponse(res,{success:false,statusCode:statusCodes.BAD_REQUEST,message:"Google accounts cannot use this feature."})
        }

        const email = user.email;

        const otp = generateSecureOTP();
        console.log("Change password OTP : ",otp)
        await Otp.deleteMany({email});
        await Otp.create({email,otp});
        await sendEmail(email,'MONTRÉA - Reset Your Current Password',otp);

        req.session.forgotPasswordEmail = email;
        req.session.forgotPasswordOtpVerified = false;

        return sendResponse(res,{success:true,statusCode:statusCodes.OK,message:"Password reset OTP sent to your email!"})
    } catch (err) {
        console.error("Error in getPasswordReset:",err);
        next(err);
    }
}

