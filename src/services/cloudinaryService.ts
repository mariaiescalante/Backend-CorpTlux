import { v2 as cloudinary } from "cloudinary";
import { config } from "../config";

cloudinary.config({
  cloud_name: config.cloudinary?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || "dri5k0qio",
  api_key: config.cloudinary?.apiKey || process.env.CLOUDINARY_API_KEY || "434763523713664",
  api_secret: config.cloudinary?.apiSecret || process.env.CLOUDINARY_API_SECRET || "FH9mpg-eOCuEW8ui5qJucbea6Ac",
  secure: true,
});

export async function uploadImageUrlToCloudinary(
  imageUrl: string,
  folder: string = "corptlux/landing"
): Promise<string> {
  if (!imageUrl || typeof imageUrl !== "string") return imageUrl || "";
  const trimmed = imageUrl.trim();
  if (trimmed.includes("res.cloudinary.com") || trimmed.includes("cloudinary.com")) {
    return trimmed;
  }
  const isHttp = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  const isDataUri = trimmed.startsWith("data:image/");
  if (!isHttp && !isDataUri) {
    return trimmed;
  }
  try {
    const uploadResult = await cloudinary.uploader.upload(trimmed, {
      folder,
      resource_type: "auto",
    });
    console.log("[CLOUDINARY] Imagen procesada en Cloudinary:", uploadResult.secure_url);
    return uploadResult.secure_url;
  } catch (err: any) {
    console.warn("[CLOUDINARY] Error al subir a Cloudinary:", err.message);
    return trimmed;
  }
}

export async function processObjectImagesWithCloudinary(obj: any, folder: string = "corptlux/landing"): Promise<any> {
  if (!obj) return obj;
  if (typeof obj === "string") {
    if (obj.startsWith("http://") || obj.startsWith("https://") || obj.startsWith("data:image/")) {
      return await uploadImageUrlToCloudinary(obj, folder);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    const arr = [];
    for (const item of obj) {
      arr.push(await processObjectImagesWithCloudinary(item, folder));
    }
    return arr;
  }
  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = await processObjectImagesWithCloudinary(v, folder);
    }
    return result;
  }
  return obj;
}

export async function processHtmlImagesWithCloudinary(
  htmlContent: string,
  folder: string = "corptlux/articles"
): Promise<string> {
  if (!htmlContent || typeof htmlContent !== "string") return htmlContent || "";
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  let updatedHtml = htmlContent;
  const urlMatches: string[] = [];
  while ((match = imgRegex.exec(htmlContent)) !== null) {
    if (match[1]) {
      urlMatches.push(match[1]);
    }
  }
  const uniqueUrls = Array.from(new Set(urlMatches));
  for (const originalUrl of uniqueUrls) {
    if (originalUrl && (originalUrl.startsWith("http://") || originalUrl.startsWith("https://"))) {
      const cloudinaryUrl = await uploadImageUrlToCloudinary(originalUrl, folder);
      if (cloudinaryUrl && cloudinaryUrl !== originalUrl) {
        updatedHtml = updatedHtml.split(originalUrl).join(cloudinaryUrl);
      }
    }
  }
  return updatedHtml;
}
