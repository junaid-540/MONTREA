import express from 'express'
import { aboutUs, getHomePage, getProductDetails, getShopPage } from '../controller/userControllers/home.controller.js';
import { getSignup , postSignup , postVerifyOtp , getResendOtp , getSignin , postSignin , oauthCallbackController , userLogout, loadForgetPassword, postForgetPassword, getVeriyForgotOtp, getResendForgotOtp, postVerifyForgotOtp, LoadResetPassword, resetPassword, getVerifyOtp} from '../controller/userControllers/auth.controller.js';
import passport from 'passport';
import { userFinder } from '../middleware/userfinder.js';
import { preventCache, redirectIfLoggedIn } from '../middleware/preventcache.js';
import { checkBlockedUser } from '../middleware/userBlockCheck.js';
import { getChangePassword, getEditProfile, getPasswordReset, getProfile, getReferralPage, getResendEmailChangeOtp, getVerifyEmailChange, postChangePassword, postVerifyEmailChange, updateProfile } from '../controller/userControllers/profile.controller.js';
import { checkSession } from '../middleware/checkSession.js';
import upload from '../middleware/multerConfig.js';
import validateRequest from '../middleware/validateRequest.js';
import { addAddressValidation, editProfileValidation } from '../validations/userValidations.js';
import { deleteAddress, getAddAddress, getAddressPage, getEditAddress, postAddAddress, postEditAddress, setDefaultAddress } from '../controller/userControllers/address.controller.js';
import { getCartPage ,clearInvalidItems, addToCart, checkVariantInCart, updateCartQuantity, removeFromCart, moveToWishlist } from '../controller/userControllers/cart.controller.js';
import { getCheckoutPage, addAddress as addCheckoutAddress, continueToPayment, } from '../controller/userControllers/checkout.controller.js';
import { createRazorpayOrder, createRazorpayRetryOrder, getPaymentPage, handlePaymentFailure, placeOrder, verifyRazorpayPayment } from '../controller/userControllers/payment.controller.js';
import { cancelOrder, downloadInvoice, getMyOrdersPage, getOrderDetailsPage, getOrderFailurePage, getOrderSuccessPage, returnOrder } from '../controller/userControllers/order.controller.js';
import { addToWishlist, checkVariantInWishlist, getWishlist, moveToCart, removeFromWishlist } from '../controller/userControllers/wishlist.controller.js';
import { createWalletTopUpOrder, getTransactionHistory, getWalletBalance, getWalletPage, verifyWalletTopUp } from '../controller/userControllers/wallet.controller.js';
import { applyCouponToCart, getAvailableCouponsForUser, removeCoupon, validateCouponBeforePayment } from '../controller/userControllers/coupon.controller.js';
import { deleteReview, getProductReviews, submitReview } from '../controller/userControllers/review.controller.js';


const router = express.Router()


router.use(userFinder)
router.use(checkBlockedUser)

//authentication//
router.get("/", getHomePage);
router.get('/signup',preventCache,redirectIfLoggedIn,getSignup)
router.post('/signup',postSignup)
router.get('/verify-otp',preventCache,getVerifyOtp)
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
    keepSessionInfo: true,
}), oauthCallbackController)
router.post('/logout',userLogout)
router.get('/forgot-password',preventCache,loadForgetPassword)
router.post('/forgot-password',preventCache,postForgetPassword);
router.get('/verify-forgot-otp',preventCache,getVeriyForgotOtp)
router.post('/verify-forgot-otp',preventCache,postVerifyForgotOtp);
router.get('/resend-forgot-otp',preventCache,getResendForgotOtp);
router.get('/reset-password',preventCache,LoadResetPassword)
router.post('/reset-password',preventCache,resetPassword);


// shop routes //
router.get('/shop',getShopPage)
router.get('/product/:id',getProductDetails)


