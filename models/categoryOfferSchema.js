import mongoose from "mongoose";

const categoryOfferSchema = new mongoose.Schema({
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    offerName: {
        type: String,
        required: true,
        trim: true
    },
    offerPercentage: {
        type: Number,
        required: true,
        min: 1,
        max: 80
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

categoryOfferSchema.index({ categoryId: 1, startDate: 1, endDate: 1 });
categoryOfferSchema.index({ isActive: 1, endDate: 1 });

const CategoryOffer = mongoose.model("CategoryOffer", categoryOfferSchema);
export default CategoryOffer;