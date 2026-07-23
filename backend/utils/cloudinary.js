import { v2 as cloudinary } from "cloudinary";

const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
const hasCloudinaryParts = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (!hasCloudinaryUrl && hasCloudinaryParts) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

export const isCloudinaryConfigured = () => hasCloudinaryUrl || hasCloudinaryParts;

export const uploadFileToCloudinary = async (filePath, options = {}) => {
  if (!isCloudinaryConfigured()) return null;

  const result = await cloudinary.uploader.upload(filePath, {
    folder: options.folder || "student_track",
    resource_type: options.resourceType || "auto",
    use_filename: true,
    unique_filename: true,
    overwrite: false
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type
  };
};

export const deleteCloudinaryFile = async (publicId, resourceType = "image") => {
  if (!isCloudinaryConfigured() || !publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};