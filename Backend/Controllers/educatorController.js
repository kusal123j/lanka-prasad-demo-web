import Course from "../models/courseModel.js";
import { v2 as cloudinary } from "cloudinary";
import userModel from "../models/userModel.js";
import redis from "../utils/redisClient.js";
import axios from "axios";
import archiver from "archiver";
import Category from "../models/categoryModel.js";
import Enrollment from "../models/enrollementModel.js";
import bcrypt from "bcryptjs";
import generateStudentId from "../utils/generateStudentId.js";
import VideoWatch from "../models/VideoWatchModel.js";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import mongoose from "mongoose";
import { sendSMSWithRetry } from "../utils/smsService.js";
import paymentModel from "../models/paymentModel.js";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to delete multiple redis keys safely
// Helper: delete a batch of Redis keys using your existing client
export const delKeys = async (keys = []) => {
  if (!Array.isArray(keys) || keys.length === 0) return;
  try {
    await Promise.all(keys.map((k) => redis.del(k)));
  } catch (err) {
    console.error("Redis DEL error:", err);
  }
};

// Helpers
const normalizeCourseType = (type) => {
  if (typeof type !== "string") return type;
  const t = type.trim().toLowerCase();
  if (t === "lesson pack" || t === "lesson_pack" || t === "lessonpack") {
    return "lesson-pack";
  }
  if (t === "class") return "class";
  return t;
};

const isValidObjectId = (id) =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

const parsePrice = (val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string" && val.trim() !== "") {
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
};

const truthyBool = (val) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toLowerCase() === "true";
  return Boolean(val);
};

