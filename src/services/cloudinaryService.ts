import { v2 as cloudinary } from "cloudinary";
import { config } from "../config";

// Configuración global de Cloudinary con credenciales de config / .env
cloudinary.config({
  cloud_name: config.cloudinary?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || "dri5k0qio",
  api_key: config.cloudinary?.apiKey || process.env.CLOUDINARY_API_KEY || "434763523713664",
  api_secret: config.cloudinary?.apiSecret || process.env.CLOUDINARY_API_SECRET || "FH9mpg-eOCuEW8ui5qJucbea6Ac",
  secure: true,
});

/**
 * Suba de forma transparente cualquier URL de imagen externa a tu cuenta de Cloudinary.
 * Si la URL ya pertenece a tu Cloudinary (dri5k0qio), la devuelve intacta sin duplicar.
 */
export async function uploadImageUrlToCloudinary(
  imageUrl: string,
  folder: string = "corptlux/articles"
): Promise<string> {
  if (!imageUrl || typeof imageUrl !== "string") return imageUrl || "";

  const trimmed = imageUrl.trim();

  // Si ya está alojada en Cloudinary o es una imagen base64 vacía, retornar directamente
  if (trimmed.includes("res.cloudinary.com/dri5k0qio") || trimmed.includes("cloudinary.com")) {
    return trimmed;
  }

  // Verificar si es una URL válida (http:// o https://)
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(trimmed, {
      folder,
      resource_type: "auto",
    });

    console.log(`[CLOUDINARY] Imagen procesada y guardada exitosamente: ${uploadResult.secure_url}`);
    return uploadResult.secure_url;
  } catch (err: any) {
    console.warn(`[CLOUDINARY] No se pudo subir imagen externa a Cloudinary, usando URL original. Error: ${err.message}`);
    return trimmed; // Fallback seguro
  }
}

/**
 * Escanea un bloque de contenido HTML, detecta todas las etiquetas <img> con src="http..." 
 * y las procesa automáticamente hacia tu cuenta de Cloudinary.
 */
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

  // Eliminar duplicados
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
