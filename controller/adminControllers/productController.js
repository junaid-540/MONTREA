import Product from "../../models/productSchema.js";
import ProductVariant from "../../models/productVariantSchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";
import { getPaginateData } from "../../utils/helpers.js";


export const getProducts = async (req, res, next) => {
  try {
    const { data: products, search, totalPages, currentPage } = await getPaginateData(Product, req, {
      searchFields: ["name"],
      sort: { createdAt: -1 },
      limit: 5,
    });

    res.render("admin/product-management", {
      Title: "Product Management",
      pageCSS: "/public/css/admin/products.css",
      pageJS: "/public/js/admin/products.js",
      products,
      currentPage,
      totalPages,
      search,
    });
  } catch (err) {
    console.error("Error in getProducts:", err);
    next(err);
  }
};


export const getAddProductPage = async (req, res, next) => {
  try {
    res.render("admin/add-product", {
      Title: "Add Product",
      pageCSS: "/public/css/admin/add-product.css",
      pageJS: "/public/js/admin/add-product.js",
    });
  } catch (err) {
    console.error("Error in getAddProductPage:", err);
    next(err);
  }
};


export const addProduct = async (req, res, next) => {
  try {
    const { name, description, categoryId, highlights } = req.body;

    if (!name || !description || !categoryId) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.MISSING_FIELDS,
        statusCode: statusCodes.BAD_REQUEST,
      });
    }

    const existing = await Product.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
    if (existing) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.PRODUCT_ALREADY_EXISTS,
        statusCode: statusCodes.CONFLICT,
      });
    }

    const newProduct = await Product.create({
      name,
      description,
      categoryId,
      highlights: highlights || [],
    });

    return sendResponse(res, {
      success: true,
      message: "Product created successfully",
      statusCode: statusCodes.CREATED,
      data: newProduct,
    });
  } catch (err) {
    console.error("Error in addProduct:", err);
    next(err);
  }
};


export const getEditProductPage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.PRODUCT_NOT_FOUND,
        statusCode: statusCodes.NOT_FOUND,
      });
    }

    res.render("admin/edit-product", {
      Title: "Edit Product",
      pageCSS: "/public/css/admin/edit-product.css",
      pageJS: "/public/js/admin/edit-product.js",
      product,
    });
  } catch (err) {
    console.error("Error in getEditProductPage:", err);
    next(err);
  }
};


export const editProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, highlights } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.PRODUCT_NOT_FOUND,
        statusCode: statusCodes.NOT_FOUND,
      });
    }

    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.highlights = highlights ?? product.highlights;

    await product.save();

    return sendResponse(res, {
      success: true,
      message: "Product updated successfully",
      statusCode: statusCodes.OK,
      data: product,
    });
  } catch (err) {
    console.error("Error in editProduct:", err);
    next(err);
  }
};


export const toggleProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return sendResponse(res, {
        success: false,
        message: errorMessages.PRODUCT_NOT_FOUND,
        statusCode: statusCodes.NOT_FOUND,
      });
    }

    product.isListed = !product.isListed;
    await product.save();

    return sendResponse(res, {
      success: true,
      message: product.isListed ? "Product listed" : "Product unlisted",
      statusCode: statusCodes.OK,
      data: product,
    });
  } catch (err) {
    console.error("Error in toggleProductStatus:", err);
    next(err);
  }
};
