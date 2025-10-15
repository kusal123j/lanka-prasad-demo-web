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

export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body;

    if (!courseData) {
      return res.status(400).json({
        success: false,
        message: "Course data is required.",
      });
    }

    // courseData is already parsed object now
    const newCourse = await Course.create(courseData);

    const mainCategory = await Category.findById(newCourse.mainCategory);
    if (mainCategory?.name) {
      await redis.del(`all_courses_${mainCategory.name}`);
    }

    res.status(200).json({ success: true, newCourse });
  } catch (error) {
    console.error("Add course error:", error); // <== log actual error
    res.status(500).json({ success: false, error: error.message });
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

// Backend: editCourse controller
export const editCourse = async (req, res) => {
  try {
    const parsedCourseData = req.body.courseData;
    if (!parsedCourseData) {
      return res.status(400).json({
        success: false,
        message: "Course data is required.",
      });
    }

    const { courseId } = parsedCourseData;
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is missing.",
      });
    }

    const existingCourse = await Course.findById(courseId).populate(
      "mainCategory"
    );
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // Update course fields
    Object.keys(parsedCourseData).forEach((key) => {
      existingCourse[key] = parsedCourseData[key];
    });

    await existingCourse.save();

    // Invalidate caches if needed
    if (existingCourse.mainCategory) {
      const examYear = existingCourse.mainCategory.name;
      await redis.del(`all_courses_${examYear}`);
      await redis.del(`course_${courseId}_${examYear}`);
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      updatedCourse: existingCourse,
    });
  } catch (error) {
    console.error("❌ Edit course server error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
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

// Register the user manully.
export const registerUserManually = async (req, res) => {
  try {
    const {
      name,
      lastname,
      phonenumber,
      NIC,
      ExamYear,
      role,
      password,
      institute,
      BirthDay,
      Gender,
    } = req.body;
    const allowedExamYears = ["2025", "2026", "2027"];
    // ✅ Validate required fields
    if (
      !name ||
      !lastname ||
      !phonenumber ||
      !NIC ||
      !ExamYear ||
      !role ||
      !password ||
      !institute ||
      !BirthDay ||
      !Gender
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }
    // === Exam year ===
    if (!allowedExamYears.includes(String(ExamYear))) {
      return res.status(400).json({
        success: false,
        message: "Invalid Exam Year. Allowed: 2025, 2026, 2027.",
      });
    }
    // ✅ Check if phone or NIC already exists
    const existingUser = await userModel.findOne({
      $or: [{ phonenumber }, { NIC }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with phone or NIC already exists." });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate student ID & OTP
    const studentId = await generateStudentId();

    // ✅ Create user
    const newUser = new userModel({
      name,
      lastname,
      phonenumber,
      NIC,
      ExamYear,
      role,
      password: hashedPassword,
      institute,
      BirthDay,
      Gender,
      studentId,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User registered successfully by admin.",
    });
  } catch (error) {
    console.error("Manual register error:", error);
    return res.status(500).json({ message: "Internal server error." });
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
