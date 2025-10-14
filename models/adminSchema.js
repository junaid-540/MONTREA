import mongoose from "mongoose";
import bcrypt from 'bcrypt'



const adminSchema = new mongoose.Schema(
    {
        name: {
            type : String,
            required : true,
            trim : true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            sparse: true,
            unique: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
        },

        isActive: {
            type: Boolean,
            default: false,
        },
    },
    {timestamps:true}
);



adminSchema.pre("save", async  function (next){
    if(!this.isModified("password")) return next()


        try {
            
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password,salt);
            next()
        } catch (err) {
            next(err)
        }
});


adminSchema.method.comparePassword = async function(candidatePassword) {
    
    return await bcrypt.compare(candidatePassword,this.password);
}

const Admin  = mongoose.model("Admin",adminSchema);

export default Admin