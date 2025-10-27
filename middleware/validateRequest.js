/**
 * validateRequest - Middleware to validate request body using Joi schema
 *
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Middleware function
 */


const validateRequest = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details.map(e => e.message).join(', '),
        });
    }

    req.body = value; 
    next();
};

export default validateRequest;