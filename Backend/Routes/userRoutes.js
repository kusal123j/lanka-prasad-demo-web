import express from "express";
import {
  enrolledCourse,
  finishVideotime,
  generateStudentIDCard,
  getAllCategories,
  getLastVideoposition,
  getProfileData,
  getuserdata,
  getUserNICImage,
  updateNICImage,
  updateUserProfile,
  updateVideotime,
} from "../Controllers/userController.js";
import userAuth from "../Middlewear/userAuth.js";
import {
  getPaymentDetails,
  paymentbybankslip,
} from "../Controllers/paymentController.js";
import upload from "../config/multer.js";
import { getQuizzesByCourse } from "../Controllers/quizeController.js";
import { generateZoomSignature } from "../Controllers/zoomController.js";
const userRouter = express.Router();
userRouter.get("/data", userAuth(), getuserdata);
userRouter.get("/profile", userAuth(), getProfileData);
userRouter.put("/update-profile", userAuth(), updateUserProfile);
userRouter.get("/enrolled-courses", userAuth(), enrolledCourse);
userRouter.get("/all-categories", userAuth(), getAllCategories);
userRouter.get("/payment-history", userAuth(), getPaymentDetails);
userRouter.post(
  "/payment/bankslip",
  upload.single("image"), // must match frontend's field name
  userAuth(),
  paymentbybankslip
);
userRouter.post(
  "/nic-upload",
  userAuth(),
  upload.single("nicImage"),
  updateNICImage
);

userRouter.post("/generate-id-card", userAuth(), generateStudentIDCard);
userRouter.get("/quiz/:courseId", userAuth(), getQuizzesByCourse);
userRouter.get("/getlastvideotime", userAuth(), getLastVideoposition);
userRouter.post("/updatevideotime", userAuth(), updateVideotime);
userRouter.post("/finishvideo", userAuth(), finishVideotime);
userRouter.get("/nic-info", userAuth(), getUserNICImage);
userRouter.post("/zoom/signature", userAuth(), generateZoomSignature);
export default userRouter;
