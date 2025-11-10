import Joi from "joi";
import errorMessages from "../utils/errorMessages.js";

// auth //

export const loginValidation = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.empty': errorMessages.EMAIL_REQUIRED,
            'string.email': errorMessages.EMAIL_INVALID,
        }),

    password: Joi.string()
        .pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/)
        .required()
        .messages({
            'string.empty': errorMessages.PASSWORD_REQUIRED,
            'string.pattern.base': errorMessages.PASSWORD_INVALID,
        }),
});


// Add Category //

export const addCategoryValidation = Joi.object({
    name: Joi.string()
        .trim()
        .pattern(/^[A-Za-z\s\-]+$/)
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.empty': errorMessages.CATEGORY_NAME_REQUIRED,
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


// Edit Category //

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



// Add Product //


export const addProductValidation = Joi.object({
    name: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .pattern(/^[A-Za-z0-9\s\-\&']+$/)
        .required()
        .messages({
            'string.empty': errorMessages.PRODUCT_NAME_REQUIRED || 'Product name is required',
            'string.min': errorMessages.PRODUCT_NAME_MIN || 'Product name must be at least 3 characters',
            'string.max': errorMessages.PRODUCT_NAME_MAX || 'Product name must not exceed 100 characters',
            'string.pattern.base': errorMessages.PRODUCT_NAME_PATTERN || 'Product name contains invalid characters',
        }),

    description: Joi.string()
        .trim()
        .min(10)
        .max(2000)
        .required()
        .messages({
            'string.empty': errorMessages.PRODUCT_DESCRIPTION_REQUIRED || 'Description is required',
            'string.min': errorMessages.PRODUCT_DESCRIPTION_MIN || 'Description must be at least 10 characters',
            'string.max': errorMessages.PRODUCT_DESCRIPTION_MAX || 'Description must not exceed 2000 characters',
        }),

    categoryId: Joi.string()
        .trim()
        .required()
        .messages({
            'string.empty': errorMessages.PRODUCT_CATEGORY_REQUIRED || 'Category is required',
        }),

    highlights: Joi.string()
        .trim()
        .allow('')
        .optional(),

    // Variants is a JSON string containing array of variant objects
    variants: Joi.string()
        .required()
        .custom((value, helpers) => {
            try {
                const parsed = JSON.parse(value);
                
                if (!Array.isArray(parsed)) {
                    return helpers.error('any.invalid');
                }

                if (parsed.length === 0) {
                    return helpers.error('array.min');
                }

                // Validate each variant
                for (let i = 0; i < parsed.length; i++) {
                    const variant = parsed[i];

                    // Validate color
                    if (!variant.color || typeof variant.color !== 'string') {
                        return helpers.error('string.base', { path: `variants[${i}].color` });
                    }
                    if (variant.color.trim().length < 3 || variant.color.trim().length > 20) {
                        return helpers.error('string.length', { path: `variants[${i}].color` });
                    }

                    // Validate size
                    if (!variant.size || !['S', 'M', 'L', 'XL'].includes(variant.size)) {
                        return helpers.error('any.only', { path: `variants[${i}].size` });
                    }

                    // Validate price
                    const price = Number(variant.price);
                    if (isNaN(price) || price <= 0) {
                        return helpers.error('number.positive', { path: `variants[${i}].price` });
                    }

                    // Validate discounted price (optional)
                    if (variant.discountedPrice !== undefined && variant.discountedPrice !== null && variant.discountedPrice !== '') {
                        const discountPrice = Number(variant.discountedPrice);
                        if (isNaN(discountPrice) || discountPrice < 0) {
                            return helpers.error('number.min', { path: `variants[${i}].discountedPrice` });
                        }
                        if (discountPrice >= price) {
                            return helpers.error('number.less', { path: `variants[${i}].discountedPrice` });
                        }
                    }

                    // Validate stock
                    const stock = Number(variant.stock);
                    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
                        return helpers.error('number.integer', { path: `variants[${i}].stock` });
                    }
                }

                return value;
            } catch (e) {
                return helpers.error('string.invalid');
            }
        })
        .messages({
            'string.empty': 'Variants data is required',
            'string.invalid': 'Invalid variants data format',
            'any.invalid': 'Variants must be an array',
            'array.min': 'At least one variant is required',
            'string.base': 'Variant color must be a string',
            'string.length': 'Variant color must be between 3 and 20 characters',
            'any.only': 'Variant size must be S, M, L, or XL',
            'number.positive': 'Variant price must be greater than 0',
            'number.min': 'Discounted price must be 0 or more',
            'number.less': 'Discounted price must be less than regular price',
            'number.integer': 'Stock must be a whole number 0 or more',
        })
})


export const addVariantValidation = Joi.object({
    color: Joi.string()
        .trim()
        .min(3)
        .max(20)
        .pattern(/^[A-Za-z\s]+$/)
        .required()
        .messages({
            'string.empty': errorMessages.VARIANT_COLOR_REQUIRED || 'Color is required',
            'string.pattern.base': errorMessages.VARIANT_COLOR_PATTERN || 'Color can only contain letters and spaces',
            "string.min": errorMessages.VARIANT_COLOR_LENGTH || 'Color must be between 3-20 characters',
            "string.max": errorMessages.VARIANT_COLOR_LENGTH || 'Color must be between 3-20 characters',
            "any.required": errorMessages.VARIANT_COLOR_REQUIRED || 'Color is required',
        }),

    size: Joi.string()
        .trim()
        .valid("S", "M", "L", "XL")
        .required()
        .messages({
            "any.only": errorMessages.VARIANT_SIZE_INVALID || 'Size must be S, M, L, or XL',
            "string.empty": errorMessages.VARIANT_SIZE_REQUIRED || 'Size is required',
            "any.required": errorMessages.VARIANT_SIZE_REQUIRED || 'Size is required',
        }),
    
    price: Joi.number()
        .positive()
        .required()
        .messages({
            "number.base": errorMessages.VARIANT_PRICE_REQUIRED || 'Price is required', 
            "number.positive": errorMessages.VARIANT_PRICE_MIN || 'Price must be greater than 0',
            "any.required": errorMessages.VARIANT_PRICE_REQUIRED || 'Price is required',
        }),

    discountedPrice: Joi.number()
        .min(0)
        .optional()
        .less(Joi.ref("price"))
        .messages({
            "number.base": errorMessages.VARIANT_DISCOUNT_PRICE_INVALID || 'Invalid discount price',
            "number.min": errorMessages.VARIANT_DISCOUNT_PRICE_MIN || 'Discount price must be 0 or more',
            "number.less": 'Discount price must be less than regular price',
        }),

    stock: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            "number.base": errorMessages.VARIANT_STOCK_REQUIRED || 'Stock is required',
            "number.min": errorMessages.VARIANT_STOCK_MIN || 'Stock must be 0 or more',
            "number.integer": 'Stock must be a whole number',
            "any.required": errorMessages.VARIANT_STOCK_REQUIRED || 'Stock is required',
        }),

    images: Joi.array()
        .items(
            Joi.object({
                url: Joi.string().uri().required(),
                public_id: Joi.string().required(),
            })
        )
        .length(3)
        .required()
        .messages({
            "array.base": errorMessages.VARIANT_IMAGES_REQUIRED || 'Images are required',
            "array.length": errorMessages.VARIANT_IMAGES_COUNT || 'Exactly 3 images are required',
            "any.required": errorMessages.VARIANT_IMAGES_REQUIRED || 'Images are required',
        }),
})