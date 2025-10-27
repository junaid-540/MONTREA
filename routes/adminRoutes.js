import express from 'express'
import { getLoginPage, postLogin , adminLogout} from '../controller/adminControllers/authController.js';
import { getDashboard } from '../controller/adminControllers/dashboardController.js';
import { getCustomersPage, toggleBlockUser } from '../controller/adminControllers/customersController.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { getCategories , addCategory , editCategory , toggleCategoryStatus, getAddCategoryPage , getEitCategoryPage} from '../controller/adminControllers/categoryController.js';
import validateRequest from '../middleware/validateRequest.js';
import { addCategoryValidation , editCategoryValidation} from '../validations/adminValidation.js';
import { getProducts , getAddProductPage} from '../controller/adminControllers/productController.js';



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
router.post("/products/add", adminAuth);
router.get("/products/edit/:id", adminAuth);
router.put("/products/edit/:id", adminAuth);
router.patch("/products/toggle/:id", adminAuth);



export default router