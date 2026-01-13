import express from 'express'
import { getLoginPage, postLogin , adminLogout} from '../controller/adminControllers/auth.controller.js';
import { getDashboard } from '../controller/adminControllers/dashboard.controller.js';
import { getCustomersPage, toggleBlockUser } from '../controller/adminControllers/customer.controller.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { getCategories , addCategory , editCategory , toggleCategoryStatus, getAddCategoryPage , getEitCategoryPage} from '../controller/adminControllers/category.controller.js';
import validateRequest from '../middleware/validateRequest.js';
import { addCategoryValidation , addProductValidation, addVariantValidation,  editCategoryValidation,  editProductValidation, editVariantValidation} from '../validations/adminValidation.js';
import { getProducts , getAddProductPage, addProduct, getEditProductPage, editProduct, toggleProductStatus} from '../controller/adminControllers/product.controller.js';
import { addVariant, getProductVariants , toggleVariantStatus ,editVariant, getAddVariant, getEditVariant } from '../controller/adminControllers/variant.controller.js';
import upload from '../middleware/multerConfig.js';
import { getOrders, getUpdateOrder, updateItemStatus } from '../controller/adminControllers/order.controller.js';
import { createCoupon, getAddCouponPage, getCouponList, getEditCouponPage, toggleCouponStatus, updateCoupon } from '../controller/adminControllers/coupon.controller.js';
import { getReturnRequests, processRefund, updateReturnStatus } from '../controller/adminControllers/return.controller.js';
import { addOffer, deleteOffer, getEditOffer, getFormData, getOffers, toggleOfferStatus, updateOffer } from '../controller/adminControllers/offer.controller.js';
import { downloadSalesReportExcel, downloadSalesReportPDF, getSalesReportPage } from '../controller/adminControllers/salesReport.controller.js';


const router = express.Router()


// router.use(adminAuth)

//Auth routes//

router.get('/',getLoginPage)
router.post('/',postLogin)
router.post('/logout',adminLogout)

//Dashboard//

router.get('/dashboard',adminAuth,getDashboard)

//Customers routes//

router.get('/customer',adminAuth,getCustomersPage)
router.patch('/users/:id/block-status',toggleBlockUser);


//Category routes//

router.get('/category',adminAuth,getCategories);
router.get('/category/add',adminAuth,getAddCategoryPage)
router.post('/category/add',adminAuth,validateRequest(addCategoryValidation),addCategory);
router.get('/category/:id/edit',adminAuth,getEitCategoryPage)
router.put('/category/:id',adminAuth,validateRequest(editCategoryValidation),editCategory);
router.patch('/category/:id/status',adminAuth,toggleCategoryStatus)


// Products Management
router.get("/products", adminAuth, getProducts);
router.get("/products/add", adminAuth, getAddProductPage);
router.post("/products/add", adminAuth,upload.any(),validateRequest(addProductValidation),addProduct);
router.get("/products/:id/edit", adminAuth,getEditProductPage);
router.put("/products/:id", adminAuth,validateRequest(editProductValidation),editProduct);
router.patch("/products/:id/status", adminAuth,toggleProductStatus);





// Product Variants Management

router.get("/products/:productId/variants", adminAuth, getProductVariants);
router.get('/products/:productId/variants/add',adminAuth,getAddVariant)
router.post("/products/:productId/variants/add",adminAuth,upload.array("images", 3),validateRequest(addVariantValidation), addVariant);
router.get('/variants/:id/edit',adminAuth,getEditVariant)
router.put("/variants/:id", adminAuth, upload.any(), editVariant);
router.patch("/variants/:id/status", adminAuth, toggleVariantStatus);





// order routes //

router.get('/order',adminAuth,getOrders)
router.get('/order/:orderId',adminAuth,getUpdateOrder)
router.patch('/order/:orderId/items/:itemId/status',adminAuth, updateItemStatus)




// Coupon Routes //

router.get('/coupon',adminAuth,getCouponList)
router.get('/coupon/add',adminAuth,getAddCouponPage);
router.post('/coupon/add',adminAuth,createCoupon);
router.get('/coupon/:id/edit',adminAuth,getEditCouponPage);
router.put('/coupon/:id',adminAuth,updateCoupon);
router.patch('/coupon/:id/status',adminAuth,toggleCouponStatus);




// return & refund routes //

router.get('/refund-return',adminAuth,getReturnRequests)
router.post('/refund-return/update-status',adminAuth,updateReturnStatus);
router.post('/refund-return/process-refund',adminAuth,processRefund)



// offers routes //

router.get('/offers',adminAuth,getOffers);
router.get('/offers/form-data',adminAuth,getFormData)
router.post("/offers/add", adminAuth, addOffer);
router.get("/offers/:id/edit", adminAuth, getEditOffer);
router.put("/offers/:id", adminAuth,updateOffer);
router.patch("/offers/:id/status", adminAuth, toggleOfferStatus);
router.delete("/offers/:id", adminAuth, deleteOffer);



// sales report //

router.get('/sales-report',adminAuth,getSalesReportPage)
router.get('/sales-report/download/pdf', downloadSalesReportPDF);
router.get('/sales-report/download/excel', downloadSalesReportExcel);

export default router