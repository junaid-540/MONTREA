import Cart from "../../models/cartSchema.js";
import Product from "../../models/productSchema.js";
import ProductVariant from "../../models/productVariantSchema.js";
import Category from "../../models/categorySchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";

export const getCartPage = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.redirect('/signin');
        }

        let cart = await Cart.findOne({ userId })
            .populate('items.productId', 'name coverImage isListed categoryId')
            .populate('items.productVariantId', 'color size stock images price discountedPrice isListed');

        if (!cart || cart.items.length === 0) {

            const messages = req.session.messages || [];
            delete req.session.messages

            return res.render('user/cart', {
                Title: 'Shopping Cart',
                cart: { items: [], subtotal: 0, itemsCount: 0 },
                hasInvalidItems: false,
                canCheckout: true,
                messages,
                pageCss: '/public/css/user/cart.css',
            });
        }

        const categoryIds = cart.items.map(item => item.productId?.categoryId).filter(Boolean);

        // get all categories in one query
        const categories = await Category.find({ _id: { $in: categoryIds } }).lean();

        // Create a map for quick category lookup
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat._id.toString()] = cat;
        });

        let hasInvalidItems = false;
        let canCheckout = true;
        const enrichedItems = [];

        for (const item of cart.items) {
            const product = item.productId;
            const variant = item.productVariantId;

            const category = product?.categoryId ? categoryMap[product.categoryId.toString()] : null; // gettin the category for this product

            // flags
            const isProductBlocked = !product?.isListed;
            const isVariantBlocked = !variant?.isListed;
            const isCategoryBlocked = !category?.isListed;
            const isOutOfStock = (variant?.stock || 0) === 0;
            const isLowStock = (variant?.stock || 0) > 0 && (variant?.stock || 0) < item.quantity;

            // item is invalid if is blocked
            const isInvalid = isProductBlocked || isVariantBlocked || isCategoryBlocked;

            // setting flags
            if (isInvalid) {
                hasInvalidItems = true;
            }

            if (isOutOfStock || isInvalid) {
                canCheckout = false;
            }

            // reason for invalidity
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

            enrichedItems.push({
                productId: product?._id,
                productVariantId: variant?._id,
                productName: product?.name || 'Unknown Product',
                productImage: product?.coverImage?.url || variant?.images?.[0]?.url || '/images/placeholder.jpg',
                color: variant?.color,
                size: variant?.size,
                quantity: item.quantity,
                currentStock: variant?.stock || 0,
                priceAtTime: item.priceAtTime,
                discountedPriceAtTime: item.discountedPriceAtTime || 0,
                isOutOfStock,
                isLowStock,
                isInvalid,
                invalidReason
            });
        }

        const validItems = enrichedItems.filter(item => !item.isInvalid);
        const subtotal = validItems.reduce((sum, item) => {
            const price = item.discountedPriceAtTime > 0 ? item.discountedPriceAtTime : item.priceAtTime;
            return sum + (price * item.quantity);
        }, 0);

        const messages = req.session.messages || [];
        delete req.session.messages

        res.render('user/cart', {
            Title: 'Shopping Cart',
            cart: {
                items: enrichedItems,
                subtotal: subtotal,
                itemsCount: validItems.length,
                totalItems: enrichedItems.length
            },
            hasInvalidItems,
            canCheckout,
            messages,
            user: res.locals.user || null,
            pageCss: '/public/css/user/cart.css',
            pageJs: '/public/js/user/cart.js'
        });

    } catch (err) {
        console.error("Error in getCartPage:", err);
        next(err);
    }
};


