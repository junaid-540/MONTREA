
import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    basePrice: {
        type: Number,
        required: false,
        min: 0, // optional //
    },
    highlights: {
        type: [String],
        trim: true,
        default: [] // optional //
    },
    coverImage: {
        url: { type: String, default: "" },
        public_id: { type: String, default: "" },
    },
    variants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVariant"
        },
    ],
    isListed: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
export default Product;
