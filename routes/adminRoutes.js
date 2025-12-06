import express from 'express'
import { getLoginPage, postLogin , adminLogout} from '../controller/adminControllers/auth.controller.js';
import { getDashboard } from '../controller/adminControllers/dashboard.controller.js';
import { getCustomersPage, toggleBlockUser } from '../controller/adminControllers/customer.controller.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { getCategories , addCategory , editCategory , toggleCategoryStatus, getAddCategoryPage , getEitCategoryPage} from '../controller/adminControllers/category.controller.js';
import validateRequest from '../middleware/validateRequest.js';
import { addCategoryValidation , addProductValidation, addVariantValidation, editCategoryValidation, editProductValidation, editVariantValidation} from '../validations/adminValidation.js';
import { getProducts , getAddProductPage, addProduct, getEditProductPage, editProduct, toggleProductStatus} from '../controller/adminControllers/product.controller.js';
import { addVariant, getProductVariants , toggleVariantStatus ,editVariant, getAddVariant, getEditVariant } from '../controller/adminControllers/variant.controller.js';
import upload from '../middleware/multerConfig.js';
import { getOrders, getUpdateOrder, updateItemStatus } from '../controller/adminControllers/order.controller.js';
// import { validateVariantImages } from '../middleware/validateVariantImages.js';


const router = express.Router()


// router.use(adminAuth)

//Auth routes//

router.get('/',getLoginPage)
router.post('/',postLogin)
router.get('/logout',adminLogout)

//Dashboard//

router.get('/dashboard',adminAuth,getDashboard)

//Customers routes//

router.get('/customer',adminAuth,getCustomersPage)
router.patch('/users/toggle-block/:id',toggleBlockUser);


//Category routes//

router.get('/category',adminAuth,getCategories);
router.get('/category/add',adminAuth,getAddCategoryPage)
router.post('/category/add',adminAuth,validateRequest(addCategoryValidation),addCategory);
router.get('/category/edit/:id',adminAuth,getEitCategoryPage)
router.put('/category/edit/:id',adminAuth,validateRequest(editCategoryValidation),editCategory);
router.patch('/category/toggle/:id',adminAuth,toggleCategoryStatus)


// Products Management
router.get("/products", adminAuth, getProducts);
router.get("/products/add", adminAuth, getAddProductPage);
router.post("/products/add", adminAuth,upload.any(),validateRequest(addProductValidation),addProduct);
router.get("/products/edit/:id", adminAuth,getEditProductPage);
router.put("/products/edit/:id", adminAuth,validateRequest(editProductValidation),editProduct);
router.patch("/products/toggle/:id", adminAuth,toggleProductStatus);





// Product Variants Management

router.get("/products/:productId/variants", adminAuth, getProductVariants);
router.get('/products/:productId/variants/add',adminAuth,getAddVariant)
router.post("/products/:productId/variants/add",adminAuth,upload.array("images", 3),validateRequest(addVariantValidation), addVariant);
router.get('/products/variants/edit/:id',adminAuth,getEditVariant)
router.put("/products/variants/edit/:id", adminAuth, upload.any(), editVariant);
router.patch("/products/variants/toggle/:id", adminAuth, toggleVariantStatus);





// order routes //

router.get('/order',adminAuth,getOrders)
router.get('/order/:orderId',adminAuth,getUpdateOrder)
router.patch('/order/:orderId/items/:itemId/status',adminAuth, updateItemStatus)

export default router