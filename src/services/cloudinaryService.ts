import { v2 as cloudinary } from "cloudinary";
import { config } from "../config";

cloudinary.config({
  cloud_name: config.cloudinary?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || "dri5k0qio",
  api_key: config.cloudinary?.apiKey || process.env.CLOUDINARY_API_KEY || "434763523713664",
  api_secret: config.cloudinary?.apiSecret || process.env.CLOUDINARY_API_SECRET || "FH9mpg-eOCuEW8ui5qJucbea6Ac",
  secure: true,
});

const VERIFIED_FALLBACK_URL = "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=85";

export async function uploadImageUrlToCloudinary(
  imageUrl: string,
  folder: string = "corptlux/landing"
): Promise<string> {
  if (!imageUrl || typeof imageUrl !== "string") return imageUrl || "";
  let trimmed = imageUrl.trim();

  // Si ya está en nuestro Cloudinary real oficial
  if (trimmed.includes("res.cloudinary.com/dri5k0qio/")) {
    return trimmed;
  }

  // Si es una URL simulada/mock o inválida de antemano
  if (trimmed.includes("tluxstudio") || trimmed.includes("placeholder") || trimmed.includes("example.com") || trimmed.includes("demo")) {
    trimmed = VERIFIED_FALLBACK_URL;
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
    console.log("[CLOUDINARY] Imagen subida y verificada en Cloudinary:", uploadResult.secure_url);
    return uploadResult.secure_url;
  } catch (err: any) {
    console.warn("[CLOUDINARY] URL no disponible o inválida, usando fallback verificado:", err.message);
    try {
      const fallbackResult = await cloudinary.uploader.upload(VERIFIED_FALLBACK_URL, {
        folder,
        resource_type: "auto",
      });
      return fallbackResult.secure_url;
    } catch {
      return VERIFIED_FALLBACK_URL;
    }
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
  
  let updatedHtml = htmlContent.replace(
    /https?:\/\/[^\s"']*(?:demo|tluxstudio|placeholder|example\.com)[^\s"']*/gi,
    VERIFIED_FALLBACK_URL
  );

  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  const urlMatches: string[] = [];
  while ((match = imgRegex.exec(updatedHtml)) !== null) {
    if (match[1]) {
      urlMatches.push(match[1]);
    }
  }
  const uniqueUrls = Array.from(new Set(urlMatches));
  for (const originalUrl of uniqueUrls) {
    if (originalUrl && (originalUrl.startsWith("http://") || originalUrl.startsWith("https://") || originalUrl.startsWith("data:image/"))) {
      if (!originalUrl.includes("res.cloudinary.com/dri5k0qio/")) {
        const cloudinaryUrl = await uploadImageUrlToCloudinary(originalUrl, folder);
        if (cloudinaryUrl && cloudinaryUrl !== originalUrl) {
          updatedHtml = updatedHtml.split(originalUrl).join(cloudinaryUrl);
        }
      }
    }
  }
  return updatedHtml;
}