// Add Course
export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body || {};
    if (!courseData || typeof courseData !== "object") {
      return res.status(400).json({
        success: false,
        message: "Course data is required.",
      });
    }

    let {
      courseTitle,
      courseDescription,
      courseType,
      coursePrice,
      courseThumbnail,
      isPublished,
      month,
      mainCategory,
      subCategory,
      courseContent = [],
      courseResources = [],
      zoomLink,
      youtubeLive,
    } = courseData;

    courseType = normalizeCourseType(courseType);

    // Basic validations
    if (!courseTitle || !courseTitle.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Course title is required." });
    }

    if (!["class", "lesson-pack"].includes(courseType)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid course type." });
    }

    const price = parsePrice(coursePrice);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Course price must be a non-negative number.",
      });
    }

    // Type-specific validations
    if (courseType === "class") {
      const monthVal =
        typeof month === "string" ? month.trim() : month ?? undefined;
      if (monthVal === undefined || monthVal === "") {
        return res.status(400).json({
          success: false,
          message: "Month is required for class type.",
        });
      }

      if (!mainCategory || !subCategory) {
        return res.status(400).json({
          success: false,
          message:
            "Main category and sub category are required for class type.",
        });
      }

      if (!isValidObjectId(mainCategory) || !isValidObjectId(subCategory)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mainCategory or subCategory id format.",
        });
      }

      const [mainCatDoc, subCatDoc] = await Promise.all([
        Category.findById(mainCategory),
        Category.findById(subCategory),
      ]);

      if (!mainCatDoc || !subCatDoc) {
        return res.status(400).json({
          success: false,
          message: "Invalid mainCategory or subCategory.",
        });
      }
    }

    // Build payload
    const payload = {
      courseTitle: courseTitle.trim(),
      courseDescription,
      courseType,
      coursePrice: price,
      courseThumbnail,
      isPublished: truthyBool(isPublished),
      courseContent: Array.isArray(courseContent) ? courseContent : [],
      courseResources: Array.isArray(courseResources) ? courseResources : [],
      zoomLink,
      youtubeLive,
      ...(courseType === "class"
        ? {
            month:
              typeof month === "string" ? month.trim() : month ?? undefined,
            mainCategory,
            subCategory,
          }
        : {
            month: undefined,
            mainCategory: undefined,
            subCategory: undefined,
          }),
    };

    const newCourse = await Course.create(payload);

    // Invalidate caches for the main category (only for class type)
    if (courseType === "class" && payload.mainCategory) {
      try {
        const mainCategoryDoc = await Category.findById(payload.mainCategory);
        if (mainCategoryDoc?.name) {
          const keyBase = mainCategoryDoc.name;
          await delKeys([`all_courses_${keyBase}`, `course_${newCourse._id}`]);
        }
      } catch (err) {
        console.error("Cache invalidation error (addCourse):", err);
      }
    }

    res.status(201).json({ success: true, newCourse });
  } catch (error) {
    console.error("Add course error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Edit Course
export const editCourse = async (req, res) => {
  try {
    const parsedCourseData = req.body?.courseData;
    if (!parsedCourseData || typeof parsedCourseData !== "object") {
      return res.status(400).json({
        success: false,
        message: "Course data is required.",
      });
    }

    const { courseId } = parsedCourseData;
    if (!courseId || !isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Course ID is required.",
      });
    }

    const existingCourse = await Course.findById(courseId);
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // Normalize courseType if provided
    if (parsedCourseData.courseType) {
      parsedCourseData.courseType = normalizeCourseType(
        parsedCourseData.courseType
      );
      if (!["class", "lesson-pack"].includes(parsedCourseData.courseType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course type.",
        });
      }
    }

    // Capture old mainCategory name for cache invalidation (only if class)
    let oldMainCategoryName = null;
    if (existingCourse.courseType === "class" && existingCourse.mainCategory) {
      try {
        const oldMainCatDoc = await Category.findById(
          existingCourse.mainCategory
        );
        oldMainCategoryName = oldMainCatDoc?.name || null;
      } catch {
        oldMainCategoryName = null;
      }
    }

    // Determine final type and effective values
    const targetType = parsedCourseData.courseType || existingCourse.courseType;

    let effectiveMain = existingCourse.mainCategory;
    let effectiveSub = existingCourse.subCategory;
    let effectiveMonth = existingCourse.month;

    if (
      Object.prototype.hasOwnProperty.call(parsedCourseData, "mainCategory")
    ) {
      effectiveMain = parsedCourseData.mainCategory;
    }
    if (Object.prototype.hasOwnProperty.call(parsedCourseData, "subCategory")) {
      effectiveSub = parsedCourseData.subCategory;
    }
    if (Object.prototype.hasOwnProperty.call(parsedCourseData, "month")) {
      effectiveMonth = parsedCourseData.month;
    }

    if (targetType === "class") {
      const monthVal =
        typeof effectiveMonth === "string"
          ? effectiveMonth.trim()
          : effectiveMonth ?? undefined;
      if (monthVal === undefined || monthVal === "") {
        return res.status(400).json({
          success: false,
          message: "Month is required for class type.",
        });
      }

      if (!effectiveMain || !effectiveSub) {
        return res.status(400).json({
          success: false,
          message:
            "Main category and sub category are required for class type.",
        });
      }

      if (!isValidObjectId(effectiveMain) || !isValidObjectId(effectiveSub)) {
        return res.status(400).json({
          success: false,
          message: "Invalid mainCategory or subCategory id format.",
        });
      }

      const [mainCatDoc, subCatDoc] = await Promise.all([
        Category.findById(effectiveMain),
        Category.findById(effectiveSub),
      ]);
      if (!mainCatDoc || !subCatDoc) {
        return res.status(400).json({
          success: false,
          message: "Invalid mainCategory or subCategory.",
        });
      }
    }

    // Allowed updatable fields
    const allowedFields = [
      "courseTitle",
      "courseDescription",
      "courseType",
      "coursePrice",
      "courseThumbnail",
      "isPublished",
      "month",
      "mainCategory",
      "subCategory",
      "courseContent",
      "courseResources",
      "zoomLink",
      "youtubeLive",
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(parsedCourseData, key)) {
        let val = parsedCourseData[key];

        if (key === "courseTitle" && typeof val === "string") {
          val = val.trim();
          if (!val) {
            return res.status(400).json({
              success: false,
              message: "Course title cannot be empty.",
            });
          }
        }

        if (key === "coursePrice") {
          const p = parsePrice(val);
          if (!Number.isFinite(p) || p < 0) {
            return res.status(400).json({
              success: false,
              message: "Course price must be a non-negative number.",
            });
          }
          val = p;
        }

        if (key === "isPublished") {
          val = truthyBool(val);
        }

        if (
          (key === "courseContent" || key === "courseResources") &&
          !Array.isArray(val)
        ) {
          val = [];
        }

        if (key === "month" && typeof val === "string") {
          val = val.trim();
        }

        updates[key] = val;
      }
    }

    // Harmonize based on targetType
    if (targetType === "lesson-pack") {
      updates.mainCategory = undefined;
      updates.subCategory = undefined;
      updates.month = undefined;
    } else {
      if (!Object.prototype.hasOwnProperty.call(updates, "mainCategory")) {
        updates.mainCategory = effectiveMain;
      }
      if (!Object.prototype.hasOwnProperty.call(updates, "subCategory")) {
        updates.subCategory = effectiveSub;
      }
      if (!Object.prototype.hasOwnProperty.call(updates, "month")) {
        updates.month =
          typeof effectiveMonth === "string"
            ? effectiveMonth.trim()
            : effectiveMonth ?? undefined;
      }
    }

    // Apply updates and save
    existingCourse.set(updates);
    await existingCourse.save();

    // Invalidate caches (old and new)
    const keysToDelete = [];
    if (oldMainCategoryName) {
      keysToDelete.push(
        `all_courses_${oldMainCategoryName}`,
        `course_${existingCourse._id}`
      );
    }
    if (existingCourse.courseType === "class" && existingCourse.mainCategory) {
      try {
        const newMainCatDoc = await Category.findById(
          existingCourse.mainCategory
        );
        const newMainCategoryName = newMainCatDoc?.name;
        if (newMainCategoryName) {
          keysToDelete.push(
            `all_courses_${newMainCategoryName}`,
            `course_${existingCourse._id}`
          );
        }
      } catch {
        // ignore
      }
    }

    await delKeys([...new Set(keysToDelete)]);

    res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      updatedCourse: existingCourse,
    });
  } catch (error) {
    console.error("Edit course server error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getallCoursesforeducator = async (req, res) => {
  try {
    const courses = await Course.find().select([
      "-enrolledStudents",
      "-courseContent",
    ]);
    res.status(200).json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// is educator
export const isEducator = async (req, res) => {
  res.json({ success: true });
};

//delete course by course id

export const deleteCourse = async (req, res) => {
  const { courseId } = req.body;

  try {
    const deletedCourse = await Course.findByIdAndDelete(courseId);

    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }
    await redis.del("all_courses");
    await redis.del(`course_${courseId}`);
    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to delete course,${error.message}`,
    });
  }
};
// Download student ID cards as zip
export const downloadStudentIdCardsZip = async (req, res) => {
  const { date, startDate, endDate } = req.body;

  let start, end;
  if (date) {
    start = new Date(date);
    start.setHours(0, 0, 0, 0);
    end = new Date(date);
    end.setHours(23, 59, 59, 999);
  } else if (startDate && endDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  } else {
    return res.status(400).json({
      message: "Please provide either 'date' or 'startDate' and 'endDate'",
    });
  }

  try {
    const students = await userModel.find({
      createdAt: { $gte: start, $lte: end },
      studentIdCard: { $ne: "" },
    });

    if (!students.length) {
      return res.status(404).json({ message: "No students found" });
    }

    // set response headers for zip
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=studentIdCards.zip`
    );

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    archive.pipe(res);

    // fetch each image and append to zip
    for (const student of students) {
      const url = student.studentIdCard;
      const fileName = `${student.studentId || student._id}.jpg`;

      try {
        const response = await axios({
          url,
          method: "GET",
          responseType: "arraybuffer",
        });

        archive.append(response.data, { name: fileName });
      } catch (err) {
        console.warn(`Failed to fetch image for ${fileName}: ${err.message}`);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Create the main category
export const createMainCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // check if already exists
    const exists = await Category.findOne({ name, type: "main" });
    if (exists) {
      return res.status(400).json({ error: "Main category already exists" });
    }

    const mainCategory = new Category({
      name,
      type: "main",
      parent: null,
    });

    await mainCategory.save();
    await redis.del("categories:all");
    res
      .status(201)
      .json({ success: true, message: "Main category created", mainCategory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create the sub category
export const createSubCategory = async (req, res) => {
  try {
    const { name, parentId } = req.body;

    if (!name || !parentId) {
      return res.status(400).json({ error: "Name and parentId are required" });
    }

    // check parent exists and is main category
    const parent = await Category.findById(parentId);
    if (!parent || parent.type !== "main") {
      return res.status(400).json({ error: "Invalid parent main category" });
    }

    // check if subcategory already exists
    const exists = await Category.findOne({
      name,
      type: "sub",
      parent: parentId,
    });
    if (exists) {
      return res.status(400).json({ error: "Sub category already exists" });
    }

    const subCategory = new Category({
      name,
      type: "sub",
      parent: parentId,
    });

    await subCategory.save();
    await redis.del("categories:all");
    res
      .status(201)
      .json({ success: true, message: "Sub category created", subCategory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update (Edit) Main Category
export const updateMainCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const mainCategory = await Category.findById(id);
    if (!mainCategory || mainCategory.type !== "main") {
      return res.status(404).json({ error: "Main category not found" });
    }

    const duplicate = await Category.findOne({ name, type: "main" });
    if (duplicate && duplicate._id.toString() !== id) {
      return res
        .status(400)
        .json({ error: "Main category name already exists" });
    }

    mainCategory.name = name;
    await mainCategory.save();
    await redis.del("categories:all");

    res.json({
      success: true,
      message: "Main category updated successfully",
      mainCategory,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Update (Edit) Sub Category
export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const subCategory = await Category.findById(id);
    if (!subCategory || subCategory.type !== "sub") {
      return res.status(404).json({ error: "Sub category not found" });
    }

    const duplicate = await Category.findOne({
      name,
      type: "sub",
      parent: subCategory.parent,
    });
    if (duplicate && duplicate._id.toString() !== id) {
      return res
        .status(400)
        .json({ error: "Sub category name already exists" });
    }

    subCategory.name = name;
    await subCategory.save();
    await redis.del("categories:all");

    res.json({
      success: true,
      message: "Sub category updated successfully",
      subCategory,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete Main Category (also delete its subcategories)
export const deleteMainCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const mainCategory = await Category.findById(id);
    if (!mainCategory || mainCategory.type !== "main") {
      return res.status(404).json({ error: "Main category not found" });
    }

    // Delete all subcategories linked to this main category
    await Category.deleteMany({ parent: id });
    await Category.findByIdAndDelete(id);
    await redis.del("categories:all");

    res.json({
      success: true,
      message: "Main category and its subcategories deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Delete Sub Category
export const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await Category.findById(id);
    if (!subCategory || subCategory.type !== "sub") {
      return res.status(404).json({ error: "Sub category not found" });
    }

    await Category.findByIdAndDelete(id);
    await redis.del("categories:all");

    res.json({
      success: true,
      message: "Sub category deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Get the user details by mobile number or NIC number
export const getUserDataByMobileOrNIC = async (req, res) => {
  try {
    const { phonenumber, NIC } = req.body;

    if (!phonenumber && !NIC) {
      return res.status(400).json({
        success: false,
        message: "User phonenumber or NIC number is required",
      });
    }

    // Build OR query
    const conditions = [];
    if (phonenumber) conditions.push({ phonenumber });
    if (NIC) conditions.push({ NIC });

    const user = await userModel
      .findOne({ $or: conditions })
      .populate("payments")
      .lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Step 2: Find enrollments for this user
    const enrolledCourses = await Enrollment.find({ user: user._id })
      .populate({
        path: "course",
        select: "courseTitle mainCategory subCategory month", // only fetch these
      })
      .lean();

    // Step 3: Build response
    return res.status(200).json({
      success: true,
      data: {
        userInfo: user,
        enrolledCourses: enrolledCourses.map((en) => ({
          _id: en._id,
          enrolledAt: en.enrolledAt,
          expiresAt: en.expiresAt,
          course: en.course,
        })),
        payments: user.payments,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Student Enroll Multiple Courses Manually
export const enrollStudentMultiple = async (req, res) => {
  const { phonenumber, courseIds } = req.body;

  if (!phonenumber || !Array.isArray(courseIds) || courseIds.length === 0) {
    return res.status(400).json({
      message: "Phone number and at least one Course ID are required.",
    });
  }

  try {
    // Find user
    const user = await userModel.findOne({ phonenumber });
    if (!user) return res.status(404).json({ message: "User not found." });

    const results = [];

    for (const courseId of courseIds) {
      try {
        const course = await Course.findById(courseId);
        if (!course) {
          results.push({
            courseId,
            success: false,
            message: "Course not found.",
          });
          continue;
        }

        // Check existing enrollment
        const existingEnrollment = await Enrollment.findOne({
          user: user._id,
          course: course._id,
        });

        if (existingEnrollment) {
          results.push({
            courseId,
            success: false,
            message: "User already enrolled in this course.",
          });
          continue;
        }

        // Create enrollment with 63-day expiry
        await Enrollment.create({
          user: user._id,
          course: course._id,
          expiresAt: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000),
        });

        results.push({
          courseId,
          success: true,
          message: "User successfully enrolled in course.",
        });
      } catch (err) {
        results.push({
          courseId,
          success: false,
          message: "Error enrolling in this course.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Multiple enrollment error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Student Enroll Manually
export const enrollstudentManually = async (req, res) => {
  const { phonenumber, courseId } = req.body;
  if (!phonenumber || !courseId) {
    return res
      .status(400)
      .json({ message: "Phone number and Course ID are required." });
  }
  try {
    const user = await userModel.findOne({ phonenumber });
    if (!user) return res.status(404).json({ message: "User not found." });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: user._id,
      course: course._id,
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: "User already enrolled in this course.",
      });
    }

    // Create new enrollment with 63-day expiry
    await Enrollment.create({
      user: user._id,
      course: course._id,
      expiresAt: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000), // 63 days
    });

    return res.status(200).json({
      success: true,
      message: "User successfully enrolled in course.",
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Bulk Student Enrollment
export const enrollStudentsBulk = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Excel file is required." });
    }

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required." });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1, // Get raw rows (array of arrays)
      defval: "", // Prevent undefined
    });

    // Extract phone numbers (first column only)
    const phoneNumbers = sheetData.map((row) => row[0]).filter(Boolean);

    if (!phoneNumbers.length) {
      return res
        .status(400)
        .json({ message: "No phone numbers found in file." });
    }

    let failedUsers = [];
    let successCount = 0;

    for (const phonenumber of phoneNumbers) {
      try {
        const user = await userModel.findOne({ phonenumber });

        if (!user) {
          failedUsers.push({ phonenumber, error: "User not found" });
          continue;
        }

        const existingEnrollment = await Enrollment.findOne({
          user: user._id,
          course: course._id,
        });

        if (existingEnrollment) {
          failedUsers.push({
            phonenumber,
            error: "Already enrolled in this course",
          });
          continue;
        }

        // Enroll user with 63-day expiry
        await Enrollment.create({
          user: user._id,
          course: course._id,
          expiresAt: new Date(Date.now() + 63 * 24 * 60 * 60 * 1000),
        });

        await paymentModel.create({
          user: user._id,
          course: course._id,
          amount: course.coursePrice,
          address: user.Address,
          phonenumber1: user.tuteDliveryPhoennumebr1,
          phonenumber2: user.tuteDliveryPhoennumebr2,
          paymentStatus: "completed",
        });

        successCount++;
      } catch (err) {
        console.error(`Error enrolling ${phonenumber}:`, err.message);
        failedUsers.push({ phonenumber, error: "Enrollment error" });
        continue;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk enrollment completed. ${successCount} users enrolled successfully.`,
      failedUsers,
    });
  } catch (error) {
    console.error("Bulk Enrollment Error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Unenroll the student from the course
export const unenrollstudentManually = async (req, res) => {
  const { phonenumber, courseId } = req.body;

  if (!phonenumber || !courseId) {
    return res
      .status(400)
      .json({ message: "Phone number and Course ID are required." });
  }

  try {
    const user = await userModel.findOne({ phonenumber });
    if (!user) return res.status(404).json({ message: "User not found." });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    // Check if enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: user._id,
      course: course._id,
    });

    if (!existingEnrollment) {
      return res.status(404).json({
        success: false,
        message: "User is not enrolled in this course.",
      });
    }

    // Delete enrollment
    await Enrollment.deleteOne({ _id: existingEnrollment._id });

    return res.status(200).json({
      success: true,
      message: "User successfully unenrolled from course.",
    });
  } catch (error) {
    console.error("Unenrollment error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const allowedExamYears = [
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
];
const allowedGenders = ["Male", "Female", "Other"];
const allowedRoles = ["student", "instructor", "admin"]; // Optional: adjust to your roles

const phoneRegex = /^[0-9]{10}$/;
const nameRegex = /^[A-Za-z\s\-]{2,15}$/;

// If you already have a util for this, reuse it.
function isIsoDate(str) {
  if (typeof str !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === str;
}

// Register user by admin (new version)
export const registerUserByAdmin = async (req, res) => {
  try {
    const {
      name,
      lastname,
      phonenumber,
      password,
      BirthDay,
      Gender,
      Address,
      School,
      ExamYear,
      District,
      tuteDliveryPhoennumebr1,
      tuteDliveryPhoennumebr2,
      role, // optional
    } = req.body;

    // Required fields (mirrors the self-register endpoint)
    const required = {
      name,
      lastname,
      Address,
      School,
      District,
      phonenumber,
      password,
      BirthDay,
      Gender,
      ExamYear,
      tuteDliveryPhoennumebr1,
      tuteDliveryPhoennumebr2,
    };

    for (const [key, value] of Object.entries(required)) {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message: `${key} is required.`,
        });
      }
    }

    // Validate names
    if (!nameRegex.test(String(name))) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid first name (2–15 letters, spaces and hyphens allowed).",
      });
    }
    if (lastname && !nameRegex.test(String(lastname))) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid last name (2–15 letters, spaces and hyphens allowed).",
      });
    }

    // Validate ExamYear and Gender
    if (!allowedExamYears.includes(String(ExamYear))) {
      return res.status(400).json({
        success: false,
        message: `Invalid Exam Year. Allowed: ${allowedExamYears.join(", ")}.`,
      });
    }
    if (!allowedGenders.includes(String(Gender))) {
      return res.status(400).json({
        success: false,
        message: "Invalid Gender value.",
      });
    }

    // Validate phone numbers
    if (!phoneRegex.test(String(phonenumber))) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number (must be 10 digits).",
      });
    }
    if (
      !phoneRegex.test(String(tuteDliveryPhoennumebr1)) ||
      !phoneRegex.test(String(tuteDliveryPhoennumebr2))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid tute delivery phone number(s) (must be 10 digits).",
      });
    }
    if (String(tuteDliveryPhoennumebr1) === String(tuteDliveryPhoennumebr2)) {
      return res.status(400).json({
        success: false,
        message:
          "tuteDliveryPhoennumebr1 and tuteDliveryPhoennumebr2 must be different.",
      });
    }

    // Validate BirthDay (expects YYYY-MM-DD)
    if (!isIsoDate(String(BirthDay))) {
      return res.status(400).json({
        success: false,
        message: "Invalid BirthDay format (use YYYY-MM-DD).",
      });
    }

    // Optional string type checks
    if (
      Address !== undefined &&
      Address !== null &&
      typeof Address !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Address must be a string.",
      });
    }
    if (School !== undefined && School !== null && typeof School !== "string") {
      return res.status(400).json({
        success: false,
        message: "School must be a string.",
      });
    }
    if (
      District !== undefined &&
      District !== null &&
      typeof District !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "District must be a string.",
      });
    }

    // Password strength (simple)
    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // Optional: validate role if provided
    if (role !== undefined && role !== null) {
      if (!allowedRoles.includes(String(role))) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Allowed: ${allowedRoles.join(", ")}.`,
        });
      }
    }

    // Duplicate checks
    const existingUser = await userModel.findOne({ phonenumber });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this phone number.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(String(password), 10);

    // Generate a unique studentId
    const studentId = await generateStudentId();

    // Create user (no session manipulation for admin-created users)
    const user = await userModel.create({
      name,
      lastname,
      studentId,
      phonenumber,
      password: hashedPassword,
      BirthDay,
      Gender,
      Address,
      School,
      ExamYear,
      District,
      tuteDliveryPhoennumebr1,
      tuteDliveryPhoennumebr2,
      ...(role ? { role } : {}), // only set if provided
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully by admin.",
      data: {
        id: user._id,
        studentId: user.studentId,
        phonenumber: user.phonenumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Admin register error:", error);
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res
        .status(409)
        .json({ success: false, message: `Duplicate value for ${field}.` });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

// Edit user manually (by Admin)
export const editUserManually = async (req, res) => {
  try {
    const { userId } = req.params; // ✅ User ID from URL
    const {
      name,
      lastname,
      phonenumber,
      NIC,
      ExamYear,
      role,
      BirthDay,
      Gender,
      isAccountVerified,
    } = req.body;

    const allowedExamYears = ["2025", "2026", "2027"];

    // ✅ Find the user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // === Exam year validation ===
    if (ExamYear && !allowedExamYears.includes(String(ExamYear))) {
      return res.status(400).json({
        success: false,
        message: "Invalid Exam Year. Allowed: 2025, 2026, 2027.",
      });
    }

    // ✅ Check if phone or NIC already exists (excluding current user)
    if (phonenumber || NIC) {
      const existingUser = await userModel.findOne({
        $or: [{ phonenumber }, { NIC }],
        _id: { $ne: userId }, // exclude current user
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Phone number or NIC already in use." });
      }
    }

    // ✅ Update allowed fields
    if (name) user.name = name;
    if (lastname) user.lastname = lastname;
    if (phonenumber) user.phonenumber = phonenumber;
    if (NIC) user.NIC = NIC;
    if (ExamYear) user.ExamYear = ExamYear;
    if (role) user.role = role;
    if (BirthDay) user.BirthDay = BirthDay;
    if (Gender) user.Gender = Gender;
    if (typeof isAccountVerified === "boolean")
      user.isAccountVerifyed = isAccountVerified;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Manual edit error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Delete user by phone number
export const deleteUser = async (req, res) => {
  try {
    const { phonenumber } = req.params; // ✅ match with route

    if (!phonenumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const deletedUser = await userModel.findOneAndDelete({ phonenumber });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Bulk unenroll students from a course
export const bulkunenrollfromcourse = async (req, res) => {
  try {
    // Accept both body.courseId and body.courseID
    const courseId = req.body?.courseId || req.body?.courseID;
    if (!courseId) {
      return res
        .status(400)
        .json({ ok: false, message: "courseId is required in request body" });
    }
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ ok: false, message: "Invalid courseId" });
    }

    // Ensure course exists
    const course = await Course.findById(courseId)
      .select("_id courseTitle")
      .lean();
    if (!course) {
      return res.status(404).json({ ok: false, message: "Course not found" });
    }

    // Find all enrollments first so we can return which users were affected
    const enrollments = await Enrollment.find({ course: courseId })
      .select("user")
      .lean();

    if (enrollments.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "No students are currently enrolled in this course",
        courseId: course._id,
        courseTitle: course.courseTitle,
        unenrolledCount: 0,
        users: [],
      });
    }

    const affectedUserIds = enrollments.map((e) => e.user);

    // Delete all enrollments for this course
    const { deletedCount } = await Enrollment.deleteMany({ course: courseId });

    return res.status(200).json({
      ok: true,
      message: "All enrolled students have been unenrolled from the course",
      courseId: course._id,
      courseTitle: course.courseTitle,
      unenrolledCount: deletedCount || 0,
      users: affectedUserIds, // remove if you don't want to expose IDs
    });
  } catch (err) {
    console.error("bulk-unenroll error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to bulk unenroll students",
      error: err.message,
    });
  }
};

export const updateNICVerifyStatus = async (req, res) => {
  const { status, userID } = req.body;

  const validStatuses = ["pending", "completed", "failed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid NIC verify status. Allowed: pending, completed, failed.",
    });
  }

  try {
    const user = await userModel.findByIdAndUpdate(
      userID,
      { IsNICVerified: status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // 2️⃣ Define the Redis cache key (same as in getuserdata)
    const cacheKey = `user:${userID}`;

    // 3️⃣ Delete the cache for this user
    await redis.del(cacheKey);
    return res.status(200).json({
      success: true,
      message: "NIC Verify status updated successfully.",
    });
  } catch (error) {
    console.error("Error updating NIC Verify status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating NIC Verify status.",
      error: error.message,
    });
  }
};
export const getAllPendingNICVerifications = async (req, res) => {
  try {
    // 1️⃣ Get the page number from query, default = 1
    const page = parseInt(req.query.page) || 1;

    // 2️⃣ Set number of users per page
    const limit = 10;

    // 3️⃣ Calculate how many records to skip
    const skip = (page - 1) * limit;

    // 4️⃣ Find users whose NIC verification is pending
    const pendingUsers = await userModel
      .find({ IsNICVerified: "pending" })
      .select("name lastname phonenumber NIC ExamYear NICFrontImage") // only send required fields
      .skip(skip)
      .limit(limit)
      .lean(); // lean() returns plain JS objects (faster)

    // 5️⃣ Count total pending users (for pagination)
    const totalPending = await userModel.countDocuments({
      IsNICVerified: "pending",
    });

    // 6️⃣ Calculate total pages
    const totalPages = Math.ceil(totalPending / limit);

    // 7️⃣ Send response
    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPages,
      totalPending,
      usersPerPage: limit,
      users: pendingUsers,
    });
  } catch (error) {
    console.error("Error fetching pending NIC verifications:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error while fetching pending NIC verifications",
    });
  }
};

export const TuteTrackingNumberCreateWithExcelSheet = async (req, res) => {
  const cleanupUploadedFile = async () => {
    if (req.file?.path) {
      try {
        await unlink(req.file.path);
      } catch (_) {}
    }
  };

  try {
    const { courseId } = req.body;

    if (!courseId) {
      await cleanupUploadedFile();
      return res
        .status(400)
        .json({ ok: false, message: "courseId is required in body" });
    }
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      await cleanupUploadedFile();
      return res.status(400).json({ ok: false, message: "Invalid courseId" });
    }
    if (!req.file?.path) {
      return res.status(400).json({
        ok: false,
        message: "No file uploaded (field name must be 'file')",
      });
    }

    // Read first sheet from Excel file
    const workbook = XLSX.readFile(req.file.path, { cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      await cleanupUploadedFile();
      return res
        .status(400)
        .json({ ok: false, message: "No sheets found in excel file" });
    }
    const worksheet = workbook.Sheets[sheetName];

    // header:1 -> returns rows as arrays, no header; raw:false uses formatted text which helps preserve leading zeros if cells are text
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      blankrows: false,
      defval: "",
    });

    // Filter and shape rows -> [phone, tracking]
    const rows = rawRows
      .map((r) => [r[0], r[1]])
      .filter((r) => r && (r[0] !== "" || r[1] !== ""));

    const summary = {
      ok: true,
      courseId,
      totalRows: rows.length,
      processed: 0,
      success: 0,
      failures: 0,
      details: [],
    };

    // Helper: normalize phone numbers (keep 0-leading, handle 94-country variant, remove non-digits)
    const normalizePhone = (val) => {
      let s = String(val ?? "").trim();
      s = s.replace(/[^\d]/g, ""); // keep only digits
      if (s.startsWith("94") && s.length === 11) {
        s = "0" + s.slice(2); // 9470XXXXXXX -> 070XXXXXXX
      }
      if (s.length === 9) {
        s = "0" + s; // sometimes Excel strips leading 0
      }
      return s;
    };

    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 1; // human-readable row number
      const [phoneCell, trackingCell] = rows[i];

      // Validate row content
      if (!phoneCell || !trackingCell) {
        summary.failures++;
        summary.details.push({
          row: rowIndex,
          phone: phoneCell || null,
          tracking: trackingCell || null,
          status: "skipped",
          reason: "Missing phone or tracking number",
        });
        continue;
      }

      const phone = normalizePhone(phoneCell);
      const trackingNumber = String(trackingCell).trim();

      try {
        // Find the user by unique phone number
        const user = await userModel.findOne({ phonenumber: phone });
        if (!user) {
          summary.failures++;
          summary.details.push({
            row: rowIndex,
            phone,
            tracking: trackingNumber,
            status: "failed",
            reason: "User not found",
          });
          continue;
        }

        // Find completed payment for this course
        const payment = await paymentModel
          .findOne({
            user: user._id,
            course: courseId,
            paymentStatus: "completed",
          })
          .sort({ createdAt: -1 });

        if (!payment) {
          summary.failures++;
          summary.details.push({
            row: rowIndex,
            phone,
            tracking: trackingNumber,
            status: "failed",
            reason: "No completed payment for this course",
          });
          continue;
        }

        if (payment.trackingNumber && payment.trackingNumber.trim() !== "") {
          summary.failures++;
          summary.details.push({
            row: rowIndex,
            phone,
            tracking: trackingNumber,
            status: "skipped",
            reason: "Tracking number already exists",
          });
          continue;
        }

        // Save tracking number
        payment.trackingNumber = trackingNumber;
        await payment.save();

        // Build SMS
        const estimated = new Date();
        estimated.setDate(estimated.getDate() + 3);
        const estimatedStr = estimated.toLocaleDateString("en-LK", {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "Asia/Colombo",
        });
        const serviceMap = { slpost: "SL Post", courier: "Courier" };
        const deliveryService =
          serviceMap[payment.deliveryBy] || payment.deliveryBy;

        const trackingmessage = `Dear ${user.name},
Your Tute Pack has been dispatched!
Tracking ID: ${trackingNumber}
Tute Delivery Address : ${payment.address}
Estimated Delivery: ${estimatedStr}
Delivery Service: ${deliveryService}
Delivery Service Hotline: 011-2328301`;

        // Send SMS (retry helper provided by you)
        try {
          await sendSMSWithRetry(
            user.phonenumber,
            "TEAMICT",
            trackingmessage,
            5,
            3000
          );
          summary.success++;
          summary.processed++;
          summary.details.push({
            row: rowIndex,
            phone,
            tracking: trackingNumber,
            status: "success",
          });
        } catch (smsErr) {
          // Keep the saved tracking even if SMS fails
          summary.processed++;
          summary.details.push({
            row: rowIndex,
            phone,
            tracking: trackingNumber,
            status: "saved_but_sms_failed",
            reason: smsErr?.message || "SMS failed",
          });
        }
      } catch (rowErr) {
        summary.failures++;
        summary.details.push({
          row: rowIndex,
          phone,
          tracking: String(trackingCell).trim(),
          status: "failed",
          reason: rowErr?.message || "Unknown error",
        });
      }
    }

    await cleanupUploadedFile();
    return res.status(200).json(summary);
  } catch (err) {
    await cleanupUploadedFile();
    return res.status(500).json({
      ok: false,
      message: "Failed to process the file",
      error: err?.message || "Unknown error",
    });
  }
};

// ---------- helpers ----------

// helper: date formatting in Sri Lankan time
const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);

  // Convert to Sri Lanka time offset (+5:30)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const sriLankaOffset = 5.5 * 60 * 60000;
  const sriLankaTime = new Date(utc + sriLankaOffset);

  const pad = (n) => String(n).padStart(2, "0");

  return `${sriLankaTime.getFullYear()}-${pad(
    sriLankaTime.getMonth() + 1
  )}-${pad(sriLankaTime.getDate())} ${pad(sriLankaTime.getHours())}:${pad(
    sriLankaTime.getMinutes()
  )}:${pad(sriLankaTime.getSeconds())}`;
};

// Remove characters that standard PDF fonts (Helvetica) can’t render.
// This prevents fontkit from being involved when we switch to standard fonts.
const sanitizeForStandardFont = (text) => {
  const s = String(text ?? "");
  // Keep printable ASCII + tabs/newlines; replace others with '?'
  return s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
};

// Safely set a font, falling back to a standard font if needed
const safeSetFont = (doc, preferredFont, standardFont) => {
  try {
    if (preferredFont) {
      doc.font(preferredFont);
      return preferredFont;
    }
  } catch (e) {
    // ignore and fall through to standard
  }
  doc.font(standardFont);
  return standardFont;
};

// Height measurement that survives fontkit errors.
// If measuring with the preferred font fails, it will retry with standard fonts and sanitized text.
const safeHeightOfString = (doc, text, width, fonts, fontKey, fontSize) => {
  const standard = fontKey === "header" ? fonts.stdHeader : fonts.stdBody;
  const preferred = fonts[fontKey];

  try {
    safeSetFont(doc, preferred, standard);
    doc.fontSize(fontSize);
    return doc.heightOfString(String(text ?? ""), {
      width: Math.max(1, width),
    });
  } catch (_) {
    // retry with standard font + sanitized text
    safeSetFont(doc, standard, standard);
    doc.fontSize(fontSize);
    return doc.heightOfString(sanitizeForStandardFont(text), {
      width: Math.max(1, width),
    });
  }
};

// Text drawing that survives fontkit errors per draw.
const safeText = (doc, text, x, y, options, fonts, fontKey, fontSize) => {
  const standard = fontKey === "header" ? fonts.stdHeader : fonts.stdBody;
  const preferred = fonts[fontKey];

  try {
    safeSetFont(doc, preferred, standard);
    doc.fontSize(fontSize);
    doc.text(String(text ?? ""), x, y, options);
  } catch (_) {
    // retry with standard font + sanitized text
    safeSetFont(doc, standard, standard);
    doc.fontSize(fontSize);
    const clean = sanitizeForStandardFont(text);
    doc.text(clean, x, y, options);
  }
};

// Draw a table with repeating header using safe measurement/draw calls
function drawTableSafe(doc, columns, rows, opts = {}, fonts) {
  const marginLeft = doc.page.margins.left;
  const marginRight = doc.page.margins.right;
  const marginTop = doc.page.margins.top;
  const marginBottom = doc.page.margins.bottom;

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - marginLeft - marginRight;

  const headerFontSize = opts.headerFontSize ?? 10;
  const bodyFontSize = opts.bodyFontSize ?? 9;
  const padX = opts.padX ?? 4;
  const padY = opts.padY ?? 3;
  const borderColor = opts.borderColor || "#CCCCCC";
  const headerFill = opts.headerFill || "#F2F2F2";
  const zebraFill = opts.zebraFill || "#FBFBFB";

  const xStart = marginLeft;
  let y = opts.startY || doc.y || marginTop;

  // Scale widths if they exceed the page content width
  const originalWidths = columns.map((c) => c.width);
  let totalWidth = originalWidths.reduce((a, b) => a + b, 0);
  let scale = totalWidth > contentWidth ? contentWidth / totalWidth : 1;
  const widths = originalWidths.map((w) => Math.floor(w * scale));
  const tableWidth = widths.reduce((a, b) => a + b, 0);

  const needNewPage = (heightNeeded) =>
    y + heightNeeded > doc.page.height - marginBottom;

  const drawHeader = () => {
    // compute header height (safe)
    const headerHeights = columns.map((col, i) =>
      safeHeightOfString(
        doc,
        String(col.header ?? ""),
        Math.max(1, widths[i] - 2 * padX),
        fonts,
        "header",
        headerFontSize
      )
    );
    const headerHeight = Math.max(...headerHeights, 10) + 2 * padY;

    // header background
    doc.save();
    doc.rect(xStart, y, tableWidth, headerHeight).fill(headerFill);
    doc.restore();

    // header text
    doc.fillColor("#000");
    let x = xStart;
    columns.forEach((col, i) => {
      safeText(
        doc,
        String(col.header ?? ""),
        x + padX,
        y + padY,
        {
          width: Math.max(1, widths[i] - 2 * padX),
          align: col.headerAlign || "left",
        },
        fonts,
        "header",
        headerFontSize
      );
      x += widths[i];
    });

    // header borders
    doc.strokeColor(borderColor).lineWidth(0.5);
    // top and bottom line of header
    doc
      .moveTo(xStart, y)
      .lineTo(xStart + tableWidth, y)
      .stroke();
    doc
      .moveTo(xStart, y + headerHeight)
      .lineTo(xStart + tableWidth, y + headerHeight)
      .stroke();
    // vertical lines for header
    let vx = xStart;
    for (let i = 0; i <= columns.length; i++) {
      doc
        .moveTo(vx, y)
        .lineTo(vx, y + headerHeight)
        .stroke();
      vx += widths[i] || 0;
    }

    y += headerHeight;
  };

  const drawRow = (row, rowIndex) => {
    // compute row height (safe)
    const cellHeights = row.map((cell, i) =>
      safeHeightOfString(
        doc,
        String(cell ?? ""),
        Math.max(1, widths[i] - 2 * padX),
        fonts,
        "body",
        bodyFontSize
      )
    );
    const rowHeight = Math.max(...cellHeights, 9) + 2 * padY;

    // page break if needed
    if (needNewPage(rowHeight)) {
      doc.addPage({
        size: "A4",
        layout: "landscape",
        margins: doc.page.margins,
      });
      y = doc.y; // reset to top margin
      drawHeader();
    }

    // zebra background
    if (rowIndex % 2 === 1) {
      doc.save();
      doc.rect(xStart, y, tableWidth, rowHeight).fill(zebraFill);
      doc.restore();
    }

    // cell text
    doc.fillColor("#000");
    let x = xStart;
    row.forEach((cell, i) => {
      const align = columns[i].align || "left";
      safeText(
        doc,
        String(cell ?? ""),
        x + padX,
        y + padY,
        { width: Math.max(1, widths[i] - 2 * padX), align },
        fonts,
        "body",
        bodyFontSize
      );
      x += widths[i];
    });

    // row borders
    doc.strokeColor(borderColor).lineWidth(0.5);
    // bottom line of row
    doc
      .moveTo(xStart, y + rowHeight)
      .lineTo(xStart + tableWidth, y + rowHeight)
      .stroke();
    // vertical lines for row
    let vx = xStart;
    for (let i = 0; i <= columns.length; i++) {
      doc
        .moveTo(vx, y)
        .lineTo(vx, y + rowHeight)
        .stroke();
      vx += widths[i] || 0;
    }

    y += rowHeight;
  };

  // ensure space for header
  const headerHeightCheck =
    Math.max(
      ...columns.map((col, i) =>
        safeHeightOfString(
          doc,
          String(col.header ?? ""),
          Math.max(1, widths[i] - 2 * padX),
          fonts,
          "header",
          headerFontSize
        )
      ),
      10
    ) +
    2 * padY;

  if (needNewPage(headerHeightCheck)) {
    doc.addPage({ size: "A4", layout: "landscape", margins: doc.page.margins });
    y = doc.page.margins.top;
  }

  drawHeader();
  rows.forEach((row, idx) => drawRow(row, idx));
}

// helper to extract chapter and lecture title
const getChapterAndLectureTitle = (course, chapterId, lectureId) => {
  if (!course || !course.courseContent)
    return { chapterName: "", lectureName: "" };

  // In case _id/ObjectId mismatches, compare as strings
  const chapter = course.courseContent.find(
    (c) => String(c.chapterId) === String(chapterId)
  );
  if (!chapter) return { chapterName: "", lectureName: "" };

  const lecture = chapter.chapterContent.find(
    (l) => String(l.lectureId) === String(lectureId)
  );
  return {
    chapterName: chapter.chapterTitle ?? "",
    lectureName: lecture?.lectureTitle ?? "",
  };
};

// Try to register Sinhala fonts. Returns font map:
// { body, header, stdBody, stdHeader }
const prepareFonts = (doc) => {
  const fontDir = path.join(__dirname, "../Fonts");
  const sinhalaRegular = path.join(fontDir, "NotoSansSinhala-Regular.ttf");
  const sinhalaBold = path.join(fontDir, "NotoSansSinhala-Bold.ttf");

  // Always-available standard fonts (no fontkit usage)
  const stdBody = "Helvetica";
  const stdHeader = "Helvetica-Bold";

  let body = stdBody;
  let header = stdHeader;

  // Robust check for custom fonts
  try {
    const regExists =
      fs.existsSync(sinhalaRegular) && fs.statSync(sinhalaRegular).size > 1024;
    if (regExists) {
      doc.registerFont("Sinhala", fs.readFileSync(sinhalaRegular));
      let boldExists = false;
      if (fs.existsSync(sinhalaBold) && fs.statSync(sinhalaBold).size > 1024) {
        doc.registerFont("Sinhala-Bold", fs.readFileSync(sinhalaBold));
        boldExists = true;
      }

      // Validate by actually measuring a string with Sinhala + ASCII
      try {
        doc.font(boldExists ? "Sinhala-Bold" : "Sinhala");
        void doc.widthOfString(
          "FontTest අආඇ ඉඊ උ ඌ ක ග ජ ට ප ෙ ි ඬ ● 0123456789"
        );
        // If we got here, font seems OK
        body = "Sinhala";
        header = boldExists ? "Sinhala-Bold" : "Sinhala";
      } catch (fontErr) {
        console.warn(
          "Sinhala font failed validation, using standard fonts. Error:",
          fontErr?.message || fontErr
        );
        body = stdBody;
        header = stdHeader;
      }
    }
  } catch (e) {
    console.warn(
      "Error registering/validating Sinhala fonts. Falling back to standard fonts:",
      e?.message || e
    );
    body = stdBody;
    header = stdHeader;
  }

  return { body, header, stdBody, stdHeader };
};

// ---------- main export ----------

export const exportVideoWatchesPdf = async (req, res) => {
  try {
    const videoWatches = await VideoWatch.find()
      .populate("user", "name phonenumber")
      .populate("course");

    // Build column definitions (wider for long texts if needed)
    const columns = [
      { header: "User Name", key: "userName", width: 120 },
      { header: "User Phonenumber", key: "phonenumber", width: 120 },
      { header: "Course Title", key: "courseTitle", width: 140 },
      { header: "Chapter Name", key: "chapterName", width: 160 },
      { header: "Lecture Name", key: "lectureName", width: 160 },
      { header: "Start Time", key: "startTime", width: 110 },
      { header: "End Time", key: "endTime", width: 110 },
      {
        header: "Watched (sec)",
        key: "watchedDuration",
        width: 80,
        align: "right",
      },
      { header: "Active", key: "isActive", width: 60, align: "center" },
      { header: "Created At", key: "createdAt", width: 110 },
    ];

    const rows = videoWatches.map((vw) => {
      const { chapterName, lectureName } = getChapterAndLectureTitle(
        vw.course,
        vw.chapterId,
        vw.lectureId
      );
      const row = {
        userName: vw.user?.name ?? "N/A",
        phonenumber: vw.user?.phonenumber ?? "N/A",
        courseTitle: vw.course?.courseTitle ?? "N/A",
        chapterName,
        lectureName,
        startTime: vw.startTime ? formatDate(vw.startTime) : "",
        endTime: vw.endTime ? formatDate(vw.endTime) : "",
        watchedDuration: String(vw.watchedDuration ?? 0),
        isActive: vw.isActive ? "Yes" : "No",
        createdAt: formatDate(vw.createdAt),
      };
      return columns.map((c) => String(row[c.key] ?? ""));
    });

    const now = formatDate(new Date());
    const safeNow = now.replace(/[: ]/g, "-");

    // Create doc with buffered pages for reliable page numbers
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 40, bottom: 40, left: 20, right: 20 },
      bufferPages: true,
      info: {
        Title: `Video Watches - ${safeNow}`,
        Author: "KJ Developers",
        Creator: "KJ Developers",
      },
    });

    // Attach an error handler on the document stream (belt and suspenders)
    let docFatalError = null;
    doc.on("error", (err) => {
      docFatalError = err;
      console.error("PDFKit stream error:", err);
    });

    // Decide fonts (custom Sinhala if valid, otherwise standard)
    const fonts = prepareFonts(doc);

    // Buffer the output
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      // If the underlying stream errored, bail with JSON 500 (only if headers not sent)
      if (docFatalError && !res.headersSent) {
        return res
          .status(500)
          .json({ message: "Server error exporting video watches (PDF)" });
      }

      const pdfBuffer = Buffer.concat(chunks);
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="video_watches_${safeNow}.pdf"`
        );
        res.setHeader("Content-Length", pdfBuffer.length);
        res.end(pdfBuffer);
      }
    });

    // Title (draw with safe helpers; if Sinhala font fails, it will auto-fallback)
    try {
      safeSetFont(doc, fonts.header, fonts.stdHeader);
      doc.fontSize(16).fillColor("#000");
      const title = `Video Watches - ${now}`;
      // Title with a bit of robustness: try Sinhala, fallback to standard+sanitized
      try {
        doc.text(title, { align: "center" });
      } catch (_) {
        doc.font(fonts.stdHeader).text(sanitizeForStandardFont(title), {
          align: "center",
        });
      }
    } catch (e) {
      // As a last resort, simple title with standard font
      doc.font(fonts.stdHeader).fontSize(16).text("Video Watches", {
        align: "center",
      });
    }

    doc.moveDown(0.5);

    // Table
    let tableFailed = false;
    try {
      drawTableSafe(
        doc,
        columns,
        rows,
        {
          startY: doc.y + 5,
          headerFontSize: 10,
          bodyFontSize: 9,
          padX: 4,
          padY: 3,
          borderColor: "#CCCCCC",
          headerFill: "#F2F2F2",
          zebraFill: "#FBFBFB",
        },
        {
          header: fonts.header,
          body: fonts.body,
          stdHeader: fonts.stdHeader,
          stdBody: fonts.stdBody,
        }
      );
    } catch (tblErr) {
      console.error("Error drawing table (safe):", tblErr);
      tableFailed = true;
    }

    // If table failed for any reason, write a safe, plain list with standard font only
    if (tableFailed) {
      doc
        .moveDown(1)
        .font(fonts.stdBody)
        .fontSize(10)
        .fillColor("#000000")
        .text(
          "An error occurred while drawing the table. Showing plain list instead (non-ASCII characters may be replaced)."
        )
        .moveDown(0.5);

      videoWatches.forEach((vw, idx) => {
        const { chapterName, lectureName } = getChapterAndLectureTitle(
          vw.course,
          vw.chapterId,
          vw.lectureId
        );
        const line = [
          `#${idx + 1}`,
          `User: ${vw.user?.name ?? "N/A"} (${vw.user?.phonenumber ?? "N/A"})`,
          `Course: ${vw.course?.courseTitle ?? "N/A"}`,
          `Chapter: ${chapterName}`,
          `Lecture: ${lectureName}`,
          `Start: ${vw.startTime ? formatDate(vw.startTime) : ""}`,
          `End: ${vw.endTime ? formatDate(vw.endTime) : ""}`,
          `Watched(s): ${String(vw.watchedDuration ?? 0)}`,
          `Active: ${vw.isActive ? "Yes" : "No"}`,
          `Created: ${formatDate(vw.createdAt)}`,
        ].join(" | ");

        // Force standard fonts with sanitized text to avoid fontkit
        doc.font(fonts.stdBody).fontSize(9).text(sanitizeForStandardFont(line));
      });
    }

    // Page numbers (always standard fonts to avoid any fontkit involvement)
    try {
      const range = doc.bufferedPageRange(); // { start, count }
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const pageNum = i + 1;
        doc.font(fonts.stdBody).fontSize(8).fillColor("#666");
        doc.text(
          `Page ${pageNum} of ${range.count}`,
          0,
          doc.page.height - doc.page.margins.bottom + 15,
          { width: doc.page.width, align: "center" }
        );
      }
    } catch (pnErr) {
      console.warn("Failed to add page numbers (continuing):", pnErr);
    }

    doc.end();
  } catch (error) {
    console.error("Error exporting video watches (PDF):", error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ message: "Server error exporting video watches (PDF)" });
    }
  }
};
