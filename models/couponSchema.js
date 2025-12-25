import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({    
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        minlength: 4,
        maxlength: 20
    },
    
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
        
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    
    maxDiscountAmount: {
        type: Number,
        default: null,
        min: 0
    },
        
    minPurchaseAmount: {
        type: Number,
        default: 0,
        min: 0
    },
        
    usageLimit: {
        type: Number,
        required: true,
        min: 1
    },
    
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    perUserLimit: {
        type: Number,
        required: true,
        min: 1
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
        
    usedBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        usageCount: {
            type: Number,
            default: 0
        },
        lastUsedAt: {
            type: Date
        },
        orders: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        }]
    }]
    
}, { timestamps: true });

// Indexes for faster queries
// couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, endDate: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;