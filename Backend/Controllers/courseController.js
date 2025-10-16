import Category from "../models/categoryModel.js";
import Course from "../models/courseModel.js";
import userModel from "../models/userModel.js";
import redis from "../utils/redisClient.js";

export const getAllCourses = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const cacheKey = `all_courses_${user.ExamYear}`;

    // 1️⃣ Check Redis cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        fromCache: true,
        courses: JSON.parse(cachedData),
      });
    }

    // 2️⃣ Get main category for user's exam year
    const mainCategory = await Category.findOne({
      name: user.ExamYear,
      type: "main",
    });
    if (!mainCategory)
      return res.status(404).json({
        success: false,
        message: "No courses found for your exam year",
      });

    // 3️⃣ Fetch courses that belong to the main category
    const courses = await Course.find({
      isPublished: true,
      mainCategory: mainCategory._id,
    }).select([
      "-enrolledStudents",
      "-courseContent",
      "-courseResources",
      "-zoomLink",
      "-youtubeLive",
      "-attendance",
    ]);

    // 4️⃣ Save to Redis cache for 10 minutes
    await redis.set(cacheKey, JSON.stringify(courses), { EX: 3600 });

    // 5️⃣ Return response
    res.status(200).json({ success: true, fromCache: false, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const user = await userModel.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const cacheKey = `course_${id}`;

    // 1️⃣ Check Redis cache
    const cachedCourse = await redis.get(cacheKey);
    if (cachedCourse) {
      return res.status(200).json({
        success: true,
        fromCache: true,
        course: JSON.parse(cachedCourse),
      });
    }

    // 2️⃣ Fetch course from DB
    const course = await Course.findById(id).populate("mainCategory");
    if (!course)
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    if (!course.courseType === "lesson-pack") {
      if (user.role !== "admin") {
        // 3️⃣ Check if course belongs to user's exam year
        if (course.mainCategory.name !== user.ExamYear) {
          return res
            .status(403)
            .json({ success: false, message: "Access denied to this course" });
        }
      }
    }
    // 4️⃣ Cache the course for 30 minutes
    await redis.set(cacheKey, JSON.stringify(course), { EX: 3600 });

    res.status(200).json({ success: true, fromCache: false, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const getCoursesByMainCategory = async (req, res) => {
  try {
    const userId = req.userId;
    const { mainCategory } = req.body;

    if (!mainCategory) {
      return res
        .status(400)
        .json({ success: false, message: "Main category is required" });
    }

    // 1️⃣ Validate user
    const user = await userModel.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // 2️⃣ Create cache key
    const cacheKey = `courses_maincategory_${mainCategory}`;

    // 3️⃣ Check Redis cache first
    const cachedCourses = await redis.get(cacheKey);
    if (cachedCourses) {
      return res.status(200).json({
        success: true,
        fromCache: true,
        courses: JSON.parse(cachedCourses),
      });
    }

    // 4️⃣ Find the main category in DB
    const mainCatDoc = await Category.findOne({
      name: mainCategory,
      type: "main",
    });

    if (!mainCatDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Main category not found" });
    }

    // 5️⃣ Get all published courses under this main category
    const courses = await Course.find({
      isPublished: true,
      mainCategory: mainCatDoc._id,
    }).select([
      "-enrolledStudents",
      "-courseContent",
      "-courseResources",
      "-zoomLink",
      "-youtubeLive",
      "-attendance",
    ]);

    // 6️⃣ Cache the data for 1 hour
    await redis.set(cacheKey, JSON.stringify(courses), { EX: 3600 });

    // 7️⃣ Send response
    res.status(200).json({ success: true, fromCache: false, courses });
  } catch (error) {
    console.error("Error fetching courses by main category:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
