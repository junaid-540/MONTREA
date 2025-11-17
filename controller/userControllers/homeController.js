import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import { getPaginateData } from "../../utils/helpers.js";
import ProductVariant from "../../models/productVariantSchema.js";


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
    const { category, color, size, priceRange, sort, search } = req.query; // search from helper
    const filters = { isListed: true };

    const categories = Array.isArray(category) ? category : (category ? category.split(',') : []);
    const colors = Array.isArray(color) ? color : (color ? color.split(',') : []);
    const sizes = Array.isArray(size) ? size : (size ? size.split(',') : []);


    if (categories.length > 0) {
      const categoryDocs = await Category.find({ name: { $in: categories.map(c => c.toUpperCase()) } }).lean();
      if (categoryDocs.length > 0) filters.categoryId = { $in: categoryDocs.map(c => c._id) };
    }

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
        { discountedPrice: { $gte: min, $lte: max } },
        { price: { $gte: min, $lte: max } }
      ];
    }

    const matchingVariants = await ProductVariant.find(variantMatch).select('_id').lean();
    if (matchingVariants.length > 0) {
      filters.variants = { $in: matchingVariants.map(v => v._id) };
    }

    // Sort (use min variant price for price sorts)
    let sortOption = { createdAt: -1 };
    switch (sort) {
      case 'priceLow':

        const productsWithMinPrice = await Product.aggregate([
          { $match: filters },
          { $lookup: { from: 'productVariants', localField: 'variants', foreignField: '_id', as: 'variants', pipeline: [{ $match: { isListed: true } }, { $project: { price: 1, discountedPrice: 1 } }] } },
          { $addFields: { minPrice: { $min: '$variants.discountedPrice' } } }, // Use discounted or price
          { $sort: { minPrice: 1 } },
          { $limit: 100 } // Temp limit for sort
        ]);

        sortOption = { basePrice: 1 };
        break;
      case 'priceHigh':
        sortOption = { basePrice: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'bestSelling':
        sortOption = { createdAt: -1 }; // Placeholder
        break;
      case 'aToZ':
        sortOption = { name: 1 };
        break;
    }

    const { data: products, totalPages, currentPage } = await getPaginateData(Product, req, {
      searchFields: ['name', 'description'],
      filters,
      sort: sortOption,
      limit: 12,
    });

    const populatedProducts = await Product.populate(products, [
      { path: 'variants', match: { isListed: true }, select: 'color size price discountedPrice images' },
      { path: 'categoryId', select: 'name' }
    ]);

    const allCategories = await Category.find({ isListed: true }).lean();
    const allColors = await ProductVariant.distinct('color', { isListed: true });
    const allSizes = await ProductVariant.distinct('size', { isListed: true });


    if (category) {
      const cats = Array.isArray(category) ? category : category.split(',');
      const categoryDocs = await Category.find({ name: { $in: cats.map(c => new RegExp(`^${c}$`, 'i')) } }).lean();
      req.session.categoryPath = categoryDocs.map(c => ({ name: c.name }));
    } else {
      req.session.categoryPath = null;
    }

    res.render("user/shop", {
      products: populatedProducts,
      Title: "Shop",
      pageCss: "/public/css/user/shop.css",
      pageJs: "/public/js/user/shop.js",
      user: res.locals.user || null,
      pagination: { totalPages, currentPage },
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
      query: req.query  // For pagination links
    });
  } catch (err) {
    console.error('Error loading shop page:', err);
    next(err);
  }
};


export const getProductDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id)
      .populate([
        { path: 'variants', match: { isListed: true } },
        { path: 'categoryId', select: 'name parentCategory' },
      ])
      .lean();

    if (!product || !product.isListed) {
      return res.status(404).render('user/404', { Title: "Product Not Found", user: res.locals.user || null });
    }

    let breadcrumb = [
      { name: 'Home', url: '/' }, { name: 'Shop', url: '/shop' }
    ];

    if (req.session.categoryPath && req.session.categoryPath.length > 0) {
      req.session.categoryPath.forEach(cat => {
        breadcrumb.push({
          name: cat.name,
          url: `/shop?category=${cat.name.toLowerCase()}`
        });
      });
    }

    else if (req.headers.referer && req.headers.referer.includes('/shop')) {
      const url = new URL(req.headers.referer);
      const categoryParam = url.searchParams.get('category');
      if (categoryParam) {
        const cats = categoryParam.split(',');
        const mainCat = cats[cats.length - 1];
        const catDoc = await Category.findOne({ name: { $regex: new RegExp(`^${mainCat}$`, 'i') } });
        if (catDoc) {
          breadcrumb.push({ name: catDoc.name, url: req.headers.referer });
        }
      }
    }

    else if (product.categoryId) {
      const category = product.categoryId;


      if (category.parentCategory) {
        const parent = await Category.findById(category.parentCategory).select('name').lean();
        if (parent) {
          breadcrumb.push(
            { name: parent.name, url: `/shop?category=${parent.name}` },
            { name: category.name, url: `/shop?category=${category.name}` }
          );
        } else {
          breadcrumb.push({ name: category.name, url: `/shop?category=${category.name}` });
        }
      } else {
        breadcrumb.push({ name: category.name, url: `/shop?category=${category.name}` });
      }
    }


    breadcrumb.push({
      name: product.name,
      url: null
    });

    const urlParams = new URLSearchParams(req.query);
    const selectedColor = urlParams.get('color') || (product.variants[0]?.color);
    if (selectedColor) {
      const lastCrumb = breadcrumb[breadcrumb.length - 1];
      lastCrumb.name = `${product.name} (${selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1)})`;
    }


    const availableColors = [...new Set(product.variants.map(v => v.color))];
    const availableSizes = [...new Set(product.variants.map(v => v.size))];

    const relatedProducts = await Product.find({
      categoryId: product.categoryId._id,
      _id: { $ne: id },
      isListed: true,
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate('categoryId', 'name')
      .lean();

    const defaultVariant = product.variants[0] || null;

    res.render('user/product-details', {
      product,
      Title: `${product.name} - Details`,
      pageCss: "/public/css/user/product-details.css",
      pageJs: "/public/js/user/product-details.js",
      user: res.locals.user || null,
      availableColors,
      availableSizes,
      relatedProducts,
      defaultVariant,
      breadcrumb,
      currentColor: selectedColor || availableColors[0]
    });

  } catch (err) {
    console.error('Error loading product details:', err);
    next(err);
  }
};