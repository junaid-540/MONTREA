
import mongoose from "mongoose";



const userSchema = new mongoose.Schema(
    {
        name:{
            type : String,
            required : function(){
                return !this.googleId;
            },
            trim : true,
        },

        email:{
            type : String,
            required : true,
            unique : true,
            lowercase : true,
        },

        phone :{
            type : String,
            // unique : true,
            // sparse : true,
        },

        password :{
            type : String,
            required : function (){
                return !this.googleId //this is for only when user is not login with google
            },
            default: null,
        },

        googleId :{
            type : String,
            // sparse : true,
            // unique : true,
            default : null
        },

        status: {
          type: String,
          enum: ["active", "blocked", "deleted"],
          default: "active",
        },

        profileImage:{
            type: String,
           default: 'https://res.cloudinary.com/denu4amwx/image/upload/v1763464812/User_icon_ua556r.jpg',
           trim: true,
        },

        isVerified: {
            type: Boolean,
            default : false,
        },

        unverifiedCreatedAt:{
            type:Date,
            default:undefined,
            expires:900,
        },

    },
    { timestamps : true }
);



//this is used sometimes the sparse key wont work inside the schema field 

userSchema.index(
    {googleId:1},
    {unique:true, partialFilterExpression :{ googleId : { $type: "string"}}}
);
userSchema.index(
    {phone: 1},
    {unique: true , partialFilterExpression : { phone :{ $type : "string"}}}
)



const User = mongoose.model('User',userSchema)

export default User