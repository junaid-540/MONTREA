
import ProductVariant from "../../models/productVariantSchema.js";
import Product from "../../models/productSchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";


export const getProductVariants = async (req, res, next) => {
  try {
    const { id: productId } = req.params;

    const variants = await ProductVariant.find({ productId });

    res.render("admin/product-variants", {
      Title: "Product Variants",
      pageCSS: "/public/css/admin/product-variants.css",
      pageJS: "/public/js/admin/product-variants.js",
      variants,
      productId,
    });
  } catch (err) {
    console.error("Error in getProductVariants:", err);
    next(err);
  }
};


export const addVariant = async (req, res, next) => {
  try {


    console.log("Product Data in pvc:", req.body);       // Shows product name, description, category, highlights
    console.log("Variants Data in pvc:", req.body.variants); // Shows variant info (color, size, price, stock)
    console.log("Files Received in pvc:", req.files);    // Shows images uploaded via Multer

    const { productId, color, size, stock, price, discountedPrice } = req.body;

    if (!color || !size || !stock || !price) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.MISSING_FIELDS,
        statusCode: statusCodes.BAD_REQUEST,
      });
    }

    const images = req.files.map(file => ({
      url: file.path,
      public_id: file.filename,
    }));

    const newVariant = await ProductVariant.create({
      productId,
      color,
      size,
      stock,
      price,
      discountedPrice: discountedPrice || 0,
      images,
    });


     const product = await Product.findById(productId);
    product.variants.push(newVariant._id);

    // Set cover image if it doesn't exist yet
    if (!product.coverImage && images.length > 0) {
      product.coverImage = images[0]; // take first image of first variant
    }

    await product.save();
  

    return sendResponse(res, {
      success: true,
      message: "Variant added successfully",
      statusCode: statusCodes.CREATED,
      data: newVariant,
    });
  } catch (err) {
    console.error("Error in addVariant:", err);
    next(err);
  }
};


export const editVariant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { color, size, stock, price, discountedPrice } = req.body;

    const variant = await ProductVariant.findById(id);
    if (!variant) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.VARIANT_NOT_FOUND,
        statusCode: statusCodes.NOT_FOUND,
      });
    }

    variant.color = color ?? variant.color;
    variant.size = size ?? variant.size;
    variant.stock = stock ?? variant.stock;
    variant.price = price ?? variant.price;
    variant.discountedPrice = discountedPrice ?? variant.discountedPrice;
    

    if (req.files && req.files.length) {
      variant.images = req.files.map(file => ({
        url: file.path,
        public_id: file.filename,
      }));
    }

    await variant.save();

    return sendResponse(res, {
      success: true,
      message: "Variant updated successfully",
      statusCode: statusCodes.OK,
      data: variant,
    });
  } catch (err) {
    console.error("Error in editVariant:", err);
    next(err);
  }
};


export const toggleVariantStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const variant = await ProductVariant.findById(id);

    if (!variant) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.VARIANT_NOT_FOUND,
        statusCode: statusCodes.NOT_FOUND,
      });
    }

    variant.isListed = !variant.isListed;
    await variant.save();

    return sendResponse(res, {
      success: true,
      message: variant.isListed ? "Variant listed" : "Variant unlisted",
      statusCode: statusCodes.OK,
      data: variant,
    });
  } catch (err) {
    console.error("Error in toggleVariantStatus:", err);
    next(err);
  }
};
