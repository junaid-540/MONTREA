export const getLoginPage = (req, res) => {
    try {
        res.render('admin/login');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error'); 
    }
};
