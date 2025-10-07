import express from 'express'
import { getHomePage } from '../controller/userControllers/homeController.js';
import { getSignup , postSignup , postVerifyOtp , getResendOtp} from '../controller/userControllers/authController.js';



const router = express.Router()



//authentication//

router.get("/", getHomePage);
router.get('/signup',getSignup)
router.post('/signup',postSignup)
router.post('/verify-otp',postVerifyOtp);
router.get('/resend-otp',getResendOtp);


export default router