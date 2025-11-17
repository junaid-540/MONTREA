import errorMessages from "../utils/errorMessages.js";
import statusCodes from "../utils/statusCodes.js";

export const notFoundHandler = (req, res, next) => {
    const isAdminRoute = req.originalUrl.startsWith('/admin');

    res.status(statusCodes.NOT_FOUND).render('user/404', {
        statusCode: 404,
        errorMessage: errorMessages.INVALID_REQUEST || "Page Not Found",
        backLink: isAdminRoute ? '/admin/dashboard' : '/',
        isAdminRoute,
        Title: isAdminRoute ? "Dashboard - Page Not Found" : "Page Not Found",
        is404 : true,
    });
};

export const globalErrorHandler = (err, req, res, next) => {

    console.error('=== GLOBAL ERROR DEBUG ===');
    console.error('Path:', req.originalUrl);
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('====================');

    // const isAdminRoute = req.originalUrl.startsWith('/admin');
    // const status = err.status || statusCodes.INTERNAL_SERVER_ERROR;

    // if (isAdminRoute) {
    //     return res.status(status).json({
    //         success: false,
    //         message: err.message || errorMessages.INTERNAL_SERVER_ERROR || "Something went wrong. Please try again later.",
    //         ...(process.env.NODE_ENV === 'development' && { stack: err.stack, error: err })  // Dev-only details
    //     });
    // }
    // res.status(status).render('user/404', {
    //     statusCode: status,
    //     errorMessage: err.message || errorMessages.INTERNAL_SERVER_ERROR || "Something went wrong. Please try again later.",
    //     backLink: isAdminRoute ? '/admin/dashboard' : '/',
    //     isAdminRoute,
    //     Title: isAdminRoute ? "Dashboard - Error" : "Error"
    // });



    // console.error(err.stack);
    const isAdminRoute = req.originalUrl.startsWith('/admin');
    res.status(statusCodes.INTERNAL_SERVER_ERROR).render('user/404', {
        statusCode: 500,
        errorMessage: errorMessages.INTERNAL_SERVER_ERROR || "Something went wrong. Please try again later.",
        backLink: isAdminRoute ? '/admin/dashboard' : '/',
        isAdminRoute,
        Title: isAdminRoute ? "Dashboard - Error" : "Error",
        is404 : true,
    });


};