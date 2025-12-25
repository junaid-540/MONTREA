

import mongoose from "mongoose";
import { nanoid } from "nanoid";

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productVariantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductVariant',
        required: true
    },
    // this is the Snapshot data at time of order
    name: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true,
        enum: ["S", "M", "L", "XL"]
    },
    image: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    priceAtPurchase: {
        type: Number,
        required: true,
        min: 0
    },
    discountedPriceAtPurchase: {
        type: Number,
        default: 0,
        min: 0
    },
    itemTotal: {
        type: Number,
        required: true,
        min: 0
    },
    // Item level status for individual product tracking
    itemStatus: {
        type: String,
        enum: ['Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'],
        default: 'Placed'
    },
    // Cancellation details
    cancelReason: {
        type: String,
        default: ''
    },
    cancelledAt: {
        type: Date
    },
    // Return details
    returnRequested: {
        type: Boolean,
        default: false
    },
    returnReason: {
        type: String,
        default: ''
    },
    returnStatus: {
        type: String,
        enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
        default: 'none'
    },
    returnRequestedAt: {
        type: Date
    },
    returnProcessedAt: {
        type: Date
    },
     adminNotes: {
        type: String,
        default: ''
    }
}, { _id: true });


const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        default: () => 'ORD-' + nanoid(10),
        unique: true,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        // index: true
    },
    items: [orderItemSchema],
    
    // Shipping address snapshot
    shippingAddress: {
        fullName: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        alternatePhone: {
            type: String,
            trim: true
        },
        addressLine1: {
            type: String,
            required: true,
            trim: true
        },
        addressLine2: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            required: true,
            trim: true
        },
        pincode: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: String,
            required: true,
            default: 'India',
            trim: true
        },
        addressType: {
            type: String,
            enum: ['Home', 'Work', 'Other'],
            default: 'Home'
        }
    },
    
    // Payment 
    paymentMethod: {
        type: String,
        enum: ['COD', 'Razorpay', 'Wallet'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending',
        required: true
    },
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    razorpaySignature: {
        type: String,
        default: null
    },
    
    // order status (overall)
    orderStatus: {
        type: String,
        enum: ['Pending','Placed','Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled','Partially Cancelled','Partially Delivered'],
        default: 'Placed',
        required: true
    },
    
    // pricing
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    tax: {
        type: Number,
        default: 0,
        min: 0
    },
    shippingCharge: {
        type: Number,
        default: 0,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    
    // coupon details (snapshot at time of order)
    couponApplied: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null
    },
    code:{
        type: String,
        default: null
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed', null],
        default: null
    },
    discountValue: {
        type: Number,
        default: null
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    // wont be using much , this field
    couponDiscount: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Order tracking
    placedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    expectedDelivery: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
    },
    deliveredAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    },
    
    
    invoiceUrl: {
        type: String,
        default: ''
    }
}, { timestamps: true });


orderSchema.index({userId: 1 , createdAt: -1});
// orderSchema.index({userId: 1});
orderSchema.index({orderStatus: 1});

        // checking if order has any returns //
orderSchema.virtual('hasReturn').get(function(){
    return this.items.some(item => item.returnRequested)
})

orderSchema.virtual('hasCancellations').get(function(){
    return this.items.some(item => item.itemStatus === 'Cancelled')
})

orderSchema.set('toJSON',{virtuals: true});
orderSchema.set('toObject',{virtuals: true});

const Order = mongoose.model('Order',orderSchema);
export default Order;