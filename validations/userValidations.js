import Joi from "joi";
import errorMessages from "../utils/errorMessages.js";



export const signupValidation = Joi.object({
    name: Joi.string()
    .pattern(/^[A-Za-z\s]{2,30}$/)
    .required()
    .messages({
        'string.empty': errorMessages.NAME_REQUIRED,
        'string.pattern.base':errorMessages.NAME_INVALID,
    }),


    email: Joi.string()
    .email()
    .required()
    .messages({
        'string.empty':errorMessages.EMAIL_REQUIRED,
        'string.email':errorMessages.EMAIL_INVALID,
    }),

    phone:Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
        'string.empty':errorMessages.PHONE_REQUIRED,
        'string.pattern.base':errorMessages.PHONE_INVALID,
    }),

    password: Joi.string()
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/)
    .required()
    .messages({
        'string.empty':errorMessages.PASSWORD_REQUIRED,
        'string.pattern.base':errorMessages.PASSWORD_INVALID,
    }),

    confirmPassword: Joi.any()
    .valid(Joi.ref('password'))
    .required()
    .messages({
        'any.only':errorMessages.CONFIRM_PASSWORD_MISMATCH,
        'any.required':errorMessages.CONFIRM_PASSWORD_REQUIRED,
    }),
});




export const signinValidation = Joi.object({
    email: Joi.string()
    .email()
    .required()
    .messages({
        'string.empty':errorMessages.EMAIL_REQUIRED,
        'string.email':errorMessages.EMAIL_INVALID,
    }),

    password: Joi.string()
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/)
    .required()
    .messages({
        'string.empty':errorMessages.PASSWORD_REQUIRED,
        'string.pattern.base':errorMessages.PASSWORD_INVALID,
    }),
});