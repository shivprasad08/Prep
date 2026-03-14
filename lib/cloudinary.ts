import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

function ensureCloudinaryConfigured() {
  if (isConfigured) {
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are not set");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  isConfigured = true;
}

export async function uploadToCloudinary(file: Buffer, filename: string) {
  ensureCloudinaryConfigured();

  return new Promise<string>((resolve, reject) => {
    // Use upload_stream to avoid writing temp files to disk.
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "placementgpt",
        resource_type: "raw",
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve(result.secure_url);
      },
    );

    stream.end(file);
  });
}