export const clearInvalidItems = async (req, res, next) => {
    try {

        const userId = req.session.userId
        if (!userId) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.UNAUTHORIZED,
                message: 'Please sign in to manage your cart.'
            });
        }

        const cart = await Cart.findOne({ userId })
            .populate('items.productId', 'isListed categoryId')
            .populate('items.productVariantId', 'isListed stock price discountedPrice');

        if (!cart || cart.items.length === 0) {
            return sendResponse(res, { success: true, statusCode: statusCodes.OK, message: 'Cart is already empty—no items to clear.' });
        }

        const cartLength = cart.items.length

        // getting all category ids
        const categoryIds = cart.items.map(item => item.productId?.categoryId).filter(Boolean);
        const categories = await Category.find({ _id: categoryIds }).lean();

        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat._id.toString()] = cat;
        });

        //filtering valid items 
        const validItems = cart.items.filter(item => {
            const product = item.productId;
            const variant = item.productVariantId;
            const category = product?.categoryId ? categoryMap[product.categoryId.toString()] : null;
            const isProductBlocked = !product?.isListed;
            const isVariantBlocked = !variant?.isListed;
            const isCategoryBlocked = !category?.isListed;
            //keep only valid items
            return !isProductBlocked && !isVariantBlocked && !isCategoryBlocked;
        });

        cart.items = validItems;
        const clearedCount = cartLength - validItems.length;
        await cart.save();


        const subtotal = validItems.reduce((sum, item) => {
            const price = item.discountedPriceAtTime > 0 ? item.discountedPriceAtTime : item.priceAtTime;
            return sum + (price * item.quantity);
        }, 0);

        let canCheckout = true;
        validItems.forEach(item => {
            const isOutOfStock = (item.productVariantId?.stock || 0) === 0;
            if (isOutOfStock) canCheckout = false;
        });


        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: `Successfully cleared ${clearedCount} Invalid items from your cart.`,
            data: {
                itemsCount: validItems.length,
                subtotal: subtotal,
                hasInvalidItems: false,
                canCheckout: canCheckout,
                isEmpty: validItems.length === 0
            }
        })
    } catch (err) {
        console.error("Error in clearInvalidItems :", err);
        next(err)
    }
};

const MAX_QUANTITY_PER_PRODUCT = 5;

export const addToCart = async (req, res, next) => {
    try {
        const userId = req.session.userId
        if (!userId) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.UNAUTHORIZED,
                message: 'Please login to add items to cart',
                redirectTo: '/signin'
            });
        }

        const { productId, productVariantId, quantity = 1 } = req.body;

        if (!productId || !productVariantId) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Product and varinat are required' });
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Invalid quantity' });
        }

        if (qty > MAX_QUANTITY_PER_PRODUCT) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: `Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product` });
        }

        const product = await Product.findById(productId).populate('categoryId');
        if (!product) {
            return sendResponse(res, { success: false, statusCode: statusCodes.NOT_FOUND, message: errorMessages.PRODUCT_NOT_FOUND })
        }

        if (!product.isListed) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: 'This product is currently unavailable' });
        }

        if (!product.categoryId || !product.categoryId.isListed) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: 'This product category is currently unavailable' });
        }

        const variant = await ProductVariant.findById(productVariantId)
        if (!variant) {
            return sendResponse(res, { success: false, statusCode: statusCodes.NOT_FOUND, message: 'Product variant not found' });
        }
        if (!variant.isListed) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: 'This product variant is currently unavailable' });
        }

        if (variant.productId.toString() !== productId) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Invalid product variant' });
        }

        if (variant.stock === 0) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: 'This product is out of stock' });
        }

        if (variant.stock < qty) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: `Only ${variant.stock} items available in stock` });
        }
        let cart = await Cart.findOne({ userId })
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(
            item => item.productVariantId.toString() === productVariantId
        );

        if (existingItemIndex > -1) {
            const existingItem = cart.items[existingItemIndex];
            const newQuantity = existingItem.quantity + qty

            if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
                return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: `Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product. You already have ${existingItem.quantity} in cart.` })
            }
        } else {
            cart.items.push({
                productId,
                productVariantId,
                quantity: qty,
                priceAtTime: variant.price,
                discountedPriceAtTime: variant.discountedPrice || 0
            });
        }

        await cart.save()

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: existingItemIndex > -1 ? 'Cart updated successfully' : 'Product added to cart',
            data: {
                productName: product.name,
                variantDetails: {
                    color: variant.color,
                    size: variant.size
                },
                quantity: existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : qty,
                cartItemscount: cart.items.length
            }
        })
    } catch (err) {
        console.error("Error in addToCart :", err)
        next(err)
    }
}

