import express from 'express'
import { getLoginPage, postLogin , adminLogout} from '../controller/adminControllers/authController.js';
import { getDashboard } from '../controller/adminControllers/dashboardController.js';
import { getCustomersPage } from '../controller/adminControllers/customersController.js';


const router = express.Router()

router.get('/',getLoginPage)
router.post('/',postLogin)
router.get('/dashboard',getDashboard)
router.get('/logout',adminLogout)
router.get('/customer',getCustomersPage)


export default router