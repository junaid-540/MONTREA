import User from "../models/userSchema.js";


export const userFinder = async (req,res,next) =>{


    if(req.session.userId){
        
        try {
            
            const user = await User.findById(req.session.userId).select('name email');
            res.locals.user = user || null

        } catch (err) {

            
            console.error("Error fetching user in middleware: ",err)
            res.locals.user = null
        }

    }else{
        res.locals.user = null
    }
    next()
    
}