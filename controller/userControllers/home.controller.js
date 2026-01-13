import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import { getPaginateData } from "../../utils/helpers.js";
import ProductVariant from "../../models/productVariantSchema.js";
import { calculateVariantPrice, getProductOffers } from "../../utils/offerCalculator.js";
import User from "../../models/userSchema.js";



export const getHomePage = async (req, res, next) => {
  const categories = [
    { name: 'MEN', image: '/public/images/category men.png' },
    { name: 'WOMEN', image: '/public/images/category women.png' },
    { name: 'UNISEX', image: '/public/images/UNISEXMAIN.jpg' }
  ];
  try {
    const newArrivalDocs = await Product.find({ isListed: true })
      .populate({
        path: 'variants',
        match: { isListed: true },
        select: 'color size price discountedPrice images'
      })
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    const filteredNewArrivals = newArrivalDocs.filter(product => product.variants && product.variants.length > 0);

    const newArrivals = filteredNewArrivals.map(product => ({
      _id: product._id,
      name: product.name,
      price: product.variants[0]?.price || 0,
      image: product.variants[0]?.images[0].url || '/public/images/default-product.png',
      category: product.categoryId?.name || 'Uncategorized',
    }));

    const featuredDocs = await Product.aggregate([
      { $match: { isListed: true } },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
          pipeline: [{ $project: { name: 1 } }]
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $match: { 'category.name': { $ne: 'UNISEX' } } },
      { $sample: { size: 8 } },
      {
        $lookup: {
          from: "productvariants",
          localField: "variants",
          foreignField: "_id",
          as: "variants",
          pipeline: [
            { $match: { isListed: true } },
            { $project: { color: 1, size: 1, price: 1, discountedPrice: 1, images: 1 } }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          variants: 1,
          categoryId: { name: '$category.name' }
        }
      }
    ]);

    const filteredFeatured = featuredDocs.filter(product => product.variants && product.variants.length > 0).slice(0, 4);

    const featuredProducts = filteredFeatured.map(product => ({
      _id: product._id,
      name: product.name,
      price: product.variants[0]?.price || 0,
      image: product.variants[0]?.images[0].url || '/public/images/default-product.png',
      category: product.categoryId?.name || 'Uncategorized',
    }));

    const successMessage = req.session.successMessage || null;

    req.session.successMessage = null;

    res.render('user/index', {
      newArrivals,
      featuredProducts,
      categories,
      successMessage,
      Title: "Home",
      pageCss: "/public/css/user/index.css",
      pageJs: "/public/js/user/index.js",
      user: res.locals.user || null,
    });
  } catch (err) {
    console.error("Error in getHomePage", err);
    next(err);
  }
};


