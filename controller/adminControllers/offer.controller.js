import ProductOffer from '../../models/productOfferSchema.js';
import CategoryOffer from '../../models/categoryOfferSchema.js';
import Product from '../../models/productSchema.js';
import Category from '../../models/categorySchema.js';
import { getPaginateData } from '../../utils/helpers.js';
import { sendResponse } from '../../utils/responseHandler.js';
import statusCodes from '../../utils/statusCodes.js';


export const getOffers = async (req,res,next) =>{
    try {
        const { type, status, search } = req.query;

        let filters = {};
        const now = new Date();

        if(type === 'product'){
            filters = {...filters, productId: { $exists: true }};
        }else if( type === 'category'){
            filters = {...filters, categoryId: { $exists: true }};
        }

        if(status === 'expired'){
            filters = {...filters, endDate: { $lt: now}};
        }else if( status === 'active'){
            filters = {
                ...filters,
                isActive: true,
                startDate: { $lt: now},
                endDate: { $gt: now}
            };
        }else if( status === 'inactive'){
            filters = { ...filters, isActive: false};
        }

        const productOffers = await ProductOffer.find(filters)
                .populate({
                    path: 'productId',
                    select: 'name categoryId coverImage',
                    populate: {
                        path: 'categoryId',
                        select: 'name'
                    }
                }).sort({ createdAt: -1}).lean();

        const categoryOffers = await CategoryOffer.find(filters)
                    .populate({
                        path: 'categoryId',
                        select: 'name'
                    }).sort({ createdAt: -1}).lean();

        let offers = [
            ...productOffers.map(offer => ({
                ...offer,
                type: 'product'
            })),
            ...categoryOffers.map(offer => ({
                ...offer,
                type: 'category'
            }))
        ];

        if(search){
            const searchTerm = search.toLowerCase();
            offers = offers.filter(offer =>{
                const offerNameMatch = offer.offerName?.toLowerCase().includes(searchTerm) || false;
                const productNameMatch = offer.productId?.name.toLowerCase().includes(searchTerm) || false;
                const categoryNameMatch = offer.type === 'product' && offer.productId?.categoryId?.name
                        ? offer.productId.categoryId.name.toLowerCase().includes(searchTerm) : false;
                return offerNameMatch || productNameMatch || categoryNameMatch
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const totalOffers = offers.length;
        const totalPages = Math.ceil(totalOffers / limit);
        const paginatedOffers = offers.slice(skip, skip + limit);

        res.render('admin/offer-management',{
            Title: 'Offers Management',
            offers: paginatedOffers,
            currentPage: page,
            totalPages,
            pageSize: limit,
            search: search || '',
            type: type || '',
            status: status || '',
            pageCSS: '/public/css/admin/offer-management.css',
            pageJS: '/public/js/admin/offer-management.js',
            activePage: 'offers'
        })
    } catch (err) {
        console.error("Error in getOffers :",err);
        next(err)
    }
}


export const getFormData = async (req,res,next) =>{
    try {
        const { type } = req.query;

        if(!type || (type !== 'product' && type !== 'category')){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Invalid offer type'
            });
        }
        let data = {};

        if(type === 'product'){
            const products = await Product.find({ isListed: true})
                        .populate('categoryId', 'name')
                        .populate({
                            path: 'variants',
                            match: { isListed: true},
                            select: 'price discountedPrice'
                        }).sort({ name: 1 }).lean();

            const productWithPrice = products.map(product =>{
                let minPrice = 0;
                if(product.variants && product.variants.length > 0){
                    const prices = product.variants.map(variant =>
                        variant.discountedPrice && variant.discountedPrice > 0 ?
                        variant.discountedPrice : variant.price
                    );
                    minPrice = Math.min(...prices);
                }
                return {
                    _id: product._id,
                    name: product.name,
                    category: product.categoryId,
                    minPrice
                };
            });
            data = { products: productWithPrice};
        }else if(type === 'category'){
            const categories = await Category.find({ isListed: true}).sort({ name: 1 }).lean();
            data = { categories};
        }

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            data : data
        })

    } catch (err) {
        console.error('Error in getFormData :',err);
        next(err)
    }
}


