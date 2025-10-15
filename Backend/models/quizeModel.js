import mongoose from "mongoose";

// Answer Schema
const AnswerSchema = new mongoose.Schema({
  text: { type: String, required: true }, // answer text
  isCorrect: { type: Boolean, required: true }, // mark if this is the correct answer
});

// Question Schema
const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true }, // the question itself
  answers: [AnswerSchema], // multiple-choice answers
});

// Quiz Schema
const QuizSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    }, // link to Course
    quizTitle: { type: String, required: true }, // e.g. "Algebra Basics Quiz"
    description: { type: String }, // optional, short description
    questions: [QuestionSchema], // questions for this quiz
  },
  { timestamps: true }
);

const Quiz = mongoose.model("Quiz", QuizSchema);
export default Quiz;