export const getShopPage = async (req, res, next) => {
  try {
    const { category, color, size, priceRange, sort, search } = req.query;
    const filters = { isListed: true };

    const categories = Array.isArray(category) ? category : (category ? category.split(',') : []);
    const colors = Array.isArray(color) ? color : (color ? color.split(',') : []);
    const sizes = Array.isArray(size) ? size : (size ? size.split(',') : []);

    // Category filter
    if (categories.length > 0) {
      const categoryDocs = await Category.find({
        name: { $in: categories.map(c => c.toUpperCase()) },
        isListed: true
      }).lean();

      if (categoryDocs.length > 0) {
        filters.categoryId = { $in: categoryDocs.map(c => c._id) };
      } else {
        filters.categoryId = null;
      }
    }

    // Variant filters
    const variantMatch = { isListed: true };
    if (colors.length > 0) variantMatch.color = { $in: colors };
    if (sizes.length > 0) variantMatch.size = { $in: sizes };

    if (priceRange) {
      let min = 0, max = Infinity;
      if (priceRange === '0-1000') { min = 0; max = 1000; }
      else if (priceRange === '1000-2000') { min = 1000; max = 2000; }
      else if (priceRange === '2000-3000') { min = 2000; max = 3000; }
      else if (priceRange === '3000-max') { min = 3000; max = Infinity; }

      variantMatch.$or = [
        {
          discountedPrice: { $exists: true, $ne: null },
          $expr: {
            $and: [
              { $gte: ['$discountedPrice', min] },
              max !== Infinity ? { $lte: ['$discountedPrice', max] } : { $gte: ['$discountedPrice', 0] }
            ]
          }
        },
        {
          $or: [
            { discountedPrice: { $exists: false } },
            { discountedPrice: null }
          ],
          price: { $gte: min, ...(max !== Infinity && { $lte: max }) }
        }
      ];
    }

    const matchingVariants = await ProductVariant.find(variantMatch).select('_id').lean();
    if (matchingVariants.length > 0) {
      filters.variants = { $in: matchingVariants.map(v => v._id) };
    } else if (colors.length > 0 || sizes.length > 0 || priceRange) {
      filters._id = null;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;


    const pipeline = [
      { $match: filters },
      {
        $lookup: {
          from: "productvariants",
          localField: "variants",
          foreignField: "_id",
          as: "variants",
          pipeline: [
            { $match: variantMatch },
            { $project: { color: 1, size: 1, price: 1, discountedPrice: 1, images: 1, _id: 1 } }
          ]
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryId",
          pipeline: [
            { $match: { isListed: true } },
            { $project: { name: 1 } }
          ]
        }
      },
      { $unwind: { path: "$categoryId", preserveNullAndEmptyArrays: true } },
      { $match: { categoryId: { $ne: null }, variants: { $ne: [] } } },
      // Calculate minPrice for sorting
      {
        $addFields: {
          minPrice: {
            $min: {
              $map: {
                input: "$variants",
                as: "variant",
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$$variant.discountedPrice", null] },
                        { $gt: ["$$variant.discountedPrice", 0] }
                      ]
                    },
                    then: "$$variant.discountedPrice",
                    else: "$$variant.price"
                  }
                }
              }
            }
          }
        }
      }
    ];

    if (search) {
      pipeline.splice(1, 0, {
        $match: {
          $or: [
            { name: { $regex: search, $options: "i" } }
            // { description: { $regex: search, $options: "i" } }
          ]
        }
      });
    }

    // Add sorting
    let sortStage = { createdAt: -1 };
    switch (sort) {
      case 'priceLow':
        sortStage = { minPrice: 1 };
        break;
      case 'priceHigh':
        sortStage = { minPrice: -1 };
        break;
      case 'newest':
        sortStage = { createdAt: -1 };
        break;
      case 'aToZ':
        sortStage = { name: 1 };
        break;
    }
    pipeline.push({ $sort: sortStage });

    // Count total documents (for pagination)
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: "total" });
    const countResult = await Product.aggregate(countPipeline);
    const totalDocuments = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalDocuments / limit);

    pipeline.push({ $skip: skip }, { $limit: limit });

    const products = await Product.aggregate(pipeline);

    const productWithOffers = await Promise.all(products.map(async (product) => {
      if (!product.variants || product.variants.length === 0) {
        return { ...product, offerData: null };
      }

        const variantsWithCalculatedPrices = await Promise.all(product.variants.map( async (variant)=>{
          const priceData = await calculateVariantPrice(variant._id);
          return {
            ...variant,
            calculatedPriceData: priceData,
            finalPrice: priceData.finalPrice,
            originalPrice: priceData.originalPrice,
            discountPercentage: priceData.discountPercentage,
            hasOffer: priceData.hasOffer
          };
        })
      );

      const offers = await getProductOffers(product._id);

      const finalPrice = variantsWithCalculatedPrices.map(v => v.finalPrice);
      const minPrice = finalPrice.length > 0 ? Math.min(...finalPrice) : 0;
      const maxPrice = finalPrice.length > 0  ? Math.max(...finalPrice) : 0;

      const hasManualDiscount = variantsWithCalculatedPrices.some(
        v => v.discountedPrice && v.discountedPrice < v.price
      );

      return {
        ...product,
        variants: variantsWithCalculatedPrices,
        offerData: {
          hasOffer: variantsWithCalculatedPrices.some(v => v.hasOffer),
          hasManualDiscount: hasManualDiscount,
          discountPercentage: variantsWithCalculatedPrices.length > 0 ? Math.max(...variantsWithCalculatedPrices.map(v => v.discountPercentage || 0)) : 0,
          minPrice: minPrice,
          maxPrice: maxPrice,
          offerDetails: offers.length > 0 ? offers[0] : null
        }
      };
    }));

    // Get filter options
    const allCategories = await Category.find({ isListed: true }).lean();
    const allColors = await ProductVariant.distinct('color', { isListed: true });
    const allSizes = await ProductVariant.distinct('size', { isListed: true });

    res.render("user/shop", {
      products : productWithOffers,
      Title: "Shop",
      pageCss: "/public/css/user/shop.css",
      pageJs: "/public/js/user/shop.js",
      user: res.locals.user || null,
      pagination: {
        totalPages,
        currentPage: page
      },
      categories: allCategories,
      colors: allColors.filter(Boolean),
      sizes: allSizes.filter(Boolean),
      selectedFilters: {
        category: categories.join(','),
        color: colors.join(','),
        size: sizes.join(','),
        priceRange,
        sort
      },
      query: req.query
    });
  } catch (err) {
    console.error('Error loading shop page:', err);
    next(err);
  }
};


export const getProductDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate([
      { path: 'variants', match: { isListed: true } },
      { path: 'categoryId', select: 'name' },
    ]);

    if (!product || !product.isListed) {
      return res.status(404).render('user/404', {
        Title: "Product Not Found",
        user: res.locals.user || null
      });
    }

    const availableColors = [...new Set(product.variants.map(variant => variant.color))];
    const availableSizes = [...new Set(product.variants.map(variant => variant.size))]

    const relatedProducts = await Product.find({
      categoryId: product.categoryId._id,
      _id: { $ne: id },
      isListed: true,
    }).sort({ createdAt: -1 }).limit(4).populate('categoryId', 'name').lean()

    const defaultVariant = product.variants[0] || null;

    // Calculate price with offers for default variant
    let defaultPriceData = null;
    if (defaultVariant) {
      defaultPriceData = await calculateVariantPrice(defaultVariant._id);
    }

    // Get all active offers for this product
    const productOffers = await getProductOffers(product._id);

    // Calculate prices for all variants
    const variantsWithPrices = await Promise.all(
      product.variants.map(async (variant) => {
        const priceData = await calculateVariantPrice(variant._id);
        return {
          ...variant.toObject(),
          calculatedPrice: priceData
        };
      })
    );

    const successMessage = req.session.successMessage || null;
    delete req.session.successMessage;

    res.render('user/product-details', {
      product,
      Title: `${product.name} - Deatails`,
      pageCss: "/public/css/user/product-details.css",
      pageJs: "/public/js/user/product-details.js",
      user: res.locals.user || null,
      availableColors,
      // availableSizes,
      relatedProducts,
      defaultVariant,
      successMessage,
      variantsWithPrices,
      productOffers,
      defaultPriceData,
    });
  } catch (err) {
    console.error('Error loading product details:', err);
    next(err);
  }
}


export const aboutUs = async (req,res,next) =>{
  try {
    res.render('user/about',{
      is404: true,
      user: res.locals.user || null,
      Title: 'About Us',
      pageCss: "/public/css/user/about.css"
    })
  } catch (err) {
    console.error('Error Loading aboutUs page :',err);
    next(err)
  }
}