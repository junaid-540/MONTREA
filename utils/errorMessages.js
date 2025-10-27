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
    OTP_NOT_FOUND: "OTP not found or expired. Please resend OTP.",

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