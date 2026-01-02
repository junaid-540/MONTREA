import Category from "../models/categorySchema.js";
import ProductVariant from "../models/productVariantSchema.js";


export const getCategoryMap = async (categoryIds) => {
    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
    const categoryMap = {};
    categories.forEach(cat => {
        categoryMap[cat._id.toString()] = cat;
    });
    return categoryMap;
};



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


export const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => {
        const price = item.discountedPriceAtTime > 0 
            ? item.discountedPriceAtTime 
            : item.priceAtTime;
        return sum + (price * item.quantity);
    }, 0);
};


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
            productImage:  variant?.images?.[0]?.url|| product?.coverImage?.url || '/images/placeholder.jpg',
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



export const adjustCartQuantitiesToStock = async (cartItems) => {
    const adjustedItems = [];
    let hasStockChanges = false;
    
    for (const item of cartItems) {
        const variant = item.productVariantId?._id 
            ? item.productVariantId : await ProductVariant.findById(item.productVariantId);
        
        if (!variant) {
            // Item is invalid, keep as is
            adjustedItems.push(item);
            continue;
        }
        
        const currentStock = variant.stock || 0;
        const cartQuantity = item.quantity || 0;
        
        if (currentStock === 0) {
            item.isOutOfStock = true;
            item.invalidReason = 'Out of Stock';
            adjustedItems.push(item);
            hasStockChanges = true;
        } else if (currentStock < cartQuantity) {
            // Stock reduced - adjust quantity
            item.quantity = currentStock;
            item.wasAdjusted = true;
            item.previousQuantity = cartQuantity;
            item.adjustmentReason = `Stock reduced to ${currentStock}`;
            adjustedItems.push(item);
            hasStockChanges = true;
        } else {
            // No changes needed
            adjustedItems.push(item);
        }
    }
    
    return {
        adjustedItems,
        hasStockChanges
    };
};