import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs";
import ApiError from "./ApiError.js";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (localfilepath) => {
  try {
    if (!localfilepath) {
      throw new ApiError(400, "No file provided");
    }
    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto",
    });
    console.log("File uploaded successfully", response.url);
    fs.unlinkSync(localfilepath); // Clean up the local file
    return response;
  } catch (error) {
    if (fs.existsSync(localfilepath)) {
      fs.unlinkSync(localfilepath); // Clean up on error
    }
    throw new ApiError(500, error.message || "Error uploading file");
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new ApiError(400, "No public ID provided");
    }
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    throw new ApiError(500, error.message || "Error deleting file");
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
