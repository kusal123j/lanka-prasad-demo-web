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

export const deleteFileFromBunny = async (directoryPath, fileId) => {
  try {
    const uri = `https://sg.storage.bunnycdn.com/lasithaprasad-storage/${directoryPath}/${fileId}`;
    await axios.delete(uri, {
      headers: {
        AccessKey: process.env.BUNNY_ACCESS_KEY,
      },
    });

    return {
      success: true,
      message: "File Deleted",
    };
  } catch (error) {
    // If 404, file doesn't exist – handle gracefully
    if (error.response && error.response.status === 404) {
      console.warn(`File not found: ${fileId}`);
      return {
        success: false,
        message: "File not found",
      };
    }

    console.error("Error deleting file from BunnyCDN:", error.message);
    return {
      success: false,
      message: error.message,
    };
  }
};
