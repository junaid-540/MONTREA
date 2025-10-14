

export const getDashboard = (req,res,next)=>{
    try {
        if(!req.session.admin){
            return res.redirect('/admin')
        }

        const successMessage = req.session.successMessage;
        delete req.session.successMessage

        res.render('admin/dashboard',{admin:req.session.admin,successMessage,Title:"Dashboard"})
    } catch (err) {
        console.error("Dashboard Error:",err)
        next()        
    }
}