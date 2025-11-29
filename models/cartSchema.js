import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },

    productVariantId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductVariant',
        required: true
    },

    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
        validate: {
            validator: function(value){
                return value <= 5;
            },
            message: 'Max 5 items of this variant'
        }
    },

    priceAtTime: {
        type: Number,
        required: true
    },

    discountedPriceAtTime: {
        type: Number
    }
},{_id:false});



const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,  // One cart per user
        index: true  // for faster look ups 
    },

    items: [cartItemSchema]

},{timestamps:true});


cartSchema.virtual('subtotal').get(function(){
    return this.items.reduce((sum,item) =>{
        const price = item.discountedPriceAtTime > 0 ? item.discountedPriceAtTime : item.priceAtTime;
        return sum + (price * item.quantity);
    },0)
});

cartSchema.set('toJSON',{virtuals:true});
cartSchema.set('toObject',{virtuals:true});

const Cart = mongoose.model('Cart',cartSchema);
export default Cart;