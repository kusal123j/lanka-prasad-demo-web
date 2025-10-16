import Enrollment from "../models/enrollementModel.js";
import userModel from "../models/userModel.js";
import puppeteer from "puppeteer";
import QRCode from "qrcode";
import { v2 as cloudinary } from "cloudinary";
import { uploadFileOnBunny } from "../CDN/bunnycdn.js";
import Category from "../models/categoryModel.js";
import redis from "../utils/redisClient.js";
import VideoWatch from "../models/VideoWatchModel.js";
import mongoose from "mongoose";
import fs from "fs";
export const getuserdata = async (req, res) => {
  try {
    const userId = req.userId;
    const cacheKey = `user:${userId}`;

    // Check Redis first
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      return res.json({
        success: true,
        userData: JSON.parse(cachedUser),
        source: "redis",
      });
    }

    // Fallback → MongoDB
    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const userData = {
      name: user.name,
      lastname: user.lastname,
      studentId: user.studentId,
      IsNICVerified: user.IsNICVerified,
      NIC: user.NIC,
      role: user.role,
      mainCategory: user.ExamYear,
      phonenumber: user.phonenumber,
      isAccountVerifyed: user.isAccountVerifyed,
      address: user.Address,
    };

    // ✅ Correct ioredis syntax
    await redis.set(cacheKey, JSON.stringify(userData), { EX: 3600 }); // 1 hour

    res.json({ success: true, userData, source: "mongodb" });
  } catch (error) {
    console.error("getuserdata error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const enrolledCourse = async (req, res) => {
  try {
    const userId = req.userId;

    const enrollments = await Enrollment.find({ user: userId })
      .populate("course") // Get full course details
      .select("course expiresAt"); // Include expiresAt

    // Map both course data and expiresAt
    const courses = enrollments.map((e) => ({
      course: e.course,
      expiresAt: e.expiresAt,
    }));

    res.json({
      success: true,
      enrolledCourses: courses,
    });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getProfileData = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      userData: {
        name: user.name,
        studentId: user.studentId,
        lastname: user.lastname,
        phonenumber: user.phonenumber,
        Gender: user.Gender,
        BirthDay: user.BirthDay,
        School: user.School,
        ExamYear: user.ExamYear,
        District: user.District,
        Address: user.Address,
        tuteDliveryPhoennumebr1: user.tuteDliveryPhoennumebr1,
        tuteDliveryPhoennumebr2: user.tuteDliveryPhoennumebr2,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
//update profile ( userdata )
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,
      lastname,
      Gender,
      BirthDay,
      ExamYear,
      phonenumber,
      Address,
      tuteDliveryPhoennumebr1,
      tuteDliveryPhoennumebr2,
      School,
      District,
    } = req.body;

    // Update user data & set isAccountComplete = true
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      {
        name,
        lastname,
        Gender,
        BirthDay,
        ExamYear,
        phonenumber,
        Address,
        tuteDliveryPhoennumebr1,
        tuteDliveryPhoennumebr2,
        School,
        District,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    // 2️⃣ Define the Redis cache key (same as in getuserdata)
    const cacheKey = `user:${userId}`;

    // 3️⃣ Delete the cache for this user
    await redis.del(cacheKey);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Function to generate Student ID Card
export const generateStudentIDCard = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    const studentId = user.studentId;
    const name = user.name;
    const examYear = user.ExamYear;

    // 1️⃣ Generate QR Code
    const qrImage = await QRCode.toDataURL(studentId.toString());

    // 2️⃣ Your actual HTML & CSS
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student ID Card - Print Ready</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .card-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        /* Credit card standard size: 85.6mm x 53.98mm (337px x 213px at 100dpi) */
        .id-card {
            width: 337px;
            height: 213px;
            background: linear-gradient(135deg, #dc2626 0%, #1f1f1f 30%, #dc2626 100%);
            position: relative;
            overflow: hidden;
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.3),
                0 2px 8px rgba(220, 38, 38, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
        }
        
        /* Geometric background pattern */
        .id-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
                radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(220, 38, 38, 0.3) 0%, transparent 50%),
                linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.05) 50%, transparent 70%);
            pointer-events: none;
        }
        
        /* Top accent strip */
        .accent-strip {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #ffd700 0%, #ff6b6b 25%, #8b5cf6 50%, #10b981 75%, #ffd700 100%);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        
        /* Header section */
        .card-header {
            position: relative;
            padding: 16px 20px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(220, 38, 38, 0.6) 100%);
            backdrop-filter: blur(5px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        

        
        .lms-text {
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        }
        
        .year-badge {
            background: white;
            color: #000000;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.8);
            letter-spacing: 0.5px;
        }
        
        /* Main content */
        .card-body {
            padding: 16px 20px 20px;
            height: calc(100% - 72px);
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
        }
        
        .student-info {
            flex: 1;
            color: #ffffff;
            z-index: 2;
        }
        
        .student-id {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 4px;
            font-weight: 500;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        
        .student-name {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 
                0 2px 4px rgba(0, 0, 0, 0.8),
                0 0 8px rgba(220, 38, 38, 0.3);
            letter-spacing: 0.5px;
            line-height: 1.1;
        }
        
        .card-label {
            font-size: 10px;
            color: #000000;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.9) 100%);
            padding: 4px 10px;
            border-radius: 6px;
            display: inline-block;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(220, 38, 38, 0.2);
        }
        
        /* QR Code section */
.qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px; /* increase gap between QR and Scan Me */
    z-index: 2;
}

.qr-code {
    width: 80px;   /* increased container size */
    height: 80px;
    background: #ffffff;
    border-radius: 16px; /* more rounded corners */
    padding: 8px;   /* keep some inner spacing */
    box-shadow: 
        0 4px 12px rgba(0, 0, 0, 0.4),
        0 0 0 2px rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
}

.qr-code img {
    width: 84px;  /* QR fits nicely inside */
    height: 84px;
    border-radius: 12px; /* soften QR edges too */
}

.qr-label {
    padding: 2px 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 10px;
    font-weight: 600;
    text-align: center;
    letter-spacing: 1px;
    text-transform: uppercase;
}

        
        /* Decorative elements */
        .geometric-shape {
            position: absolute;
            bottom: -20px;
            right: -20px;
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(220, 38, 38, 0.2) 100%);
            border-radius: 50%;
            opacity: 0.6;
        }
        
        .geometric-shape::before {
            content: '';
            position: absolute;
            top: 15px;
            left: 15px;
            right: 15px;
            bottom: 15px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
        }
        
        /* Corner accent */
        .corner-accent {
            position: absolute;
            top: 0;
            right: 0;
            width: 0;
            height: 0;
            border-top: 25px solid rgba(255, 255, 255, 0.1);
            border-left: 25px solid transparent;
        }
        
        /* Print styles */
        @media print {
            body {
                background: white;
                margin: 0;
                padding: 0;
            }
            
            .card-container {
                padding: 0;
                margin: 0;
            }
            
            .id-card {
                box-shadow: none;
                page-break-inside: avoid;
            }
        }
        
        /* Responsive adjustments */
        @media (max-width: 400px) {
            .id-card {
                width: 300px;
                height: 189px;
                transform: scale(0.89);
            }
            
            .student-name {
                font-size: 16px;
            }
            
            .qr-code {
                width: 56px;
                height: 56px;
            }
            
            .qr-code svg {
                width: 48px;
                height: 48px;
            }
        }
    </style>
</head>
<body>
    <div class="card-container">
        <div class="id-card">
            <div class="accent-strip"></div>
            <div class="corner-accent"></div>
            
            <div class="card-header">
                <div class="logo-section">
                    
                   <img width="150px" src="https://uploads.onecompiler.io/43umuesnv/43ums6yan/logo-dark-Dkcx-5i5.png" />
                </div>
                <div class="year-badge">A/L Year : ${examYear}</div>
            </div>
            
            <div class="card-body">
                <div class="student-info">
                    <div class="student-id">SID:  ${studentId}</div>
                    <div class="student-name">${name}</div>
                    <div class="card-label">Student ID Card</div>
                </div>
                
                <div class="qr-section">
  <div class="qr-code">
    <img src="${qrImage}" alt="QR Code" />
  </div>
  <div class="qr-label">Scan Me</div>
</div>
            </div>
            
            <div class="geometric-shape"></div>
        </div>
    </div>
</body>
</html>`;

    // 3️⃣ Launch Puppeteer with high resolution
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 3 }); // sharper output
    await page.setContent(htmlTemplate, { waitUntil: "networkidle0" });

    // 4️⃣ Grab ONLY the card element
    const cardElement = await page.$(".id-card");
    const buffer = await cardElement.screenshot({ type: "png" });

    await browser.close();

    //upload the image into bunney net.
    const data = await uploadFileOnBunny(
      "student-id-cards",
      buffer,
      `${studentId}.png`
    );

    if (data.success && data.url) {
      //update the user
      await userModel.findByIdAndUpdate(userId, { studentIdCard: data.url });
      return res.json({ success: true, imageUrl: data.url });
    } else {
      return res.status(500).json({ error: "Failed to upload to BunnyCDN" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate ID card" });
  }
};

// Get all categories with subcategories
export const getAllCategories = async (req, res) => {
  try {
    const cacheKey = "categories:all";

    // Check Redis cache first
    const cachedCategories = await redis.get(cacheKey);
    if (cachedCategories) {
      return res.status(200).json({
        success: true,
        categories: JSON.parse(cachedCategories),
        source: "redis",
      });
    }

    // If not cached, fetch from MongoDB
    const mainCategories = await Category.find({ type: "main" });
    const categoriesWithSubs = await Promise.all(
      mainCategories.map(async (main) => {
        const subs = await Category.find({ parent: main._id, type: "sub" });
        return {
          _id: main._id,
          name: main.name,
          type: main.type,
          subCategories: subs.map((s) => ({
            _id: s._id,
            name: s.name,
            type: s.type,
          })),
        };
      })
    );

    // Store in Redis for 24 hours
    await redis.set(cacheKey, JSON.stringify(categoriesWithSubs), "EX", 86400);

    res.status(200).json({
      success: true,
      categories: categoriesWithSubs,
      source: "mongodb",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/user/getlastvideotime?courseId=...&chapterId=...&lectureId=...
export const getLastVideoposition = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, chapterId, lectureId } = req.query;

    if (!userId || !courseId || !chapterId || !lectureId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const userObjId = new mongoose.Types.ObjectId(String(userId));
    const courseObjId = new mongoose.Types.ObjectId(String(courseId));

    const doc = await VideoWatch.findOne(
      { user: userObjId, course: courseObjId, chapterId, lectureId },
      { lastPositionSec: 1 }
    )
      .sort({ updatedAt: -1 })
      .lean();

    const positionSec = Math.max(0, Math.floor(doc?.lastPositionSec ?? 0));
    return res.status(200).json({ success: true, positionSec });
  } catch (err) {
    console.error("getLastVideoposition error:", err);
    return res.status(500).json({ error: "Failed to get last video position" });
  }
};

// POST /api/user/updatevideotime
export const updateVideotime = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, chapterId, lectureId } = req.body;
    let { watchedDuration, currentPositionSec } = req.body;

    if (!userId || !courseId || !chapterId || !lectureId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const duration = Number.isFinite(Number(watchedDuration))
      ? Math.max(0, Math.round(Number(watchedDuration)))
      : 0;

    const currentPos = Number.isFinite(Number(currentPositionSec))
      ? Math.max(0, Math.floor(Number(currentPositionSec)))
      : 0;

    const userObjId = new mongoose.Types.ObjectId(String(userId));
    const courseObjId = new mongoose.Types.ObjectId(String(courseId));
    const now = new Date();

    // Keep a single doc per user+course+chapter+lecture. Update latest if duplicates exist.
    const session = await VideoWatch.findOneAndUpdate(
      { user: userObjId, course: courseObjId, chapterId, lectureId },
      {
        $inc: { watchedDuration: duration },
        $set: { endTime: now, lastPositionSec: currentPos, isActive: true },
        $setOnInsert: {
          startTime: now,
          isActive: true,
          lastPositionSec: currentPos,
        },
      },
      { new: true, upsert: true, sort: { updatedAt: -1 } }
    );

    return res
      .status(200)
      .json({ success: true, message: "Watch session updated", session });
  } catch (err) {
    console.error("updateVideotime error:", err);
    return res.status(500).json({ error: "Failed to save watch data" });
  }
};

// POST /api/user/finishvideo
export const finishVideotime = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, chapterId, lectureId, currentPositionSec } = req.body;

    if (!userId || !courseId || !chapterId || !lectureId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const userObjId = new mongoose.Types.ObjectId(String(userId));
    const courseObjId = new mongoose.Types.ObjectId(String(courseId));

    const currentPos = Number.isFinite(Number(currentPositionSec))
      ? Math.max(0, Math.floor(Number(currentPositionSec)))
      : undefined;

    const update = { $set: { isActive: false, endTime: new Date() } };
    if (typeof currentPos === "number") {
      update.$set.lastPositionSec = currentPos;
    }

    await VideoWatch.findOneAndUpdate(
      { user: userObjId, course: courseObjId, chapterId, lectureId },
      update,
      { new: true, sort: { updatedAt: -1 } }
    );

    return res
      .status(200)
      .json({ success: true, message: "Video session finished" });
  } catch (err) {
    console.error("finishVideotime error:", err);
    return res.status(500).json({ error: "Failed to finish video session" });
  }
};

// get user NIC image

export const getUserNICImage = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel
      .findById(userId)
      .select("NICFrontImage IsNICVerified");

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.status(200).json({
      success: true,
      NICImage: user.NICFrontImage,
      status: user.IsNICVerified,
    });
  } catch (err) {
    console.error("getUserNICImage error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateNICImage = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or unauthorized.",
      });
    }

    // Check if NIC image exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload your NIC image.",
      });
    }

    // Upload file to Bunny CDN
    const uploaded = await uploadFileOnBunny(
      "NIC-Front",
      req.file,
      `${user.studentId}-${Date.now()}.png`
    );

    if (!uploaded || !uploaded.success) {
      if (req.file.path && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      return res.status(500).json({
        success: false,
        message: "Failed to upload NIC image to Bunny CDN.",
      });
    }

    // Update user record
    user.NICFrontImage = uploaded.url;
    user.IsNICVerified = "pending";
    await user.save();
    // 2️⃣ Define the Redis cache key (same as in getuserdata)
    const cacheKey = `user:${userId}`;

    // 3️⃣ Delete the cache for this user
    await redis.del(cacheKey);
    // Remove temp file after success
    if (req.file.path && fs.existsSync(req.file.path))
      fs.unlinkSync(req.file.path);

    return res.status(200).json({
      success: true,
      message: "NIC image uploaded successfully.",
      imageUrl: uploaded.url,
    });
  } catch (error) {
    console.error("updateNICImage error:", error);

    // Clean up leftover temp file on any error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "An unexpected error occurred while uploading NIC image.",
    });
  }
};