// Add new offer
export const addOffer = async (req, res, next) => {
    try {
        const { offerType, productId, categoryId, offerName, offerPercentage, startDate, endDate, isActive } = req.body;

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0); // to set the start of the day for comparison

        if (start < now) {
            return sendResponse(res, {
                success: false,
                message: 'Start date cannot be in the past',
                statusCode: statusCodes.BAD_REQUEST
            });
        }

        if (end <= start) {
            return sendResponse(res, {
                success: false,
                message: 'End date must be after start date',
                statusCode: statusCodes.BAD_REQUEST
            });
        }

        let newOffer;

        if (offerType === 'product') {
            // Check if product exists and is listed
            const product = await Product.findOne({ 
                _id: productId, 
                isListed: true 
            });

            if (!product) {
                return sendResponse(res, {
                    success: false,
                    message: 'Product not found or is not listed',
                    statusCode: statusCodes.NOT_FOUND
                });
            }

            // Check for overlapping offers on same product
            const existingOffer = await ProductOffer.findOne({
                productId,
                isActive: true,
                $or: [
                    {
                        startDate: { $lte: end },
                        endDate: { $gte: start }
                    }
                ]
            });

            if (existingOffer) {
                return sendResponse(res, {
                    success: false,
                    message: 'This product already has an active offer during this period',
                    statusCode: statusCodes.CONFLICT
                });
            }

            newOffer = await ProductOffer.create({
                productId,
                offerName,
                offerPercentage: parseInt(offerPercentage),
                startDate: start,
                endDate: end,
                isActive: isActive === 'true' || isActive === true
            });
        } else if (offerType === 'category') {
            // Check if category exists and is listed
            const category = await Category.findOne({ 
                _id: categoryId, 
                isListed: true 
            });

            if (!category) {
                return sendResponse(res, {
                    success: false,
                    message: 'Category not found or is not listed',
                    statusCode: statusCodes.NOT_FOUND
                });
            }

            // Check for overlapping offers on same category
            const existingOffer = await CategoryOffer.findOne({
                categoryId,
                isActive: true,
                $or: [
                    {
                        startDate: { $lte: end },
                        endDate: { $gte: start }
                    }
                ]
            });

            if (existingOffer) {
                return sendResponse(res, {
                    success: false,
                    message: 'This category already has an active offer during this period',
                    statusCode: statusCodes.CONFLICT
                });
            }

            newOffer = await CategoryOffer.create({
                categoryId,
                offerName,
                offerPercentage: parseInt(offerPercentage),
                startDate: start,
                endDate: end,
                isActive: isActive === 'true' || isActive === true
            });
        } else {
            return sendResponse(res, {
                success: false,
                message: 'Invalid offer type',
                statusCode: statusCodes.BAD_REQUEST
            });
        }

        return sendResponse(res, {
            success: true,
            message: 'Offer created successfully',
            data: newOffer,
            statusCode: statusCodes.CREATED
        });
    } catch (err) {
        console.error("Error in addOffer:", err);
        next(err);
    }
};

// Get edit offer page
export const getEditOffer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type } = req.query;

        if (!type || (type !== 'product' && type !== 'category')) {
            return res.redirect('/admin/offers');
        }

        let offer;
        let products = [];
        let categories = [];

        if (type === 'product') {
            offer = await ProductOffer.findById(id)
                .populate({
                    path: 'productId',
                    select: 'name categoryId',
                    populate: {
                        path: 'categoryId',
                        select: 'name'
                    }
                })
                .lean();

            // Get all products for dropdown
            products = await Product.find({ isListed: true })
                .populate('categoryId', 'name')
                .sort({ name: 1 })
                .lean();
        } else if (type === 'category') {
            offer = await CategoryOffer.findById(id)
                .populate({
                    path: 'categoryId',
                    select: 'name'
                })
                .lean();

            // Get all categories for dropdown
            categories = await Category.find({ isListed: true })
                .sort({ name: 1 })
                .lean();
        }

        if (!offer) {
            req.session.messages = req.session.messages || [];
            req.session.messages.push({
                type: 'error',
                text: 'Offer not found'
            });
            return res.redirect('/admin/offers');
        }

        res.render("admin/edit-offer", {
            Title: "Edit Offer",
            offer,
            offerType: type,
            products,
            categories,
            pageCSS: "/public/css/admin/edit-offer.css",
            pageJS: "/public/js/admin/edit-offer.js",
            activePage: "offers"
        });
    } catch (err) {
        console.error("Error in getEditOffer:", err);
        next(err);
    }
};

