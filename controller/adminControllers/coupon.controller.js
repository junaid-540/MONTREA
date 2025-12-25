import Coupon from "../../models/couponSchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import { getPaginateData } from "../../utils/helpers.js";


export const getCouponList = async (req,res,next) =>{
    try {
        const {filter} = req.query;
        const now = new Date();

        let filterQuery = {};
        if(filter === 'active'){
            filterQuery = {isActive: true, endDate: { $gte: now}};
        }else if(filter === 'inactive'){
            filterQuery = {isActive: false};
        }else if(filter === 'expired'){
            filterQuery = {endDate: { $lt: now}};
        }

        const {data: coupons, totalPages, currentPage, search} =  await getPaginateData(Coupon,req,{
            filters: filterQuery,
            searchField: ['code'],
            sort: { createdAt: -1},
            limit: 7
        });
        
        let pageSize = 7

        res.render('admin/coupon-management',{
            Title: 'Coupon Management',
            activePage: 'coupon',
            pageCSS: '/public/css/admin/coupon-management.css',
            pageJS: '/public/js/admin/coupon-management.js', 
            coupons,
            currentPage,
            totalPages,
            search : search || '',
            filter : filter || '',
            pageSize
        })
    } catch (err) {
        console.error('Error in getCouponList :',err);
        next(err)
    }
}


export const getAddCouponPage = async (req,res,next) =>{
    try {
        res.render('admin/add-coupon',{
            Title: 'Add Coupon',
            pageCSS: '/public/css/admin/add-coupon.css',
            pageJS: '/public/js/admin/add-coupon.js',
            activePage: 'coupon'
        })
    } catch (err) {
        console.error("Error in getAddCouponPage :",err);
        next(err)
    }
}


export const createCoupon = async (req,res,next) =>{
    try {
        const {code, description, discountType, discountValue, maxDiscountAmount, minPurchaseAmount, usageLimit, perUserLimit, startDate, endDate, isActive} = req.body;

        if(!code || !description || ! discountType || !discountValue){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Please fill requried fields'});
        }

        const codeRegex = /^[A-Z0-9_-]+$/
        if(!codeRegex.test(code.toUpperCase().trim())){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Code can only contain uppercase letters, numbers, hyphens and underscores'});
        }

        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase().trim()});
        if(existingCoupon){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Coupon code already exists'});
        }
        
        const discValue = parseFloat(discountValue);
        if(discValue <= 0){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Discount value must be greater than 0'});
        }
        if(discountType === 'percentage' && discValue > 100){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Percentage discount cannot exceed 100%'});
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if(isNaN(start.getTime()) || isNaN(end.getTime())){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Invalid date format'});
        }
        if(end <= start){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: 'End date must be after start date'});
        }

        const totalLimit = parseInt(usageLimit);
        const userLimit = parseInt(perUserLimit);

        if(totalLimit < 1 || userLimit < 1){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Usage limit must be at least 1'});
        }
        if(userLimit > totalLimit){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Per user limit cannot exceed total usage limit'});
        }

        const couponData = {
            code: code.toUpperCase().trim(),
            description: description.trim(),
            discountType,
            discountValue: discValue,
            minPurchaseAmount: parseFloat(minPurchaseAmount) || 0,
            usageLimit: totalLimit,
            perUserLimit: userLimit,
            startDate: start,
            endDate: end,
            isActive: isActive === 'on' || isActive === true || isActive === 'true'
        };
        
        if(discountType === 'percentage'){
            if(maxDiscountAmount && parseFloat(maxDiscountAmount) > 0){
                couponData.maxDiscountAmount = parseFloat(maxDiscountAmount);
            }else{
                return sendResponse(res,{
                    success: false,
                    statusCode: statusCodes.BAD_REQUEST,
                    message: 'Max discount amount is required for percentage coupons'
                });
            }
        }

        const newCoupon = new Coupon(couponData);
        await newCoupon.save()

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Coupon created successfully',
            data:{ couponId: newCoupon._id }
        });
    } catch (err) {
        console.error('Error in createCoupon :',err);
        if(err.code === 11000){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: 'Coupon code already exists'});
        }
        if(err.name === 'ValidationError'){
            return sendResponse(res,{success: false, statusCode: statusCodes.BAD_REQUEST, message: Object.values(err.errors)[0].message});
        }
        next(err);
    }
}


export const getEditCouponPage = async (req,res,next) =>{
    try {
        const {id} = req.params;
        const coupon = await Coupon.findById(id).lean()

        if(!coupon){
            req.session.errorMessage = 'Coupon not found';
            return res.redirect('/admin/coupon');
        }
        res.render('admin/edit-coupon',{
            Title: 'Edit Coupon',
            coupon,
            pageCSS: '/public/css/admin/edit-coupon.css',
            pageJS: '/public/js/admin/edit-coupon.js',
            activePage: 'coupon'
        });
    } catch (err) {
        console.error("Error in getEditCouponPage :",err);
        next(err)
    }
}


export const updateCoupon = async (req,res,next) =>{
    try {
        const {id} = req.params;
        const { description, maxDiscountAmount, minPurchaseAmount, usageLimit, perUserLimit, endDate, isActive} = req.body;

        const coupon = await Coupon.findById(id);
        if(!coupon){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Coupon not found'
                });
        }
        if(!description || !description.trim().length === 0){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Description is required'
            });
        }

         const totalLimit = parseInt(usageLimit);
        if (totalLimit < coupon.usageCount) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: `Usage limit cannot be less than current usage (${coupon.usageCount})`
            });
        }

        // Validate per user limit
        const userLimit = parseInt(perUserLimit);
        if (userLimit < 1) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Per user limit must be at least 1'
            });
        }

        if (userLimit > totalLimit) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Per user limit cannot exceed total usage limit'
            });
        }

        // Validate end date
        const newEndDate = new Date(endDate);
        if (isNaN(newEndDate.getTime())) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Invalid end date'
            });
        }

        if (newEndDate <= coupon.startDate) {
            return sendResponse(res, {
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'End date must be after start date'
            });
        }

        // Update fields
        coupon.description = description.trim();
        coupon.minPurchaseAmount = parseFloat(minPurchaseAmount) || 0;
        coupon.usageLimit = totalLimit;
        coupon.perUserLimit = userLimit;
        coupon.endDate = newEndDate;
        coupon.isActive = isActive === 'on' || isActive === true || isActive === 'true';

        // Update max discount for percentage type
        if (coupon.discountType === 'percentage') {
            if (maxDiscountAmount && parseFloat(maxDiscountAmount) > 0) {
                coupon.maxDiscountAmount = parseFloat(maxDiscountAmount);
            }
        }

        await coupon.save();

        return sendResponse(res, {
            success: true,
            statusCode: statusCodes.OK,
            message: 'Coupon updated successfully'
        });

    } catch (err) {
        console.error("Error in updateCoupon :",err);
        if(err.name === 'ValidationError'){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: Object.values(err.errors)[0].message
            });
        }
        next(err);
    }
}


export const toggleCouponStatus = async (req,res,next) =>{
    try {
        const {id} = req.params;
        const coupon = await Coupon.findById(id);
        if(!coupon){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Coupon not found'
            });
        }

        const now = new Date();
        if(now > coupon.endDate){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Cannot activate an expired coupon'
            });
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (err) {
        console.error("Error in toggleCouponStatus :",err);
        next(err);
    }
}