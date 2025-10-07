import express from 'express'
import { getLoginPage } from '../controller/adminControllers/authController.js';


const router = express.Router()

router.get('/',getLoginPage)

export default router