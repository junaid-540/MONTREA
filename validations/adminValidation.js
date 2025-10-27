import Joi from "joi";
import errorMessages from "../utils/errorMessages.js";


export const loginValidation = Joi.object({
    email: Joi.string()
    .email({tlds:{allow:false}})
    .required()
    .messages({
        'string.empty':errorMessages.EMAIL_REQUIRED,
        'string.email':errorMessages.EMAIL_INVALID,
    }),

    password : Joi.string()
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/)
    .required()
    .messages({
        'string.empty':errorMessages.PASSWORD_REQUIRED,
        'string.pattern.base':errorMessages.PASSWORD_INVALID,
    }),
});


export const addCategoryValidation = Joi.object({
    name: Joi.string()
    .trim()
    .pattern(/^[A-Za-z\s\-]+$/)
    .min(3)
    .max(30)
    .required()
    .messages({
        'string.empty':errorMessages.CATEGORY_NAME_REQUIRED,
        'string.min': errorMessages.CATEGORY_NAME_INVALID,
        'string.pattern.base': errorMessages.CATEGORY_NAME_PATTERN,
        'any.required': errorMessages.CATEGORY_NAME_REQUIRED,
    }),


    description: Joi.string()
    .trim()
    .min(10)
    .max(250)
    .required()
    .messages({
        'string.empty': errorMessages.CATEGORY_DESCRIPTION_REQUIRED,
        'string.min': errorMessages.CATEGORY_DESCRIPTION_INVALID,
        'any.required': errorMessages.CATEGORY_DESCRIPTION_REQUIRED
    }),
});



export const editCategoryValidation = Joi.object({
    name: Joi.string()
    .trim()
    .pattern(/^[A-Za-z\s\-]+$/)
    .min(3)
    .max(30)
    .messages({
        'string.empty': errorMessages.CATEGORY_NAME_REQUIRED,
        'string.min': errorMessages.CATEGORY_NAME_INVALID,
        'string.max': errorMessages.CATEGORY_NAME_LIMIT,
        'string.pattern.base': errorMessages.CATEGORY_NAME_PATTERN,
    })
    .optional()
    .allow(null),


    description: Joi.string()
    .trim()
    .min(10)
    .max(250)
    .messages({
        'string.empty': errorMessages.CATEGORY_DESCRIPTION_REQUIRED,
        'string.min': errorMessages.CATEGORY_DESCRIPTION_INVALID,
        'string.max': errorMessages.CATEGORY_DESCRIPTION_LIMIT,
    })
    .optional()
    .allow(null),
});