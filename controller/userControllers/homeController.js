export const getHomePage = (req, res) => {
  const products = [
        { name: 'Super Slim Fit Solid Full Sleeves', price: '₹1679.00', image: '/public/images/AS featured product.png' },
        { name: 'Slim Fit Check Full Sleeves', price: '₹2099.00', image: '/public/images/VH featured product.png' },
        { name: 'Women Navy Solid Long Sleeves Formal Shirt', price: '₹1349.00', image: '/public/images/VH women featured product.png' }
    ];

    const categories = [
        { name: 'MEN', image: '/public/images/category men.png' },
        { name: 'WOMEN', image: '/public/images/category women.png' },
        { name: 'UNISEX', image: '/public/images/UNISEXMAIN.png' }
    ];

    const successMessage = req.session.successMessage || null

    req.session.successMessage = null

    res.render('user/index',{products,categories,successMessage , user:res.locals.user || null})
};


