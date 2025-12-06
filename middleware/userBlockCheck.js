import User from "../models/userSchema.js";

export const checkBlockedUser = async (req,res,next) =>{
    if( !req.session || !req.session.userId) return next()

    // const user  = await User.findById(req.session.userId);
    // // console.log("Checking the block status", user && user.status)
    // if(user && user.status === 'blocked'){
    //     req.session.destroy(()=>{
    //         res.redirect('/signin?error=blocked')
    //     });
    //     return
    // }
    // next()

    try {
        const user = await User.findById(req.session.userId);
        if(user && user.status === 'blocked'){
            const blockedUserId = req.session.userId;
            console.log(`Blockde user ${blockedUserId} attempted access`);

            delete req.session.userId;
            delete req.session.passport;
            delete req.session.successMessage;
            delete req.session.signupEmail;
            delete req.session.forgotPasswordEmail;
            delete req.session.forgotPasswordOtpVerified

            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');

            return req.session.save((err)=>{
                if(err){
                    console.error("Error saving session after blocking user :",err);
                }

                return res.redirect('/signin?error=blocked')
            })
        }
        next()
    } catch (err) {
        console.error("Error in checkBlockedUser middleware :",err);
        next(err)
    }
};

