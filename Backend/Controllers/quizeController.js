import Course from "../models/courseModel.js";
import Quiz from "../models/quizeModel.js"; // adjust the path if needed

// Create new quiz

import mongoose from "mongoose";

export const createQuiz = async (req, res) => {
  try {
    const { courseId, quizTitle, description, questions } = req.body;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Course ID format.",
      });
    }

    const existingCourse = await Course.findById(courseId);
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (!quizTitle || !questions || questions.length === 0) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }

    const newQuiz = new Quiz({
      courseId,
      quizTitle,
      description,
      questions,
    });

    await newQuiz.save();

    res.status(201).json({
      message: "Quiz created successfully",
      quiz: newQuiz,
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all quizzes
export const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({})
      .populate("courseId", "courseTitle courseThumbnail") // only return selected course fields
      .sort({ createdAt: -1 }); // newest first

    res.status(200).json({
      success: true,
      count: quizzes.length,
      quizzes,
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getQuizzesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // validate courseId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Course ID format.",
      });
    }

    const existingCourse = await Course.findById(courseId);
    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const quizzes = await Quiz.find({ courseId })
      .populate("courseId", "courseTitle courseThumbnail") // bring course info
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quizzes.length,
      quizzes,
    });
  } catch (error) {
    console.error("Error fetching course quizzes:", error);
    res.status(500).json({
      success: false,
      message: `Server error - ${error}`,
      error: error.message,
    });
  }
};