// Update offer
export const updateOffer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { offerType, productId, categoryId, offerName, offerPercentage, startDate, endDate, isActive } = req.body;

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return sendResponse(res, {
                success: false,
                message: 'End date must be after start date',
                statusCode: statusCodes.BAD_REQUEST
            });
        }

        let updatedOffer;

        if (offerType === 'product') {
            // Check if product exists and is listed
            const product = await Product.findOne({ 
                _id: productId, 
                isListed: true 
            });

            if (!product) {
                return sendResponse(res, {
                    success: false,
                    message: 'Product not found or is not listed',
                    statusCode: statusCodes.NOT_FOUND
                });
            }

            // Check for overlapping offers on same product (excluding current offer)
            const existingOffer = await ProductOffer.findOne({
                _id: { $ne: id },
                productId,
                isActive: true,
                $or: [
                    {
                        startDate: { $lte: end },
                        endDate: { $gte: start }
                    }
                ]
            });

            if (existingOffer) {
                return sendResponse(res, {
                    success: false,
                    message: 'This product already has another active offer during this period',
                    statusCode: statusCodes.CONFLICT
                });
            }

            updatedOffer = await ProductOffer.findByIdAndUpdate(
                id,
                {
                    productId,
                    offerName,
                    offerPercentage: parseInt(offerPercentage),
                    startDate: start,
                    endDate: end,
                    isActive: isActive === 'true' || isActive === true,
                    updatedAt: new Date()
                },
                { new: true, runValidators: true }
            );
        } else if (offerType === 'category') {
            // Check if category exists and is listed
            const category = await Category.findOne({ 
                _id: categoryId, 
                isListed: true 
            });

            if (!category) {
                return sendResponse(res, {
                    success: false,
                    message: 'Category not found or is not listed',
                    statusCode: statusCodes.NOT_FOUND
                });
            }

            // Check for overlapping offers on same category (excluding current offer)
            const existingOffer = await CategoryOffer.findOne({
                _id: { $ne: id },
                categoryId,
                isActive: true,
                $or: [
                    {
                        startDate: { $lte: end },
                        endDate: { $gte: start }
                    }
                ]
            });

            if (existingOffer) {
                return sendResponse(res, {
                    success: false,
                    message: 'This category already has another active offer during this period',
                    statusCode: statusCodes.CONFLICT
                });
            }

            updatedOffer = await CategoryOffer.findByIdAndUpdate(
                id,
                {
                    categoryId,
                    offerName,
                    offerPercentage: parseInt(offerPercentage),
                    startDate: start,
                    endDate: end,
                    isActive: isActive === 'true' || isActive === true,
                    updatedAt: new Date()
                },
                { new: true, runValidators: true }
            );
        } else {
            return sendResponse(res, {
                success: false,
                message: 'Invalid offer type',
                statusCode: statusCodes.BAD_REQUEST
            });
        }

        if (!updatedOffer) {
            return sendResponse(res, {
                success: false,
                message: 'Offer not found',
                statusCode: statusCodes.NOT_FOUND
            });
        }

        return sendResponse(res, {
            success: true,
            message: 'Offer updated successfully',
            data: updatedOffer,
            statusCode: statusCodes.OK
        });
    } catch (err) {
        console.error("Error in updateOffer:", err);
        next(err);
    }
};

export const toggleOfferStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type } = req.body;

        if (!type || (type !== 'product' && type !== 'category')) {
            return sendResponse(res, {
                success: false,
                message: 'Invalid offer type',
                statusCode: statusCodes.BAD_REQUEST
            });
        }

        let offer;
        
        if (type === 'product') {
            offer = await ProductOffer.findById(id);
        } else if (type === 'category') {
            offer = await CategoryOffer.findById(id);
        }

        if (!offer) {
            return sendResponse(res, {
                success: false,
                message: 'Offer not found',
                statusCode: statusCodes.NOT_FOUND
            });
        }

        offer.isActive = !offer.isActive;
        await offer.save();

        return sendResponse(res, {
            success: true,
            message: offer.isActive ? 'Offer activated successfully' : 'Offer deactivated successfully',
            data: offer,
            statusCode: statusCodes.OK
        });
    } catch (err) {
        console.error("Error in toggleOfferStatus:", err);
        next(err);
    }
};

export const deleteOffer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { type } = req.query;

        if (!type || (type !== 'product' && type !== 'category')) {
            return sendResponse(res, {
                success: false,
                message: 'Invalid offer type',
                statusCode: statusCodes.BAD_REQUEST
            });
        }

        let deletedOffer;
        
        if (type === 'product') {
            deletedOffer = await ProductOffer.findByIdAndDelete(id);
        } else if (type === 'category') {
            deletedOffer = await CategoryOffer.findByIdAndDelete(id);
        }

        if (!deletedOffer) {
            return sendResponse(res, {
                success: false,
                message: 'Offer not found',
                statusCode: statusCodes.NOT_FOUND
            });
        }

        return sendResponse(res, {
            success: true,
            message: 'Offer deleted successfully',
            statusCode: statusCodes.OK
        });
    } catch (err) {
        console.error("Error in deleteOffer:", err);
        next(err);
    }
};