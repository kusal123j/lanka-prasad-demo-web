import fs from "fs";
import path from "path";
import mime from "mime-types";
import axios from "axios";

export const uploadFileOnBunny = async (
  directoryPath,
  file,
  fileName = null
) => {
  try {
    if (!file) return null;

    let fileStream;
    let finalFileName;
    let contentType;

    if (Buffer.isBuffer(file)) {
      // File is a buffer (e.g., from Puppeteer)
      finalFileName = fileName || `${Date.now()}.png`;
      fileStream = file;
      contentType = "image/png";
    } else {
      // File from Multer
      fileStream = fs.createReadStream(file.path);
      const fileExtension = path.extname(file.originalname).slice(1);
      finalFileName = fileName || file.originalname || `${Date.now()}.png`;
      contentType = mime.lookup(fileExtension) || "application/octet-stream";
    }

    const uri = `https://sg.storage.bunnycdn.com/lasithaprasad-storage/${directoryPath}/${finalFileName}`;

    await axios.put(uri, fileStream, {
      headers: {
        AccessKey: process.env.BUNNY_ACCESS_KEY,
        "content-type": contentType,
      },
    });

    // Clean up temp file if it exists
    if (!Buffer.isBuffer(file) && file.path) {
      fs.unlinkSync(file.path);
    }

    return {
      success: true,
      url: `https://lasithaprasad.b-cdn.net/${directoryPath}/${finalFileName}`,
      public_id: finalFileName,
      message: "File uploaded successfully",
    };
  } catch (error) {
    console.error("BunnyNet upload error:", error);

    if (!Buffer.isBuffer(file) && file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return { success: false, message: "File upload failed" };
  }
};

{
  /** 
export const deleteFileFromBunny = async (directoryPath, fileId) => {
  try {
    // 1️⃣ Delete file from Bunny Object Storage
    const storageUrl = `https://sg.storage.bunnycdn.com/lasithaprasad-storage/${directoryPath}/${fileId}`;
    await axios.delete(storageUrl, {
      headers: {
        AccessKey: process.env.BUNNY_ACCESS_KEY, // Storage zone key
      },
    });

    // 2️⃣ Purge cache from Bunny CDN using the official API
    const cdnUrl = `https://lasithaprasad.b-cdn.net/${directoryPath}/${fileId}`;
    const purgeEndpoint = `https://api.bunny.net/purge?url=${encodeURIComponent(
      cdnUrl
    )}&async=false`;

    const purgeResponse = await axios.post(
      purgeEndpoint,
      {},
      {
        headers: {
          AccessKey:
            "33b2d881-aa36-49b1-b376-4e52041cfb48a6a1d2f5-c5e4-4193-a899-f3c7f98ca50b", // ⚠️ Use Pull Zone or Account API Key (NOT Storage key)
          Accept: "application/json",
        },
      }
    );

    console.log("✅ Bunny Purge Response:", purgeResponse.data);

    return {
      success: true,
      message: "File deleted and cache purged successfully",
    };
  } catch (error) {
    // Graceful handling for 404s (file missing on storage)
    if (error.response && error.response.status === 404) {
      console.warn(`⚠️ File not found in storage: ${fileId}`);
      return { success: false, message: "File not found" };
    }

    // Log and return other errors
    console.error(
      "🔥 Error deleting or purging file from Bunny:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message: error.message || "File delete/purge failed",
    };
  }
};
*/
}