// to check if the variant is already in cart
export const checkVariantInCart = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return sendResponse(res, { success: false, statusCode: statusCodes.OK, data: { inCart: false } });
        }

        const { variantId } = req.params;
        if (!variantId) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Variant ID is required' });
        }

        const cart = await Cart.findOne({ userId })
        if (!cart) {
            return sendResponse(res, { success: false, statusCode: statusCodes.OK, data: { inCart: false } });
        }

        const itemInCart = cart.items.find(
            item => item.productVariantId.toString() === variantId
        );

        if (itemInCart) {
            return sendResponse(res, {
                success: true,
                statusCode: statusCodes.OK,
                data: {
                    inCart: true,
                    quantity: itemInCart.quantity,
                    maxQuantity: MAX_QUANTITY_PER_PRODUCT
                }
            });
        }

        return sendResponse(res, { success: true, statusCode: statusCodes.OK, data: { inCart: false } });
    } catch (err) {
        console.error("Error in checkVariantInCart :", err);
        next(err)
    }
}


export const updateCartQuantity = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.redirect('/signin');
        }

        console.log('📝 Update Cart - Request received:', req.body);
        const { productVariantId, quantity } = req.body

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Invalid quantity' });
        }

        if (qty > MAX_QUANTITY_PER_PRODUCT) {
            console.log('❌ Update Cart - Quantity exceeds max:', qty);
            return sendResponse(res, { success: false, statusCode: statusCodes.NOT_FOUND, message: `Maximum ${MAX_QUANTITY_PER_PRODUCT} items allowed per product` });
        }

        const cart = await Cart.findOne({ userId })
            .populate('items.productId', 'isListed categoryId')
            .populate('items.productVariantId', 'isListed stock price discountedPrice');

        if (!cart) {
            console.log('❌ Update Cart - Cart not found for user:', userId);
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item.productVariantId._id.toString() === productVariantId);

        if (itemIndex === -1) {
            console.log('❌ Update Cart - Item not found in cart:', productVariantId);
            return sendResponse(res, { success: false, statusCode: statusCodes.NOT_FOUND, message: 'Item not found in cart' });
        }

        const variant = cart.items[itemIndex].productVariantId;
        if (!variant) {
            console.log('❌ Update Cart - Variant not found:', productVariantId);
            return sendResponse(res, { success: false, statusCode: statusCodes.NOT_FOUND, message: 'Product variant not found' });
        }

        if (qty > variant.stock) {
            console.log('❌ Update Cart - Requested qty exceeds stock:', { qty, stock: variant.stock });
            return sendResponse(res, { success: false, statusCode: statusCodes.BAD_REQUEST, message: `Only ${variant.stock} items available in stock` });
        }

        const oldQuantity = cart.items[itemIndex].quantity;
        cart.items[itemIndex].quantity = qty;
        cart.items[itemIndex].priceAtTime = variant.price;
        cart.items[itemIndex].discountedPriceAtTime = variant.discountedPrice || 0;

        await cart.save();

        //  NEW: Calculate updated cart totals
        const categoryIds = cart.items.map(item => item.productId?.categoryId).filter(Boolean);
        const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
        const categoryMap = {};
        categories.forEach(cat => {
            categoryMap[cat._id.toString()] = cat;
        });

        const validItems = cart.items.filter(item => {
            const product = item.productId;
            const variant = item.productVariantId;
            const category = product?.categoryId ? categoryMap[product.categoryId.toString()] : null;
            const isProductBlocked = !product?.isListed;
            const isVariantBlocked = !variant?.isListed;
            const isCategoryBlocked = !category?.isListed;
            return !isProductBlocked && !isVariantBlocked && !isCategoryBlocked;
        });

        const subtotal = validItems.reduce((sum, item) => {
            const price = item.discountedPriceAtTime > 0 ? item.discountedPriceAtTime : item.priceAtTime;
            return sum + (price * item.quantity);
        }, 0);

        const maxQty = Math.min(MAX_QUANTITY_PER_PRODUCT, variant.stock);

        console.log(' Update Cart - Success:', {
            oldQuantity,
            newQuantity: qty,
            variantId: productVariantId
        });


        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: 'Cart Updated successfully',
            data: {
                quantity: qty,
                itemsCount: validItems.length,
                totalItems: cart.items.length,
                subtotal: subtotal,
                maxQty: maxQty
            }
        });
    } catch (err) {
        console.error("Error in updateCartQuantity :", err);
        next(err)
    }
}


