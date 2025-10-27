

const statusCodes = {
    // Success

    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,


    // Client Errors

    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    METHOD_NOT_ALLOWED: 405,
    REQUEST_TIMEOUT: 408,
    TOO_MANY_REQUESTS: 429,


    // Server Errors

    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    BAD_GATEWAY: 502,
    GATEWAY_TIMEOUT: 504,
};

export default statusCodes;
