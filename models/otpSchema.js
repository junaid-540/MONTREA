import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email : {
        type : String,
        required : true,
        lowercase : true,
    },

    otp : {
        type : String,
        required : true,
    },

    createdAt : {
        type : Date,
        default : Date.now,
        expires : 60, // 1 minutes
    }
});

const Otp = mongoose.model('Otp',otpSchema)

export default Otp;