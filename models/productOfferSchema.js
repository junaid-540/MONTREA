import mongoose from "mongoose";

const productOfferSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
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
        required: true,
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

productOfferSchema.index({ productId:1, startDate: 1, endDate: 1 });
productOfferSchema.index({ isActive: 1, endDate: 1});

const ProductOffer = mongoose.model('ProductOffer', productOfferSchema);
export default ProductOffer;