export const removeFromCart = async (req, res, next) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.UNAUTHORIZED,
                message: 'Please signin to manage your cart'
            });
        }

        console.log("🛒 Remove from cart - Request body:", req.body);
        const { productVariantId } = req.body;

        if (!productVariantId) {
            console.log("❌ Remove from cart - Variant ID missing");
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Product variant ID is required'
            });
        }

        const cart = await Cart.findOne({ userId })
            .populate('items.productId', 'isListed categoryId')
            .populate('items.productVariantId', 'isListed stock price discountedPrice');

        if (!cart || cart.items.length === 0) {
            console.log("❌ Remove from cart - Cart not found or empty");
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Cart is empty'
            });
        }

        console.log("🛒 Remove from cart - Items before removal:", cart.items.length);
        const originalCount = cart.items.length;

        cart.items = cart.items.filter(item => item.productVariantId._id.toString() !== productVariantId);

        console.log("🛒 Remove from cart - Items after removal:", cart.items.length);

        if (originalCount === cart.items.length) {
            console.log("❌ Remove from cart - Item not found:", productVariantId);
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Item not found in cart'
            });
        }

        await cart.save();
        console.log(" Remove from cart - Successfully removed item");

        //  NEW: Calculate updated cart totals
        let subtotal = 0;
        let validItemsCount = 0;
        let hasInvalidItems = false;
        let canCheckout = true;

        if (cart.items.length > 0) {
            const categoryIds = cart.items.map(item => item.productId?.categoryId).filter(Boolean);
            const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
            const categoryMap = {};
            categories.forEach(cat => {
                categoryMap[cat._id.toString()] = cat;
            });

            const validItems = cart.items.filter(item => {
                const product = item.productId;
                const variant = item.productVariantId;
                const category = product?.categoryId ? categoryMap[product.categoryId.toString()] : null;
                const isProductBlocked = !product?.isListed;
                const isVariantBlocked = !variant?.isListed;
                const isCategoryBlocked = !category?.isListed;
                const isInvalid = isProductBlocked || isVariantBlocked || isCategoryBlocked;
                const isOutOfStock = (variant?.stock || 0) === 0;

                if (isInvalid) hasInvalidItems = true;
                if (isOutOfStock || isInvalid) canCheckout = false;

                return !isInvalid;
            });

            validItemsCount = validItems.length;
            subtotal = validItems.reduce((sum, item) => {
                const price = item.discountedPriceAtTime > 0 ? item.discountedPriceAtTime : item.priceAtTime;
                return sum + (price * item.quantity);
            }, 0);
        }

        //  NEW: Return cart data
        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: 'Item removed from cart successfully',
            data: {
                cartItemscount: cart.items.length,
                itemsCount: validItemsCount,
                subtotal: subtotal,
                isEmpty: cart.items.length === 0,
                hasInvalidItems: hasInvalidItems,
                canCheckout: canCheckout
            }
        });
    } catch (err) {
        console.error("💥 Error in removeFromCart:", err);
        next(err);
    }
}