import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    let folder = "others"; 

    // Detect route and set folder accordingly
    const url = req.originalUrl || req.url;

    if (url.includes("/products") || url.includes("/variants")) {
      folder = "montrea_products";
    } 
    else if (url.includes("/profile") || url.includes("/edit-profile")) {
      folder = "profile";
    }

    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],

      public_id: url.includes("/profile") 
        ? `user_${req.session.userId || "unknown"}_${Date.now()}` 
        : undefined,
      transformation: url.includes("/profile")
        ? [{ width: 500, height: 500, crop: "limit" }] 
        : undefined,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  },
});



export const multerErrorHandler = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error("=== MULTER ERROR ===");
    console.error("Type:", error.code);
    console.error("Message:", error.message);
    console.error("====================");

    error.status = 400;
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        error.message = "One or more files are too large (max 5MB).";
        break;
      case "LIMIT_FILE_COUNT":
        error.message = "Too many files uploaded. Please try fewer.";
        break;
      default:
        error.message = "File upload failed. Please check your images.";
        break;
    }
  } else if (error?.message?.includes("Invalid Signature")) {
    console.error("Cloudinary Signature Error:", error.message);
    error.status = 400;
    error.message = "Upload signature invalid — please retry.";
  }

  next(error);
};

export default upload;