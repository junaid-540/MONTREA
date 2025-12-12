
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { notFoundHandler,globalErrorHandler } from './middleware/errorHandler.js';
import { multerErrorHandler } from './middleware/multerConfig.js';
import './config/oauth.js'
import passport from 'passport';
import nocache from 'nocache';
import { userFinder } from './middleware/userfinder.js';
import flash from 'connect-flash'
import { cleanupTempOrders } from './middleware/cleanupTempOrders.js';


dotenv.config()

const app = express()
const port = process.env.PORT || 3000



app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{
        maxAge:1000*60*60*24,
        httpOnly:true,
    },
    store:MongoStore.create({
        mongoUrl:process.env.MONGO_URI,
        collectionName:"sessions",
    }),
}))

app.use(passport.initialize())
app.use(passport.session())

app.use(flash())


app.use(nocache())


app.use(userFinder)


app.use(cleanupTempOrders)

//get the current directory name , because in ES module __dirname is not available
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


connectDB()


app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use('/public',express.static(path.join(__dirname,'public')))



app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))




app.use('/',userRoutes)
app.use('/admin',adminRoutes)





app.use(multerErrorHandler)
app.use(notFoundHandler)
app.use(globalErrorHandler)

app


app.listen(port,()=>{
    console.log(`Server running on http://localhost:${port}`)
})


