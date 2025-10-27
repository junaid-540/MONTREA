import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    color: {
        type: String,
        required: true,
        trim: true,
    },
    size: {
        type: String,
        required: true,
        enum: ["S", "M", "L", "XL"],
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    discountedPrice: {
        type: Number,
        default: 0,
        min: 0,
    },
    SKU: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    images: [
        {
            url: { type: String, required: true },
            public_id: { type: String, required: true },
        }
    ],
}, { timestamps: true });

const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);
export default ProductVariant;
