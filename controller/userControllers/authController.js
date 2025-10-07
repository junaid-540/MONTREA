import User from '../../models/userSchema.js'
import bcrypt from 'bcrypt'
import Otp from '../../models/otpSchema.js'
import { signupValidation } from '../../validations/userValidations.js'
import { sendEmail } from '../../utils/email.js'
import { generateSecureOTP } from '../../utils/otp.js'
import errorMessages from '../../utils/errorMessages.js'
import statusCodes from '../../utils/statusCodes.js'


export const getSignup = (req,res) =>{
    
    res.render('user/signup')
}

export const postSignup = async (req,res,next) =>{

    try {
                //data from signup//
        console.log(req.body)

        const {error} = signupValidation.validate(req.body,{abortEarly:false})
        if(error){
            const message = error.details.map(e => e.message);

            console.log(message)

            return res.status(statusCodes.BAD_REQUEST).json({message:message})
        }

        const {name,email,phone,password} = req.body
        
        

        const existingUser = await User.findOne({email})

        if(existingUser){
            return res.status(statusCodes.CONFLICT).json({success:false, error:errorMessages.EMAIL_ALREADY_REGISTERED});

        }


        const hashPassword = await bcrypt.hash(password,10);

        const newUser = await User.create({name,email,phone,password:hashPassword});
        // console.log("New User",newUser._id)

        const otp = generateSecureOTP();
        console.log("OTP:",otp)

        try {
            await Otp.create({email,otp})
        } catch (err) {
            console.log("Error Saving OTP :",err)
        }

        await sendEmail(email,'Verify Your MONTRÉA Account',otp)
        

        req.session.signupEmail = email;

        // console.log("Email save in session", email)

        res.status(statusCodes.CREATED).render('user/verify-otp',{email})

    } catch (err) {
        console.error("Error in signup:", err);
        next(err)
    }
}




export const postVerifyOtp = async (req,res,next) =>{
    
    try {
        
        const {otp} = req.body;

        const email = req.session.signupEmail;

        if(!email){
            return res.status(statusCodes.BAD_REQUEST).json({
                success:false,
                message:errorMessages.SESSION_EXPIRED || "Session expired. Please sign up again"
            })
        }

        const otpRecord = await Otp.findOne({email,otp});
        console.log("OTP Details :",otpRecord)


        if(!otpRecord){
            return res.status(statusCodes.NOT_FOUND).render('user/verify-otp',{
                email,
                error:errorMessages.OTP_NOT_FOUND || "OTP expired or not found. Please resend OTP."
            })
        }


        if(otpRecord.otp !== otp){
            return res.status(statusCodes.BAD_REQUEST).render('user/verify-otp',{
                email,
                error:errorMessages.OTP_INVALID || "OTP expired or not found. Please resend OTP."
            })
        }


        await User.updateOne({email},{$set:{isVerified:true}});

        await Otp.deleteOne({email})

        req.session.signupEmail = null;

        console.log("OTP verified and User Activated :",email);
        res.redirect('/')

    } catch (err) {
        
        console.error("Error veifying OTP:",err)
        next(err)
    }
}


export const getResendOtp = async (req,res,next) =>{

    try {
        
        const email = req.session.signupEmail;

        if(!email){
            return res.status(statusCodes.BAD_REQUEST).json({
                success:false,
                message:errorMessages.SESSION_EXPIRED || "Session expired. Please sign up again"
            });
        }

        await Otp.deleteMany({email})

        const newOtp = generateSecureOTP();
        
        console.log("New OTP :",newOtp)

        await Otp.create({email,otp:newOtp});


        await sendEmail(email,"Your New MONTRÉA OTP",newOtp);

        res.render('user/verify-otp',{
            email,
            success:true,
            message:"New OTP sent successfully"
        })

    } catch (err) {
        
        console.error("Error resending OTP :", err)
        next(err)
    }
}