// profile routes //
router.get('/profile',checkSession,getProfile)
router.get('/profile/edit',checkSession,getEditProfile)
router.put('/profile',checkSession,upload.single("profileImage"),validateRequest(editProfileValidation),updateProfile)
router.get('/verify-email-change',checkSession,getVerifyEmailChange);
router.post('/verify-email-change',checkSession,postVerifyEmailChange);
router.get('/resend-email-change-otp',checkSession,getResendEmailChangeOtp);
router.get('/change-password',checkSession,getChangePassword);
router.post('/change-password',checkSession,postChangePassword);
router.get('/profile/forgot-current-password',checkSession,getPasswordReset)


// address routes //
router.get('/address',checkSession,getAddressPage)
router.get('/add-address',checkSession,getAddAddress)
router.post('/add-address',checkSession,validateRequest(addAddressValidation),postAddAddress)
router.get('/edit-address/:id',checkSession,getEditAddress);
router.post('/edit-address/:id',checkSession,validateRequest(addAddressValidation),postEditAddress);
router.delete('/address/:id',checkSession,deleteAddress);
router.patch('/address/:id/default',checkSession,setDefaultAddress)


// cart routes //
router.get('/cart',checkSession,getCartPage);
router.post('/cart/items',checkSession,addToCart)
router.get('/cart/items/:variantId/exists',checkVariantInCart)
router.delete('/cart/invalid-items',checkSession,clearInvalidItems)
router.patch('/cart/items/:variantId',checkSession,updateCartQuantity)
router.post('/cart/remove',checkSession,removeFromCart)
router.post('/cart/move-to-wishlist', checkSession, moveToWishlist);


// Checkout Routes //


router.get('/checkout',checkSession,getCheckoutPage);
router.post('/checkout/add-address',checkSession,validateRequest(addAddressValidation),addCheckoutAddress);
router.post('/checkout/continue-to-payment',checkSession,continueToPayment)

// Payment Routes //

router.get('/payment',checkSession,getPaymentPage);
router.post('/payment/place-order',checkSession,placeOrder);
router.post('/payment/create-razorpay-order',checkSession,createRazorpayOrder);
router.post('/payment/create-razorpay-retry-order',checkSession,createRazorpayRetryOrder);
router.post('/payment/verify-payment',checkSession,verifyRazorpayPayment);
router.post('/payment/payment-failure',checkSession,handlePaymentFailure);
router.get('/order-success/:orderId',checkSession,getOrderSuccessPage);
router.get('/order-failure/:orderId',checkSession,getOrderFailurePage);


// Orders routes //

router.get('/orders',checkSession,getMyOrdersPage)
router.get('/orders/:orderId',checkSession,getOrderDetailsPage)
router.post('/orders/:orderId/cancel',checkSession,cancelOrder);
router.post('/orders/:orderId/return',checkSession,returnOrder);
router.get('/order/:orderId/invoice',checkSession,downloadInvoice);



// Wishlist Routes //

router.get('/wishlist',checkSession,getWishlist)
router.post('/wishlist/items',checkSession,addToWishlist);
router.get('/wishlist/items/:variantId/exists',checkVariantInWishlist)
router.delete('/wishlist/items/:variantId',checkSession,removeFromWishlist)
router.post('/wishlist/move-to-cart',checkSession,moveToCart)



// Wallet Routes //

router.get('/wallet',checkSession,getWalletPage)
router.post('/wallet/create-topup-order', checkSession, createWalletTopUpOrder);
router.post('/wallet/verify-topup', checkSession, verifyWalletTopUp);
router.get('/wallet/balance', checkSession, getWalletBalance);
router.get('/wallet/transactions', checkSession, getTransactionHistory);



// Coupon Routes //

router.get('/coupons/available', checkSession, getAvailableCouponsForUser);
router.post('/checkout/coupon', checkSession, applyCouponToCart);
router.delete('/checkout/coupon', checkSession, removeCoupon);
router.get('/checkout/validate-coupon', checkSession, validateCouponBeforePayment);


// referral route //
router.get('/refer',checkSession,getReferralPage)


// review routes //
router.post('/review/submit',checkSession,submitReview);
router.delete('/review/:reviewId',checkSession,deleteReview);
router.get('/review/product/:productId', getProductReviews);


// aboutUS
router.get('/about',aboutUs)

export default router