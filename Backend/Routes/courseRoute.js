import express from "express";
import {
  getAllCourses,
  getCourseById,
} from "../Controllers/courseController.js";
import userAuth from "../Middlewear/userAuth.js";
const courseRouter = express.Router();

courseRouter.get("/all", userAuth(), getAllCourses);
courseRouter.get("/:id", userAuth(), getCourseById);
export default courseRouter;
