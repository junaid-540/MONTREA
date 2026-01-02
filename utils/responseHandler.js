

/**
 * sendResponse - unified JSON response handler
 *
 * @param {object} res - Express response object
 * @param {object} options - Options object
 * @param {boolean} options.success - Indicates success or failure
 * @param {string} options.message - Message to display
 * @param {number} [options.statusCode=200] - HTTP status code
 * @param {any} [options.data=null] - Data to send in JSON response
 */

export const sendResponse = (res, { success = true, message = "", statusCode = 200, data = null }) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};


