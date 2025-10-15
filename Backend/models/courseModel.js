import mongoose, { Types } from "mongoose";

const attendanceSchema = new mongoose.Schema({
  student: { type: Types.ObjectId, ref: "user", required: true },
  date: { type: Date, default: Date.now },
});
const LectureSchema = new mongoose.Schema({
  lectureId: { type: String, required: true },
  lectureTitle: { type: String, required: true },
  lectureUrl: { type: String, required: true },
  lectureOrder: { type: Number, required: true },
});

const ChapterSchema = new mongoose.Schema({
  chapterId: { type: String, required: true },
  chapterOrder: { type: Number, required: true },
  chapterTitle: { type: String, required: true },
  chapterContent: [LectureSchema],
});
const ResourceSchema = new mongoose.Schema({
  resourceId: { type: String, required: true },
  resourceTitle: { type: String, required: true },
  resourceUrl: { type: String, required: true },
});

const CourseSchema = new mongoose.Schema(
  {
    courseTitle: { type: String, required: true },
    courseDescription: { type: String },
    courseType: {
      type: String,
      enum: ["class", "lesson-pack"],
      required: true,
    },
    coursePrice: { type: Number, required: true },
    courseThumbnail: { type: String },
    isPublished: { type: Boolean, required: true },
    month: {
      type: String,
      enum: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
    },
    // 🔹 new category structure
    mainCategory: { type: Types.ObjectId, ref: "Category" },
    subCategory: { type: Types.ObjectId, ref: "Category" },
    //
    courseContent: [ChapterSchema],
    courseResources: [ResourceSchema],
    zoomLink: { type: String },
    youtubeLive: { type: String },
    attendance: [attendanceSchema],
  },
  { timestamps: true, minimize: false }
);

const Course = mongoose.model("Course", CourseSchema);
export default Course;
