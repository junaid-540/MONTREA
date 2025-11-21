export const checkSession = (req,res,next) =>{
    if(!req.session || !req.session.userId){
        return res.redirect('/signin')
    }
    next()
}