import Category from "../models/categorySchema.js";

/**
 * Fetches categories and creates a lookup map
 * @param {Array} categoryIds - Array of category IDs
 * @returns {Object} Map of categoryId -> category object
 */
export const getCategoryMap = async (categoryIds) => {
    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
    const categoryMap = {};
    categories.forEach(cat => {
        categoryMap[cat._id.toString()] = cat;
    });
    return categoryMap;
};

/**
 * Validates if a cart item is available (product, variant, and category are listed)
 * @param {Object} item - Cart item with populated productId and productVariantId
 * @param {Object} categoryMap - Map of categories
 * @returns {Object} { isValid, isOutOfStock, invalidReason }
 */
export const validateCartItem = (item, categoryMap) => {
    const product = item.productId;
    const variant = item.productVariantId;
    const category = product?.categoryId ? categoryMap[product.categoryId.toString()] : null;

    const isProductBlocked = !product?.isListed;
    const isVariantBlocked = !variant?.isListed;
    const isCategoryBlocked = !category?.isListed;
    const isOutOfStock = (variant?.stock || 0) === 0;

    const isInvalid = isProductBlocked || isVariantBlocked || isCategoryBlocked;

    let invalidReason = null;
    if (isInvalid) {
        if (isProductBlocked) {
            invalidReason = 'Product is no longer available';
        } else if (isCategoryBlocked) {
            invalidReason = 'Category is no longer available';
        } else if (isVariantBlocked) {
            invalidReason = 'This variant is no longer available';
        }
    }

    return {
        isValid: !isInvalid,
        isOutOfStock,
        invalidReason
    };
};

/**
 * Filters cart items to only include valid ones
 * @param {Array} items - Cart items
 * @param {Object} categoryMap - Map of categories
 * @returns {Array} Valid items only
 */
export const filterValidItems = (items, categoryMap) => {
    return items.filter(item => {
        const product = item.productId;
        const variant = item.productVariantId;
        const category = product?.categoryId ? categoryMap[product.categoryId.toString()] : null;
        
        const isProductBlocked = !product?.isListed;
        const isVariantBlocked = !variant?.isListed;
        const isCategoryBlocked = !category?.isListed;
        
        return !isProductBlocked && !isVariantBlocked && !isCategoryBlocked;
    });
};

/**
 * Calculates subtotal from valid cart items
 * @param {Array} items - Cart items
 * @returns {Number} Subtotal amount
 */
export const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => {
        const price = item.discountedPriceAtTime > 0 
            ? item.discountedPriceAtTime 
            : item.priceAtTime;
        return sum + (price * item.quantity);
    }, 0);
};

/**
 * Checks if cart can proceed to checkout
 * @param {Array} items - Cart items with populated variants
 * @param {Object} categoryMap - Map of categories
 * @returns {Object} { canCheckout, hasInvalidItems }
 */
export const checkCartStatus = (items, categoryMap) => {
    let hasInvalidItems = false;
    let canCheckout = true;

    items.forEach(item => {
        const validation = validateCartItem(item, categoryMap);
        const isOutOfStock = (item.productVariantId?.stock || 0) === 0;

        if (!validation.isValid) {
            hasInvalidItems = true;
        }

        if (isOutOfStock || !validation.isValid) {
            canCheckout = false;
        }
    });

    return { canCheckout, hasInvalidItems };
};

/**
 * Gets complete cart summary with validation
 * @param {Array} items - Cart items with populated data
 * @returns {Object} { validItems, subtotal, validItemsCount, hasInvalidItems, canCheckout }
 */
export const getCartSummary = async (items) => {
    if (items.length === 0) {
        return {
            validItems: [],
            subtotal: 0,
            validItemsCount: 0,
            hasInvalidItems: false,
            canCheckout: true
        };
    }

    const categoryIds = items.map(item => item.productId?.categoryId).filter(Boolean);
    const categoryMap = await getCategoryMap(categoryIds);
    
    const validItems = filterValidItems(items, categoryMap);
    const subtotal = calculateSubtotal(validItems);
    const { canCheckout, hasInvalidItems } = checkCartStatus(items, categoryMap);

    return {
        validItems,
        subtotal,
        validItemsCount: validItems.length,
        hasInvalidItems,
        canCheckout
    };
};

/**
 * Enriches cart items with validation status and display data
 * @param {Array} items - Raw cart items
 * @param {Object} categoryMap - Map of categories
 * @returns {Array} Enriched items with all display properties
 */
export const enrichCartItems = (items, categoryMap) => {
    return items.map(item => {
        const product = item.productId;
        const variant = item.productVariantId;
        const validation = validateCartItem(item, categoryMap);
        
        const isLowStock = (variant?.stock || 0) > 0 && 
                          (variant?.stock || 0) < item.quantity;

        return {
            productId: product?._id,
            productVariantId: variant?._id,
            productName: product?.name || 'Unknown Product',
            productImage: product?.coverImage?.url || 
                         variant?.images?.[0]?.url || 
                         '/images/placeholder.jpg',
            color: variant?.color,
            size: variant?.size,
            quantity: item.quantity,
            currentStock: variant?.stock || 0,
            priceAtTime: item.priceAtTime,
            discountedPriceAtTime: item.discountedPriceAtTime || 0,
            isOutOfStock: validation.isOutOfStock,
            isLowStock,
            isInvalid: !validation.isValid,
            invalidReason: validation.invalidReason
        };
    });
};