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
    .pattern(/^[6-9][0-9]{9}$/)
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

    referralCode: Joi.string()
    .trim()
    .allow('', null)
    .optional()
    .messages({
        'string.base': 'Referral code must be a string'
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


export const editProfileValidation = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(30)
        .pattern(/^[A-za-z\s]+$/i)
        .required()
        .messages({
            'string.empty': errorMessages.NAME_REQUIRED,
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name must not exceed 30 characters',
            'string.pattern.base': errorMessages.NAME_INVALID
        }),
    
    email: Joi.string()
        .required()
        .messages({
            'string.empty': errorMessages.EMAIL_REQUIRED,
            'string.email': errorMessages.EMAIL_INVALID,
        }),

    phone: Joi.string()
        .pattern(/^[6-9][0-9]{9}$/)
        .required()
        .messages({
            'string.empty': errorMessages.PHONE_REQUIRED,
            'string.pattern.base': errorMessages.PHONE_INVALID,
     }),
});


export const addAddressValidation = Joi.object({
    addressType: Joi.string()
        .valid('Home', 'Work', 'Other')
        .required()
        .messages({
            'any.only': errorMessages.ADDRESS_TYPE_INVALID,
            'string.empty': errorMessages.ADDRESS_TYPE_REQUIRED,
            'any.required': errorMessages.ADDRESS_TYPE_REQUIRED
        }),

    fullName: Joi.string()
        .trim()
        .min(3)
        .max(50)
        .pattern(/^[a-zA-Z\s]+$/)
        .required()
        .messages({
            'string.empty': errorMessages.ADDRESS_FULLNAME_REQUIRED,
            'string.min': errorMessages.ADDRESS_FULLNAME_MIN,
            'string.max': errorMessages.ADDRESS_FULLNAME_MAX,
            'string.pattern.base': errorMessages.ADDRESS_FULLNAME_PATTERN,
            'any.required': errorMessages.ADDRESS_FULLNAME_REQUIRED
        }),

    phone: Joi.string()
        .trim()
        .pattern(/^[6-9][0-9]{9}$/)
        .required()
        .messages({
            'string.empty': errorMessages.ADDRESS_PHONE_REQUIRED,
            'string.pattern.base': errorMessages.ADDRESS_PHONE_INVALID,
            'any.required': errorMessages.ADDRESS_PHONE_REQUIRED
        }),

    alternatePhone: Joi.string()
        .trim()
        .pattern(/^[6-9][0-9]{9}$/)
        .allow('')
        .optional()
        .messages({
            'string.pattern.base': errorMessages.ADDRESS_ALTERNATE_PHONE_INVALID
        }),

    addressLine1: Joi.string()
        .trim()
        .min(5)
        .max(100)
        .required()
        .messages({
            'string.empty': errorMessages.ADDRESS_LINE1_REQUIRED,
            'string.min': errorMessages.ADDRESS_LINE1_MIN,
            'string.max': errorMessages.ADDRESS_LINE1_MAX,
            'any.required': errorMessages.ADDRESS_LINE1_REQUIRED
        }),

    addressLine2: Joi.string()
        .trim()
        .max(100)
        .allow('')
        .optional()
        .messages({
            'string.max': errorMessages.ADDRESS_LINE2_MAX
        }),

    city: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s]+$/)
        .required()
        .messages({
            'string.empty': errorMessages.ADDRESS_CITY_REQUIRED,
            'string.min': errorMessages.ADDRESS_CITY_MIN,
            'string.max': errorMessages.ADDRESS_CITY_MAX,
            'string.pattern.base': errorMessages.ADDRESS_CITY_PATTERN,
            'any.required': errorMessages.ADDRESS_CITY_REQUIRED
        }),

    state: Joi.string()
        .trim()
        .required()
        .messages({
            'string.empty': errorMessages.ADDRESS_STATE_REQUIRED,
            'any.required': errorMessages.ADDRESS_STATE_REQUIRED
        }),

    pincode: Joi.string()
        .trim()
        .pattern(/^[1-9][0-9]{5}$/)
        .required()
        .messages({
            'string.empty': errorMessages.ADDRESS_PINCODE_REQUIRED,
            'string.pattern.base': errorMessages.ADDRESS_PINCODE_INVALID,
            'any.required': errorMessages.ADDRESS_PINCODE_REQUIRED
        }),

    country: Joi.string().default('India'),

    isDefault: Joi.boolean().default(false)
});
