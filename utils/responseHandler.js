

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







/**
 * sendResponse - A unified response handler for JSON and EJS rendering
 *
 * @param {object} res - Express response object
 * @param {object} options - Options object
 * @param {boolean} options.success - Indicates success or failure
 * @param {string} options.message - Message to display
 * @param {number} [options.statusCode=200] - HTTP status code
 * @param {string} [options.renderPage] - EJS page to render (optional)
 * @param {object} [options.renderVars={}] - Variables to pass to EJS template
 * @param {object} [options.data] - Data to send in JSON response
 */


// export const sendResponse = ({
//   res,
//   req,
//   statusCode = 200,
//   isError = false,
//   message = "",
//   data = null,
//   renderPage = null,
//   redirectTo = null,
//   renderVars = {}
// }) => {
//   const templateVars = isError
//     ? { errorMessage: message, ...renderVars }
//     : { successMessage: message, ...renderVars };

//   if (renderPage) {
//     return res.status(statusCode).render(renderPage, templateVars);
//   }

//   if (redirectTo) {
//     // Only set session messages if req is provided
//     if (req && req.session) {
//       if (isError) req.session.errorMessage = message;
//       else req.session.successMessage = message;
//     }
//     return res.redirect(redirectTo);
//   }

//   return res.status(statusCode).json({
//     success: !isError,
//     message,
//     data,
//   });
// };

