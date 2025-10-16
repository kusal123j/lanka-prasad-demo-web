import express from "express";
import {
  getAllCourses,
  getCourseById,
  getCoursesByMainCategory,
} from "../Controllers/courseController.js";
import userAuth from "../Middlewear/userAuth.js";
const courseRouter = express.Router();

courseRouter.get("/all", userAuth(), getAllCourses);
courseRouter.post(
  "/get-courses-by-maincategory",
  userAuth(),
  getCoursesByMainCategory
);
courseRouter.get("/:id", userAuth(), getCourseById);
export default courseRouter;
