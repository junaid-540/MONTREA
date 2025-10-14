
export const getCustomersPage = (req,res,) =>{

    res.render('admin/customers-management',{
        Title:'Customer Management' ,
        pageCSS:'/public/css/admin/customers.css',
    });
}