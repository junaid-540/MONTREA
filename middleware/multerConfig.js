import multer from "multer";
import cloudinary from "../config/cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";



const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "montrea_products",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{width:800, height:800, crop:"limit"}]
    },
});


const upload = multer({ storage });

export default upload
