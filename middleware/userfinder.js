import Cart from "../models/cartSchema.js";
import User from "../models/userSchema.js";
import Wishlist from "../models/wishlistSchema.js";

export const userFinder = async (req,res,next) =>{
    if(req.session.userId){
        try {      
            const [user,cart,wishlist] = await Promise.all([
                User.findById(req.session.userId).select('name email'),
                Cart.findOne({userId:req.session.userId}).select('items'),
                Wishlist.findOne({userId:req.session.userId}).select('items')
            ])

            res.locals.user = user || null;
            res.locals.cartItemCount = cart?.items?.length || 0;
            res.locals.wishlistItemsCount = wishlist?.items?.length || 0;

        } catch (err) {
            console.error("Error fetching user in middleware: ",err)
            res.locals.user = null;
            res.locals.cartItemCount = 0;
            res.locals.wishlistItemsCount = 0;
        }
    }else{
        res.locals.user = null;
        res.locals.cartItemCount = 0;
        res.locals.wishlistItemsCount = 0
    }
    next()
}