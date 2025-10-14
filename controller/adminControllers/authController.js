import Admin from "../../models/adminSchema.js";
import bcrypt from 'bcrypt'
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";
import { loginValidation } from "../../validations/adminValidation.js";




export const getLoginPage = (req, res, next) => {
    
    try {
        if(req.session.admin){
            return res.redirect('/admin/dashboard')
        }
        res.render('admin/login',{error: null, email: ""})
    } catch (err) {
        console.error("Error rendering login page: ", err.message)
        next(err)
    }
};


export const postLogin = async (req,res,next) =>{
    try {   
        const {error} = loginValidation.validate(req.body,{abortEarly:false})
        
        if(error){
            const messages = error.details.map(e => e.message)
            console.log("Admin Validation Error", messages)
            return res.status(statusCodes.BAD_REQUEST).render('admin/login',{
                errorMessage: messages.join(', '),
                email: req.body.email,
            });
        }

        const {email,password} = req.body

        const admin = await Admin.findOne({email})
        if(!admin){
            return res.status(statusCodes.UNAUTHORIZED).render('admin/login',{
                errorMessage:errorMessages.INVALID_CREDENTIALS,
                email,
            });
        }

        const isMatch = await bcrypt.compare(password,admin.password);

        if(!isMatch){
            return res.status(statusCodes.UNAUTHORIZED).render('admin/login',{
                errorMessage: errorMessages.INVALID_CREDENTIALS,
                email,
            })
        }

        if(!admin.isActive){
            return res.status(statusCodes.FORBIDDEN).render('admin/login',{
                errorMessage:errorMessages.INACTIVE_ADMIN,
                email,
            });
        }

        req.session.admin = {
            id: admin._id,
            name: admin.name,
            email: admin.email,
        };

        req.session.successMessage = `Welcome back, ${admin.name}`

        res.redirect('/admin/dashboard');
    } catch (err) {       
        console.error("Admin Login Error:", err);
        next(err)
    }
}


export const adminLogout = (req,res,next) =>{
    try {  
        if(req.session.admin) delete req.session.admin;

        res.clearCookie('connect.sid');
        res.set('Cache-Control','no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        return res.redirect('/admin')
    } catch (err) {
        
        console.error("Admin Logout Error:", err);
        next(err)
    }
}
