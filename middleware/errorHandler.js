import errorMessages from "../utils/errorMessages.js";
import statusCodes from "../utils/statusCodes.js";


export const notFoundHandler = (req,res,next) => {
    res.status(statusCodes.NOT_FOUND).render('user/404',{
        message:errorMessages.INVALID_REQUEST
    });
};


export const globalErrorHandler = (err,req,res,next) => {
    console.log(err.stack);

    const status = statusCodes.INTERNAL_SERVER_ERROR;
    const message = errorMessages.INTERNAL_SERVER_ERROR;

    res.status(status).json({error:message})
}