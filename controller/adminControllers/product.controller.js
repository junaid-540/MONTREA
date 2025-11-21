import Product from "../../models/productSchema.js"
import ProductVariant from "../../models/productVariantSchema.js"
import { sendResponse } from "../../utils/responseHandler.js"
import statusCodes from "../../utils/statusCodes.js"
import errorMessages from "../../utils/errorMessages.js"
import { getPaginateData } from "../../utils/helpers.js"
import Category from "../../models/categorySchema.js"
// import cloudinary from "../../config/cloudinary.js"
import { cleanupCloudinaryImages } from "../../utils/cloudinaryHelper.js"


export const getProducts = async (req, res, next) => {
  try {
    const { data: products, search, totalPages, currentPage, } = await getPaginateData(Product, req, {
      searchFields: ["name", "description"],
      filters: {},
      sort: { createdAt: -1 },
      limit: 7,
    });

    const status = req.query.status || "";
    let filteredProducts = products;

    if (status === "active") {
      filteredProducts = products.filter((p) => p.isListed === true);
    } else if (status === "inactive") {
      filteredProducts = products.filter((p) => p.isListed === false);
    }


    const populatedProducts = await Product.find({
      _id: { $in: filteredProducts.map((p) => p._id) },
    })
      .populate("categoryId", "name")
      .populate({
        path: "variants",
        select: "stock images isListed",
      }).sort({ createdAt: -1 });


    const finalProducts = populatedProducts.map((product) => {
      const listedVariants = product.variants?.filter((v) => v.isListed) || [];
      const totalStock = listedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
      const firstImage = product.variants?.[0]?.images?.[0]?.url || null;
      const variantCount = listedVariants.length;

      return {
        ...product.toObject(),
        totalStock,
        variantCount,
        categoryName: product.categoryId?.name || "N/A",
        firstImage,
      };
    });

    const pageSize = 7;

    res.render("admin/product-management", {
      Title: "Product Management",
      pageCSS: "/public/css/admin/products.css",
      pageJS: "/public/js/admin/products.js",
      products: finalProducts,
      currentPage,
      totalPages,
      search,
      status,
      pageSize,
      activePage: "products",
    });
  } catch (err) {
    console.error("Error in getProducts:", err);
    next(err);
  }
};


export const getAddProductPage = async (req, res, next) => {
  try {
    const categories = await Category.find({ isListed: true }).sort({ name: 1 })

    res.render("admin/add-product", {
      Title: "Add Product",
      pageCSS: "/public/css/admin/add-product.css",
      pageJS: "/public/js/admin/add-product.js",
      categories,
      activePage: 'products',
    })
  } catch (err) {
    console.error("Error in getAddProductPage:", err)
    next(err)
  }
}


// const cleanupCloudinaryImages = async (publicIds) => {
//   if (!publicIds || publicIds.length === 0) return;
//   try {
//     console.log(`Cloudinary cleanup: Deleting ${publicIds.length} images.`);
//     const deletionPromises = publicIds.map(id => cloudinary.uploader.destroy(id));
//     await Promise.all(deletionPromises);
//     console.log("Cloudinary cleanup successful.");
//   } catch (err) {
//     console.error("Cloudinary cleanup failed:", err);
//   }
// };


