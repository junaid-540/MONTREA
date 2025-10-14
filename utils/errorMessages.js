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
};

export default errorMessages;