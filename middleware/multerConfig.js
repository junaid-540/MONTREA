import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "montrea_products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    timestamp: Math.floor(Date.now() / 1000).toString(),
    resource_type: "image",
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 30, // Max 30 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"), false);
    }
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

  // Pass error to the global error handler for rendering
  next(error);
};

export default upload;
