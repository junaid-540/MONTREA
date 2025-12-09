import mongoose from "mongoose";

const wishlistItemsSchema = new mongoose.Schema({
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
    addedAt: {
        type: Date,
        default: Date.now
    }
},{_id: false});

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    items:[wishlistItemsSchema]
},{timestamps:true});

const Wishlist = mongoose.model('Wishlist',wishlistSchema);
export default Wishlist;