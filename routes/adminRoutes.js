import express from 'express'
import { getLoginPage, postLogin , adminLogout} from '../controller/adminControllers/authController.js';
import { getDashboard } from '../controller/adminControllers/dashboardController.js';
import { getCustomersPage, toggleBlockUser } from '../controller/adminControllers/customersController.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { getCategories , addCategory , editCategory , toggleCategoryStatus, getAddCategoryPage , getEitCategoryPage} from '../controller/adminControllers/categoryController.js';
import validateRequest from '../middleware/validateRequest.js';
import { addCategoryValidation , addProductValidation, addVariantValidation, editCategoryValidation} from '../validations/adminValidation.js';
import { getProducts , getAddProductPage, addProduct} from '../controller/adminControllers/productController.js';
import { addVariant, getProductVariants , toggleVariantStatus ,editVariant } from '../controller/adminControllers/productVariantController.js';
import upload from '../middleware/multerConfig.js';


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
router.get("/products/edit/:id", adminAuth);
router.put("/products/edit/:id", adminAuth);
router.patch("/products/toggle/:id", adminAuth);








// Product Variants Management

router.get("/products/:productId/variants", adminAuth, getProductVariants);
router.post("/products/:productId/variants/add",adminAuth,upload.array("images", 3),validateRequest(addVariantValidation), addVariant);
router.put("/products/variants/edit/:id",adminAuth,upload.array("images", 3),editVariant);
router.patch("/products/variants/toggle/:id", adminAuth, toggleVariantStatus);


export default router