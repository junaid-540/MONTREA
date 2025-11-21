import ProductVariant from "../../models/productVariantSchema.js";
import Product from "../../models/productSchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";
import fs from 'fs';
const fsPromises = fs.promises;
import cloudinary from "../../config/cloudinary.js";


export const getProductVariants = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
    if (!product) {
      return sendResponse(res, {
        success: false,
        statusCode: statusCodes.NOT_FOUND,
        message: errorMessages.PRODUCT_NOT_FOUND
      })
    }

    const variants = await ProductVariant.find({ productId });


    // console.log('product (for variants page):', product);
    // console.log('first variant (for variants page):', variants[0]);

    res.render("admin/variant-management", {
      Title: "Variant Management",
      pageCSS: "/public/css/admin/variant-management.css",
      pageJS: "/public/js/admin/variant-management.js",
      variants,
      product,
      activePage: 'products',
    });
  } catch (err) {
    console.error("Error in getProductVariants:", err);
    next(err);
  }
};


export const getAddVariant = async (req, res, next) => {
  try {

    const { productId } = req.params;
    // const product =await Product.findById(productId)

    res.render("admin/add-variant", {
      Title: 'Add Variant',
      pageCSS: '/public/css/admin/add-variant.css',
      pageJS: '/public/js/admin/add-variant.js',
      activePage: 'products',
      productId,
    })

  } catch (err) {
    console.error('Error in Add Variant: ', err);
    next(err)
  }
}

export const addVariant = async (req, res, next) => {
  try {
    const { productId, color, size, stock, price, discountedPrice } = req.body;

    const images = req.files.map(file => ({   // mapping multer files for images
      url: file.path,
      public_id: file.filename,
    }));

    console.log( "Images in addVariant:", images );

    const newVariant = await ProductVariant.create({
      productId,
      color,
      size,
      stock,
      price,
      discountedPrice: discountedPrice || 0,
      images,
    });

    console.log("New variant created:", newVariant);

    const product = await Product.findById(productId);
    if (!product) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.PRODUCT_NOT_FOUND,
        statusCode: statusCodes.NOT_FOUND,
      });
    }

    product.variants.push(newVariant._id);
    if (!product.coverImage && images.length > 0) {   // setting cover image if its not setted yet
      product.coverImage = images[0];
    }

    await product.save();
    console.log("Variant added to product:", product);

    const firstListedVariant = await ProductVariant.findOne({
      productId,
      isListed: true,
    }).sort({createdAt:1});

    if(firstListedVariant && firstListedVariant.images && firstListedVariant.images[0]?.url){
      product.coverImage = firstListedVariant.images[0];
      await product.save()
      console.log("Product cover image updated after adding variant.");
    }

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


export const getEditVariant = async (req, res, next) => {
  try {

    const { id } = req.params
    const variant = await ProductVariant.findById(id).populate("productId")

    if (!variant) {
      return sendResponse(res, {
        success: false,
        statusCode: statusCodes.NOT_FOUND,
        message: errorMessages.VARIANT_NOT_FOUND,
      })
    }
    // console.log("Data from editVariant :", variant)

    res.render('admin/edit-variant', {
      Title: " Edit Variant",
      pageCSS: '/public/css/admin/edit-variant.css',
      pageJS: '/public/js/admin/edit-variant.js',
      activePage: 'products',
      variant,
    })

  } catch (err) {
    console.error("Error in Edit Variant :", err);
    next(err)
  }
}



export const editVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files || [];

    const variant = await ProductVariant.findById(id);
    if (!variant) return res.status(404).json({ success: false, message: "Variant not found" });

    // Update text fields
    if (req.body.color) variant.color = req.body.color;
    if (req.body.size) variant.size = req.body.size;
    if (req.body.price) variant.price = Number(req.body.price);
    if (req.body.discountedPrice !== undefined) variant.discountedPrice = req.body.discountedPrice ? Number(req.body.discountedPrice) : null;
    if (req.body.stock) variant.stock = Number(req.body.stock);

    const oldImages = variant.images || [];
    const newImages = [];
    const toDelete = [];

    // Map uploaded files
    const fileMap = {};
    files.forEach(f => {
      const match = f.fieldname.match(/images\[(\d+)\]/);
      if (match) fileMap[match[1]] = f;
    });

    // DEBUG: Add this to see what's actually arriving
    console.log("Raw existingImages fields:", {
  'existingImages[0]': req.body['existingImages[0]'],
  'existingImages[1]': req.body['existingImages[1]'],
  'existingImages[2]': req.body['existingImages[2]']
});

    for (let i = 0; i < 3; i++) {
      const hasNewFile = !!fileMap[i];
      const existingUrl = req.body[`existingImages[${i}]`];  // ← NOTE: no closing ]

      if (hasNewFile) {
        // New image uploaded
        const file = fileMap[i];
        newImages.push({
          url: file.path,
          public_id: file.filename
        });
        if (oldImages[i]?.public_id) toDelete.push(oldImages[i].public_id);
      }
      else if (existingUrl && existingUrl.includes('cloudinary')) {
        // KEEP existing image — copy from oldImages
        newImages.push(oldImages[i]);
      }
      else {
        // This should NEVER happen now — but just in case
        newImages.push(oldImages[i] || null);
      }
    }

    // Final check
    if (newImages.filter(img => img && img.url).length !== 3) {
      return res.status(400).json({
        success: false,
        message: "Must have exactly 3 valid images"
      });
    }

    variant.images = newImages;
    await variant.save();

    const product = await Product.findById(variant.productId);
    if(product){
      const firstListedVariant = await ProductVariant.findOne({
         productId: variant.productId,
          isListed: true,
         }).sort({ createdAt: 1 });
      if(firstListedVariant && firstListedVariant.images && firstListedVariant.images[0]?.url){
        product.coverImage = {
          url : firstListedVariant.images[0].url,
          public_id: firstListedVariant.images[0].public_id,
        }
        await product.save()
        console.log("Product cover image updated after variant edit.");
      }
    }

    // Delete old images async
    if (toDelete.length > 0) {
      setTimeout(() => {
        toDelete.forEach(pid => cloudinary.uploader.destroy(pid).catch(() => {}));
      }, 1000);
    }

    res.json({ success: true, message: "Variant updated successfully", data: variant });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
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
