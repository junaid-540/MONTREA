import statusCodes from '../utils/statusCodes.js';
import { sendResponse } from '../utils/responseHandler.js';

export const validateVariantImages = (req, res, next) => {
    if (!req.files || req.files.length !== 3) {
        return sendResponse(res, {
            success: false,
            message: "Exactly 3 images are required",
            statusCode: statusCodes.BAD_REQUEST,
        });
    }
    next();
};