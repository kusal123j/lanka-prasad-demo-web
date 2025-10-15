import Course from "../models/courseModel.js";
import Enrollment from "../models/enrollementModel.js";
import userModel from "../models/userModel.js";

export const markCourseAttendance = async (req, res) => {
  const { studentId, courseId } = req.body;

  if (!studentId || !courseId) {
    return res
      .status(400)
      .json({ message: "Student ID and Course ID are required." });
  }

  try {
    const course = await Course.findById(courseId);
    const student = await userModel.findOne({ studentId: studentId });

    if (!course || !student) {
      return res.status(404).json({ message: "Course or Student not found." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyMarked = course.attendance.some(
      (att) =>
        att.student.toString() === student._id.toString() && att.date >= today
    );

    if (alreadyMarked) {
      return res
        .status(400)
        .json({ message: "Attendance already marked for today." });
    }

    course.attendance.push({ student: student._id, date: new Date() });
    await course.save();

    return res.status(200).json({
      success: true,
      message: "Attendance marked successfully.",
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getUserDataByID = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    // Step 1: Find user by studentId
    const user = await userModel
      .findOne({ studentId: id })
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
        select: "courseTitle category courseThumbnail", // only fetch these 3
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
          course: en.course, // contains only courseTitle, category, thumbnail
        })),
        payments: user.payments,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
