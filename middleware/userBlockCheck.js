import User from "../models/userSchema.js";

export const checkBlockedUser = async (req,res,next) =>{
    if( !req.session || !req.session.userId) return next()

    const user  = await User.findById(req.session.userId);
    console.log("Checking the block status", user && user.status)
    if(user && user.status === 'blocked'){
        req.session.destroy(()=>{
            res.redirect('/signin?error=blocked')
        });
        return
    }
    next()
}

