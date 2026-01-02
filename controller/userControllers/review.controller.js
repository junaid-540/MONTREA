import Review from "../../models/reviewSchema.js";
import Order from "../../models/orderSchema.js";
import Product from '../../models/productSchema.js'
import User from "../../models/userSchema.js";
import { sendResponse } from "../../utils/responseHandler.js";
import statusCodes from "../../utils/statusCodes.js";
import errorMessages from "../../utils/errorMessages.js";
import mongoose from "mongoose";


export const submitReview = async (req,res,next) => {
    try {
        
        const userId = req.session.userId;
        const { orderId, itemId, rating, reviewText } = req.body;
        
        if(!rating || rating < 1 || rating > 5){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Please provide a valid rating (1-5 stars)'
            });
        }

        const order = await Order.findOne({ orderId, userId});
        if(!order){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: errorMessages.ORDER_NOT_FOUND
            });
        }

        const item = order.items.find(item => item._id.toString() === itemId.toString())
        if(!item){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Item not found in order'
            });
        }

        if(item.itemStatus !== 'Delivered'){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'You can only review delivered item'
            });
        }

        if(item.hasReviewed){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'You have already reviewed this item'
            });
        }

        const product = await Product.findById(item.productId).select('name');
        const user = await User.findById(userId).select('name profileImage');

        const review = new Review({
            productId: item.productId,
            userId,
            orderId,
            orderItemId: new mongoose.Types.ObjectId(item._id),
            rating: parseInt(rating),
            reviewText: reviewText?.trim(),
            isVerifiedPurchase: true
        });

        await review.save();
        
        item.hasReviewed = true;
        await order.save()

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Review submitted successfully',
            data: {
                reviewId: review._id
            }
        });
    } catch (err) {
        console.error('Error in submitReview :',err);
        if(err.code === 11000){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.BAD_REQUEST,
                message: 'Review already exists for this item'
            });
        }
        next(err)
    }
}


export const deleteReview = async (req,res,next) =>{
    try {
        
        const userId = req.session.userId;
        const { reviewId } = req.params;

        const review = await Review.findOne({
            _id: reviewId,
            userId
        });

        if(!review){
            return sendResponse(res,{
                success: false,
                statusCode: statusCodes.NOT_FOUND,
                message: 'Review not found'
            });
        }

        await Review.deleteOne({ _id: reviewId });

        await Order.updateOne(
            {
                orderId: review.orderId,
                'items._id': review.orderItemId
            },
            {
                $set: { 'items.$.hasReviewed' : false}
            }
        );

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            message: 'Review deleted successfully'
        });
    } catch (err) {
        console.error("Error in deleteReview :",err);
        next(err)
    }
}


export const getProductReviews = async (req,res,next) =>{
    try {
        
        const { productId } = req.params;

        const reviews = await Review.find({
            productId,
            isApproved: true
        }).populate('userId', 'name profileImage')
          .sort({ createdAt: -1 }).limit(10).lean();

        const ratingStats = await Review.aggregate([
            { $match : { productId: new mongoose.Types.ObjectId(productId), isApproved: true}},
            { 
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating'},
                    totalReviews: { $sum: 1}
                }
            }
        ]);

         const responseData = {
            reviews: reviews.map(review => ({
                _id: review._id,
                rating: review.rating,
                reviewText: review.reviewText,
                createdAt: review.createdAt,
                isVerifiedPurchase: review.isVerifiedPurchase,
                user: {
                    name: review.userId.name,
                    profileImage: review.userId.profileImage
                }
            })),
            ratingSummary: ratingStats[0] ? {
                averageRating: parseFloat(ratingStats[0].averageRating.toFixed(1)),
                totalReviews: ratingStats[0].totalReviews
            } : {
                averageRating: 0,
                totalReviews: 0
            }
        };

        return sendResponse(res,{
            success: true,
            statusCode: statusCodes.OK,
            data: responseData
        });
    } catch (err) {
        console.error("Error in getProductReviews :",err);
        next(err)
    }
}