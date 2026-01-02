const errorMessages = {
    // General //
    INTERNAL_SERVER_ERROR: "Something went wrong. Please try again later.",
    INVALID_REQUEST: "Invalid request data.",

    // User //
    USER_NOT_FOUND: "User not found.",
    EMAIL_ALREADY_REGISTERED: "Email is already registered.",
    INVALID_CREDENTIALS: "Invalid email or password.",
    ACCOUNT_BLOCKED: "Your account has been blocked.",
    SESSION_EXPIRED: "Session expired. Please log in again.",
    OTP_SENT: "OTP has been sent to your phone/email.",
    OTP_INVALID: "Invalid OTP entered.",
    OTP_EXPIRED: "OTP has expired. Please request a new one.",


    // User validation messages for Joi
    NAME_REQUIRED: "Name is required.",
    NAME_INVALID: "Name must contain letters only, 2-30 characters.",
    EMAIL_REQUIRED: "Email is required.",
    EMAIL_INVALID: "Please enter a valid email address.",
    EMAIL_NOT_REGISTERED: "Email not registered.",
    PHONE_REQUIRED: "Phone number is required.",
    PHONE_INVALID: "Please enter a valid 10-digit phone number.",
    PASSWORD_REQUIRED: "Password is required.",
    INVALID_PASSWORD: "Incorrect password.",
    PASSWORD_INVALID: "Password must include letters and numbers only, min 6 chars.",
    CONFIRM_PASSWORD_REQUIRED: "Please confirm your password.",
    CONFIRM_PASSWORD_MISMATCH: "Passwords do not match.",
    OTP_NOT_FOUND: "OTP expired or not found. Please resend OTP.",

    // Admin //
    ADMIN_NOT_FOUND: "Admin not found.",
    UNAUTHORIZED_ADMIN: "You are not authorized to access this resource.",
    INACTIVE_ADMIN: "Your admin account is inactive. Please contact support.",

    // Product / Category //
    PRODUCT_NOT_FOUND: "Product not found.",
    PRODUCT_ALREADY_EXISTS: "Product already exists.",
    CATEGORY_NOT_FOUND: "Category not found.",
    OUT_OF_STOCK: "Product is out of stock.",
    PRODUCT_UPDATED_SUCCESS: "Product updated successfully.",
    PRODUCT_CREATED: "Product created successfully",
    // CATEGORY_UPDATED_SUCCESS: "Category updated successfully.",

    // Pagination & Query
    NO_DATA_FOUND: "No records found.",
    INVALID_PAGE_NUMBER: "Invalid page number.",
    INVALID_LIMIT: "Invalid limit value.",


    // Customer Management
    USER_BLOCKED_SUCCESS: "User has been blocked successfully.",
    USER_UNBLOCKED_SUCCESS: "User has been unblocked successfully.",
    USER_ALREADY_BLOCKED: "User is already blocked.",
    USER_ALREADY_ACTIVE: "User is already active.",



    // Category Validation / Controller Messages
    CATEGORY_NAME_REQUIRED: "Category name is required.",
    CATEGORY_NAME_INVALID: "Category name must be at least 3 characters.",
    CATEGORY_NAME_PATTERN: "Category name can only contain letters, spaces, and hyphens.",
    CATEGORY_NAME_LIMIT: "Name must be at most 30 characters.",
    CATEGORY_DESCRIPTION_REQUIRED: "Category description is required.",
    CATEGORY_DESCRIPTION_INVALID: "Category description must be at least 10 characters.",
    CATEGORY_DESCRIPTION_LIMIT: "Description must be at most 250 characters.",
    CATEGORY_ALREADY_EXISTS: "Category already exists.",
    CATEGORY_CREATED_SUCCESS: "Category created successfully.",
    CATEGORY_UPDATED_SUCCESS: "Category updated successfully.",
    CATEGORY_LISTED_SUCCESS: "Category has been listed successfully.",
    CATEGORY_UNLISTED_SUCCESS: "Category has been unlisted successfully.",




    PRODUCT_NAME_REQUIRED: "Product name is required",
    PRODUCT_NAME_MIN: "Product name must be at least 3 characters",
    PRODUCT_NAME_MAX: "Product name cannot exceed 100 characters",
    PRODUCT_NAME_PATTERN: "Product name can only contain letters, numbers, spaces, and hyphens",

    PRODUCT_DESCRIPTION_REQUIRED: "Description is required",
    PRODUCT_DESCRIPTION_MIN: "Description must be at least 10 characters",
    PRODUCT_DESCRIPTION_MAX: "Description cannot exceed 2000 characters",

    PRODUCT_CATEGORY_REQUIRED: "Please select a category",
    // PRODUCT_BRAND_REQUIRED: "Brand name is required",

    PRODUCT_PRICE_REQUIRED: "Price is required",
    PRODUCT_PRICE_MIN: "Price must be at least 1",
    PRODUCT_PRICE_NUMBER: "Price must be a valid number",

    PRODUCT_DISCOUNT_NUMBER: "Discount must be a valid number",
    PRODUCT_DISCOUNT_LESS: "Discount must be less than the actual price",

    PRODUCT_STOCK_REQUIRED: "Stock is required",
    PRODUCT_STOCK_NUMBER: "Stock must be a number",
    PRODUCT_STOCK_MIN: "Stock cannot be negative",

    PRODUCT_VARIANTS_ARRAY: "Variants must be a valid array",
    PRODUCT_VARIANTS_MIN: "At least one variant is required",

    VARIANT_NOT_FOUND: "Variant Not Found",

    // Color
    VARIANT_COLOR_REQUIRED: "Variant color is required.",
    VARIANT_COLOR_PATTERN: "Color should only contain letters and spaces.",
    VARIANT_COLOR_LENGTH: "Color must be between 3 and 30 characters long.",

    // Size
    VARIANT_SIZE_REQUIRED: "Variant size is required.",
    VARIANT_SIZE_INVALID: "Invalid size selected. Choose from S, M, L, XL.",

    // Price
    VARIANT_PRICE_REQUIRED: "Price is required.",
    VARIANT_PRICE_MIN: 'Price must be a number greater than 0',

    // Discount Price
    VARIANT_DISCOUNT_PRICE_MIN: "Discount price must be greater than  0.",
    VARIANT_DISCOUNT_PRICE_INVALID: "Discount price cannot exceed the original price.",

    // Stock
    VARIANT_STOCK_REQUIRED: "Stock quantity is required.",
    VARIANT_STOCK_MIN: "Stock must be greater than 0.",

    // Images
    VARIANT_IMAGES_REQUIRED: "At least one image is required for the variant.",
    VARIANT_IMAGES_COUNT: "Each variant must have exactly 3 images.",
    VARIANT_IMAGE_INVALID: "Invalid image data provided.",

    PRODUCT_IMAGES_ARRAY: "Images must be an array",
    PRODUCT_IMAGES_MIN: "At least 3 images are required",
    PRODUCT_IMAGES_REQUIRED: "Images are required",



    // Address Validation Messages
    ADDRESS_TYPE_REQUIRED: "Address type is required",
    ADDRESS_TYPE_INVALID: "Address type must be Home, Work, or Other",
    
    ADDRESS_FULLNAME_REQUIRED: "Full name is required",
    ADDRESS_FULLNAME_MIN: "Full name must be at least 3 characters",
    ADDRESS_FULLNAME_MAX: "Full name must not exceed 50 characters",
    ADDRESS_FULLNAME_PATTERN: "Full name can only contain letters and spaces",
    
    ADDRESS_PHONE_REQUIRED: "Phone number is required",
    ADDRESS_PHONE_INVALID: "Phone number must be a valid 10-digit Indian mobile number starting with 6-9",
    
    ADDRESS_ALTERNATE_PHONE_INVALID: "Alternate phone must be a valid 10-digit Indian mobile number starting with 6-9",
    
    ADDRESS_LINE1_REQUIRED: "Address Line 1 is required",
    ADDRESS_LINE1_MIN: "Address Line 1 must be at least 5 characters",
    ADDRESS_LINE1_MAX: "Address Line 1 must not exceed 100 characters",
    
    ADDRESS_LINE2_MAX: "Address Line 2 must not exceed 100 characters",
    
    ADDRESS_CITY_REQUIRED: "City is required",
    ADDRESS_CITY_MIN: "City must be at least 2 characters",
    ADDRESS_CITY_MAX: "City must not exceed 50 characters",
    ADDRESS_CITY_PATTERN: "City can only contain letters and spaces",
    
    ADDRESS_STATE_REQUIRED: "State is required",
    
    ADDRESS_PINCODE_REQUIRED: "Pincode is required",
    ADDRESS_PINCODE_INVALID: "Pincode must be a valid 6-digit Indian pincode",
    
    ADDRESS_COUNTRY_REQUIRED: "Country is required",
    
    // Address Success Messages
    ADDRESS_ADDED_SUCCESS: "Address added successfully",
    ADDRESS_UPDATED_SUCCESS: "Address updated successfully",
    ADDRESS_DELETED_SUCCESS: "Address deleted successfully",
    ADDRESS_NOT_FOUND: "Address not found",
    ADDRESS_SET_DEFAULT_SUCCESS: "Default address updated successfully",
    ADDRESS_ALREADY_DEFAULT: "This address is already set as default",




    // Common success & info messages
    SUCCESS: "Operation completed successfully.",
    UPDATED_SUCCESS: "Record updated successfully.",
    DELETED_SUCCESS: "Record deleted successfully.",
    CREATED_SUCCESS: "Record created successfully.",

    // Order //
    ORDER_NOT_FOUND: "Order not found.",
    PAYMENT_FAILED: "Payment could not be processed. Please try again.",

    // Cart & Wishlist
    ITEM_NOT_IN_CART: "Item not found in your cart.",
    ITEM_ALREADY_IN_WISHLIST: "Item already exists in your wishlist.",

    // Coupon //
    COUPON_INVALID: "Coupon code is invalid.",
    COUPON_EXPIRED: "Coupon has expired.",
    COUPON_ALREADY_USED: "You have already used this coupon.",

    //Generic Validation //
    MISSING_REQUIRED_FIELDS: "Required fields are missing.",
    INVALID_ID: "Invalid ID format.",
};

export default errorMessages;