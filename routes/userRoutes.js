import express from 'express'
import { getHomePage } from '../controller/userControllers/homeController.js';
import { getSignup , postSignup , postVerifyOtp , getResendOtp , getSignin , postSignin , oauthCallbackController , userLogout} from '../controller/userControllers/authController.js';
import passport from 'passport';
import { userFinder } from '../middleware/userfinder.js';
import { preventCache, redirectIfLoggedIn } from '../middleware/preventcache.js';
import { checkBlockedUser } from '../middleware/userBlockCheck.js';


const router = express.Router()


router.use(userFinder)
router.use(checkBlockedUser)
//authentication//

router.get("/", getHomePage);
router.get('/signup',preventCache,redirectIfLoggedIn,getSignup)
router.post('/signup',postSignup)
router.post('/verify-otp',preventCache,postVerifyOtp);
router.get('/resend-otp',preventCache,getResendOtp);
router.get('/signin',preventCache,redirectIfLoggedIn,getSignin)
router.post('/signin',postSignin)
router.get('/auth/google',passport.authenticate('google',{
    scope:["profile","email"],
    prompt:"select_account",
        })
    );
router.get('/auth/google/callback',passport.authenticate("google",{
    failureRedirect:'/signin',
    failureMessage:true,
}), oauthCallbackController)
router.get('/logout',userLogout)




export default router