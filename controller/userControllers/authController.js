import User from '../../models/userSchema.js'
import bcrypt from 'bcrypt'
import Otp from '../../models/otpSchema.js'
import { signupValidation , signinValidation} from '../../validations/userValidations.js'
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

            console.log("User Validation Error",message)

            return res.status(statusCodes.BAD_REQUEST).render('user/signup',{
                errorMessage:message.join(', ') // it will combine multiple messages
            })
        }

        const {name,email,phone,password} = req.body
      
        const existingUser = await User.findOne({email})

        if(existingUser && existingUser.isVerified){
            return res.status(statusCodes.CONFLICT).render('user/signup',{
                errorMessage:errorMessages.EMAIL_ALREADY_REGISTERED
            });

        }


        const hashPassword = await bcrypt.hash(password,10);

        if(existingUser && !existingUser.isVerified){
            await User.updateOne(
            {email},
            {
                $set:{
                    name,
                    phone,
                    password:hashPassword,
                    unverifiedCreatedAt:Date.now()
                }
            })

            console.log("Unverified user updated :",email);

        }else{
            await User.create({
                name,
                email,
                phone,
                password:hashPassword,
                unverifiedCreatedAt:Date.now(),
                isVerified:false
            })
        }

        const otp = generateSecureOTP();
        console.log("OTP:",otp)

        await Otp.deleteMany({email})

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
            return res.status(statusCodes.BAD_REQUEST).render('user/verify-otp',{
                email:null,
                error:errorMessages.SESSION_EXPIRED || "Session expired. Please sign up again."
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
                error:errorMessages.OTP_INVALID || "Invalid OTP. Please try again."
            })
        }

        // await User.updateOne({email},{$set:{isVerified:true}});
        const verifiedUser = await User.findOneAndUpdate({email},{$set:{isVerified:true,unverifiedCreatedAt:null}},{new:true})

        await Otp.deleteOne({email})

        req.session.signupEmail = null;

        req.session.userId = verifiedUser._id;

        console.log("OTP verified and User Activated :",email);

        req.session.successMessage = `Welcome to MONTRÉA, ${verifiedUser.name}! Your email has been verified successfully 🎉`;

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
            return res.status(statusCodes.BAD_REQUEST).render('user/verify-otp',{
                email:null,
                error:errorMessages.SESSION_EXPIRED || "Session expired. Please sign up again."
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


export const getSignin = (req,res) =>{
    res.render('user/signin')
}

export const postSignin = async (req,res,next) =>{
    try {
        
        console.log(req.body);
        const {email,password} = req.body;
        const {error} = signinValidation.validate(req.body,{abortEarly:false})
        if(error){
            const message = error.details.map(e => e.message).join(', ');
            return res.status(statusCodes.BAD_REQUEST).render('user/signin',{errorMessage:message})
        }

        const user  = await User.findOne({email});

        if(!user){
            return res.status(statusCodes.NOT_FOUND).render('user/signin',{
                errorMessage:errorMessages.EMAIL_NOT_REGISTERED
            })
        }

        const isMatch = await bcrypt.compare(password,user.password);

        if(!isMatch){
            return res.status(statusCodes.UNAUTHORIZED).render('user/signin',{
                errorMessage:errorMessages.INVALID_PASSWORD
            });
        }

        if(!user.isVerified){
            return res.status(statusCodes.FORBIDDEN).render('user/signin',{
                errorMessage: "Please verify your email before signing in."
            });
        }

        req.session.userId = user._id;
        req.session.successMessage = `Welcome back, ${user.name}! 🎉`;

        res.redirect('/')
    } catch (err) {      
        console.error('Signin Error :',err)
        next(err)
    }
}


export const  oauthCallbackController = (req,res)=>{
    if(!req.user){
        return res.redirect('/signin');
    }

    req.session.userId = req.user._id;
    req.session.successMessage = `Welcome, ${req.user.name}! 🎉`,

    res.redirect("/")

}


export const userLogout = (req,res,next) =>{
    try {
            //this checks if the user is logged in through the G-oath
        if(req.isAuthenticated && req.isAuthenticated()){
            req.logout(err=>{
                if(err) return next(err)
            })
        }
        if(req.session.userId) delete req.session.userId
        if(req.session.passport) delete req.session.passport

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        return res.redirect('/')
    } catch (err) {
        console.error("User Logout Error : ",err)
        next(err)
    }
}