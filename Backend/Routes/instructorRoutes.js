import express from "express";
import {
  getUserDataByID,
  markCourseAttendance,
} from "../Controllers/instructorController.js";
import userAuth from "../Middlewear/userAuth.js";

const instructorRouter = express.Router();

instructorRouter.post(
  "/mark-attendance",
  userAuth(["instructor", "admin"]),
  markCourseAttendance
);
instructorRouter.get(
  "/user/:id",
  userAuth(["instructor", "admin"]),
  getUserDataByID
);
export default instructorRouter;