export const addProduct = async (req, res, next) => {
  const uploadedPublicIds = [];
  const createdVariantIds = [];
  try {
    console.log("=== ADD PRODUCT DEBUG START ===");
    console.log("req.body:", JSON.stringify(req.body, null, 2).substring(0, 500) + '...');  // Safe log
    console.log("req.files count:", req.files ? req.files.length : 0);
    const { name, description, categoryId, highlights, variants: variantsJSON } = req.body;
    const uploadedFiles = req.files || [];

    if (!name || !description || !categoryId || !variantsJSON || uploadedFiles.length === 0) {
      console.log("Early validation fail: Missing fields/files");
      return sendResponse(res, { success: false, message: "Missing required fields/files", statusCode: 400 });
    }

    let variants;
    try {
      variants = JSON.parse(variantsJSON);
      console.log("Parsed variants count:", variants.length);
      console.log("First variant:", JSON.stringify(variants[0], null, 2));
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr);
      return sendResponse(res, { success: false, message: "Invalid variants data", statusCode: 400 });
    }

    const expectedImageCount = variants.length * 3;
    console.log("Expected images:", expectedImageCount, "Received:", uploadedFiles.length);
    if (uploadedFiles.length !== expectedImageCount) {
      return sendResponse(res, { success: false, message: `Image count mismatch. Expected ${expectedImageCount}, got ${uploadedFiles.length}`, statusCode: 400 });
    }

    // Existing product check
    const existing = await Product.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
    if (existing) {
      console.log("Duplicate product found");
      return sendResponse(res, { success: false, message: "Product already exists", statusCode: 409 });
    }

    const prices = variants.map(v => Number(v.price)).filter(p => !isNaN(p));
    const basePrice = prices.length > 0 ? Math.min(...prices) : 0;
    console.log("Base price:", basePrice);

    // Group files
    const filesByVariant = {};
    uploadedFiles.forEach((file, idx) => {
      console.log(`File ${idx}: fieldname=${file.fieldname}, public_id=${file.public_id}`);
      const match = file.fieldname.match(/variantImages\[(\d+)\]/);
      if (match) {
        const variantIndex = parseInt(match[1]);
        if (!filesByVariant[variantIndex]) filesByVariant[variantIndex] = [];
        filesByVariant[variantIndex].push(file);
        uploadedPublicIds.push(file.public_id);
      } else {
        console.warn("Unmatched file fieldname:", file.fieldname);
      }
    });
    console.log("Grouped files:", filesByVariant);

    const variantIds = [];
    let coverImage = null;
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const variantFiles = filesByVariant[i] || [];
      console.log(`Variant ${i}: files count=${variantFiles.length}`);
      const uploadedImages = variantFiles.map(file => {
        
        let publicId = file.public_id;
        if (!publicId && file.filename) {
          publicId = file.filename.startsWith('montrea_products/')
            ? file.filename.replace('montrea_products/', '')
            : file.filename;
        }
        if (!publicId && file.path) {
          publicId = file.path.split('/').pop().split('.')[0];
        }

        return {
          url: file.path || file.secure_url,
          public_id: publicId
        };
      });
      if (i === 0 && uploadedImages.length > 0) coverImage = uploadedImages[0];
      const newVariant = await ProductVariant.create({
        productId: null,
        color: variant.color,
        size: variant.size,
        stock: Number(variant.stock),
        price: Number(variant.price),
        discountedPrice: variant.discountedPrice ? Number(variant.discountedPrice) : 0,
        images: uploadedImages,  // Empty OK
      });
      console.log(`Created variant ${i} ID:`, newVariant._id);
      variantIds.push(newVariant._id);
      createdVariantIds.push(newVariant._id);
    }

    const newProduct = await Product.create({
      name,
      description,
      categoryId,
      basePrice,
      highlights: highlights ? highlights.split(",").map(h => h.trim()).filter(Boolean) : [],
      coverImage: coverImage || { url: "", public_id: "" },
      variants: variantIds,
    });
    console.log("Created product ID:", newProduct._id);

    await ProductVariant.updateMany(
      { _id: { $in: variantIds } },
      { $set: { productId: newProduct._id } }
    );

    console.log("Success: Product + variants created");

    return sendResponse(res, {
      success: true,
      message: "Product created successfully",
      statusCode: statusCodes.CREATED,
      data: newProduct,
    });
  } catch (err) {
    console.error("=== ADD PRODUCT ERROR ===");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    await cleanupCloudinaryImages(uploadedPublicIds);
    if (createdVariantIds.length > 0) {
      await ProductVariant.deleteMany({ _id: { $in: createdVariantIds } });
    }
    return sendResponse(res, {
      success: false,
      message: err.message || "Error creating product",
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
    });

  }
};


export const getEditProductPage = async (req, res, next) => {
  try {
    const { id } = req.params
    const product = await Product.findById(id).populate("categoryId", "name")
    const categories = await Category.find({ isListed: true }).sort({ name: 1 })
    if (!product) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.PRODUCT_NOT_FOUND,
        statusCode: statusCodes.NOT_FOUND,
      })
    }

    res.render("admin/edit-product", {
      Title: "Edit Product",
      pageCSS: "/public/css/admin/edit-product.css",
      pageJS: "/public/js/admin/edit-product.js",
      product,
      activePage: 'products',
      categories,
    })
  } catch (err) {
    console.error("Error in getEditProductPage:", err)
    next(err)
  }
}

export const editProduct = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, description, highlights, categoryId } = req.body

    const product = await Product.findById(id)
    if (!product) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.PRODUCT_NOT_FOUND,
        statusCode: statusCodes.NOT_FOUND,
      })
    }

    product.name = name ?? product.name
    product.description = description ?? product.description
    product.highlights = highlights ?? product.highlights
    product.categoryId = categoryId ?? product.categoryId

    await product.save()

    return sendResponse(res, {
      success: true,
      message: "Product updated successfully",
      statusCode: statusCodes.OK,
      data: product,
    })
  } catch (err) {
    console.error("Error in editProduct:", err)
    next(err)
  }
}

export const toggleProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const product = await Product.findById(id)

    if (!product) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.PRODUCT_NOT_FOUND,
        statusCode: statusCodes.NOT_FOUND,
      })
    }

    product.isListed = !product.isListed
    await product.save()

    return sendResponse(res, {
      success: true,
      message: product.isListed ? "Product listed" : "Product unlisted",
      statusCode: statusCodes.OK,
      data: product,
    })
  } catch (err) {
    console.error("Error in toggleProductStatus:", err)
    next(err)
  }
}
