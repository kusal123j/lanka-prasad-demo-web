import express from "express";
import upload from "../config/multer.js";
import {
  addCourse,
  createMainCategory,
  createSubCategory,
  deleteCourse,
  deleteMainCategory,
  deleteSubCategory,
  deleteUser,
  downloadStudentIdCardsZip,
  editCourse,
  editUserManually,
  enrollstudentManually,
  enrollStudentMultiple,
  enrollStudentsBulk,
  exportVideoWatchesPdf,
  getallCoursesforeducator,
  getAllPendingNICVerifications,
  getUserDataByMobileOrNIC,
  isEducator,
  registerUserManually,
  TuteTrackingNumberCreateWithExcelSheet,
  unenrollstudentManually,
  updateMainCategory,
  updateNICVerifyStatus,
  updateSubCategory,
} from "../Controllers/educatorController.js";
import {
  getPaymentsByDatePDF,
  getPendingPayments,
  updatePaymentStatus,
} from "../Controllers/paymentController.js";
import { createQuiz, getAllQuizzes } from "../Controllers/quizeController.js";
import userAuth from "../Middlewear/userAuth.js";

const educatorRouter = express.Router();

educatorRouter.post("/add-course", userAuth(["admin"]), addCourse);
educatorRouter.post("/edit-course", userAuth(["admin"]), editCourse);

educatorRouter.get(
  "/all-courses",
  userAuth(["admin"]),
  getallCoursesforeducator
);

educatorRouter.get(
  "/pending-payments",
  userAuth(["admin"]),
  getPendingPayments
);

educatorRouter.put(
  "/:paymentId/status",
  userAuth(["admin"]),
  updatePaymentStatus
);
educatorRouter.put("/edit-user/:userId", userAuth(["admin"]), editUserManually);

educatorRouter.delete(
  "/delete-user/:phonenumber",
  userAuth(["admin"]),
  deleteUser
);

educatorRouter.post(
  "/update-nic-verify-status",
  userAuth(["admin"]),
  updateNICVerifyStatus
);

educatorRouter.get(
  "/pending-nic-verifications",
  userAuth(["admin"]),
  getAllPendingNICVerifications
);

educatorRouter.post("/add-quize", userAuth(["admin"]), createQuiz);

educatorRouter.get("/get-all-quizzes", userAuth(["admin"]), getAllQuizzes);

educatorRouter.get("/is-admin", userAuth(["admin"]), isEducator);

educatorRouter.delete("/delete-course", userAuth(["admin"]), deleteCourse);

educatorRouter.post(
  "/get-payments-by-date",
  userAuth(["admin"]),
  getPaymentsByDatePDF
);
educatorRouter.post("/get-studentsID-cards-by-date", downloadStudentIdCardsZip);

educatorRouter.post(
  "/create-main-category",
  userAuth(["admin"]),
  createMainCategory
);

educatorRouter.post(
  "/create-sub-category",
  userAuth(["admin"]),
  createSubCategory
);

// UPDATE
educatorRouter.put("/main/:id", userAuth(["admin"]), updateMainCategory);
educatorRouter.put("/sub/:id", userAuth(["admin"]), updateSubCategory);

// DELETE
educatorRouter.delete("/main/:id", userAuth(["admin"]), deleteMainCategory);
educatorRouter.delete("/sub/:id", userAuth(["admin"]), deleteSubCategory);

educatorRouter.post(
  "/manully-enroll-student",
  userAuth(["admin"]),
  enrollstudentManually
);

educatorRouter.post(
  "/enroll/bulk",
  upload.single("file"),
  userAuth(["admin"]),
  enrollStudentsBulk
);
educatorRouter.post(
  "/bulk-tracking-number",
  upload.single("file"),
  userAuth(["admin"]),
  TuteTrackingNumberCreateWithExcelSheet
);
educatorRouter.post(
  "/enroll-multiple-courses",
  userAuth(["admin"]),
  enrollStudentMultiple
);
educatorRouter.post(
  "/manully-register-user",
  userAuth(["admin"]),
  registerUserManually
);
educatorRouter.post(
  "/manully-unenroll-student",
  userAuth(["admin"]),
  unenrollstudentManually
);
educatorRouter.post(
  "/getuserdata",
  userAuth(["admin"]),
  getUserDataByMobileOrNIC
);
educatorRouter.post(
  "/export-video-watches",
  userAuth(["admin"]),
  exportVideoWatchesPdf
);
export default educatorRouter;
