import errorMessages from "../utils/errorMessages.js";
import statusCodes from "../utils/statusCodes.js";




export const notFoundHandler = (req, res, next) => {
    // console.log(req.originalUrl)

    const isAdminRoute = req.originalUrl.startsWith('/admin')

    res.status(statusCodes.NOT_FOUND).render('user/404', {
        statusCode: 404,
        errorMessage: errorMessages.INVALID_REQUEST || "Page Not Found",
        backLink: isAdminRoute ? '/admin/dashboard' : '/',
        isAdminRoute,
        Title: isAdminRoute ? "Dashboard - Page Not Found" : "Page Not Found"
    });
};

export const globalErrorHandler = (err, req, res, next) => {
    console.error(err.stack);
    const isAdminRoute = req.originalUrl.startsWith('/admin');
    res.status(statusCodes.INTERNAL_SERVER_ERROR).render('user/404', {
        statusCode: 500,
        errorMessage: errorMessages.INTERNAL_SERVER_ERROR || "Something went wrong. Please try again later.",
        backLink: isAdminRoute ? '/admin/dashboard' : '/',
        isAdminRoute,
        Title: isAdminRoute ? "Dashboard - Error" : "Error"
    });
};
