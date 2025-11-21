
import cloudinary from "../config/cloudinary.js";

const DEFAULT_PROFILE_IMAGE =
  "https://res.cloudinary.com/denu4amwx/image/upload/v1763464812/User_icon_ua556r.jpg";

/**
 * Extract public_id from Cloudinary URL
 * Works for both profile and product images
 */
export const getPublicIdFromUrl = (url) => {
  if (!url || url.includes("User_icon_ua556r") || url === DEFAULT_PROFILE_IMAGE) {
    return null;
  }

  try {
    const parts = url.split("/");
    const fileName = parts[parts.length - 1]; // e.g. "user_123_1735823456789.jpg"
    return fileName.split(".")[0];
  } catch (err) {
    console.error("Error extracting public_id:", url);
    return null;
  }
};

/**
 * Delete a single image from Cloudinary (safe)
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted from Cloudinary: ${publicId}`, result.result);
    return result.result === "ok";
  } catch (err) {
    console.error(`Failed to delete Cloudinary image: ${publicId}`, err);
    return false;
  }
};

/**
 * Delete multiple images (used in product rollback)
 */
export const cleanupCloudinaryImages = async (publicIds = []) => {
  if (!Array.isArray(publicIds) || publicIds.length === 0) return;

  const validIds = publicIds
    .map(getPublicIdFromUrl)
    .filter(Boolean);

  if (validIds.length === 0) return;

  console.log(`Cleaning up ${validIds.length} Cloudinary images...`);
  const promises = validIds.map(id => deleteFromCloudinary(id));
  const results = await Promise.allSettled(promises);

  const failed = results.filter(r => r.status === "rejected");
  if (failed.length > 0) {
    console.warn(`${failed.length} images failed to delete`);
  }
};

/**
 * Delete old profile image when user uploads a new one
 */
export const deleteOldProfileImage = async (oldImageUrl) => {
  const publicId = getPublicIdFromUrl(oldImageUrl);
  if (publicId) {
    await deleteFromCloudinary(publicId);
  }
};