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