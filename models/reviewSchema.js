import mongoose from "mongoose";


const reviewSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: String,
        required: true
    },
    orderItemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    reviewText: {
        type: String,
        trim: true,
        maxlenght: 1000
    },
    isVerifiedPurchase: {
        type: Boolean,
        default: true
    },
    helpfulCount: {
        type: Number,
        default: 0
    },
    isApproved: {
        type: Boolean,
        default: true
    }
},{timestamps: true});

reviewSchema.index({ orderItemId: 1}, {unique: true} );
reviewSchema.index({ productId: 1, isApproved: 1, createdAt: -1});

const Review = mongoose.model('Review', reviewSchema);
export default Review;