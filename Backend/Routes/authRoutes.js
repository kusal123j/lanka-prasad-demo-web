import express from "express";
import {
  Login,
  Register,
  Logout,
  sendVerifyOTP,
  isAuthenticated,
  sendResetPasswordOTP,
  resetPassword,
  isuserRegistered,
  verifyPhoneNumber,
} from "../Controllers/authController.js";
import userAuth from "../Middlewear/userAuth.js";
import rateLimit from "express-rate-limit";
import upload from "../config/multer.js";
const authRouter = express.Router();

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // ✅ Correct key: max number of requests
  message: "Too many login attempts. Try again in 5 minutes.",
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

authRouter.post("/register", upload.single("NICFrontImage"), Register);
authRouter.post("/is-user-registered", isuserRegistered);
// login middleware
authRouter.post("/login", loginLimiter, Login);
authRouter.post("/logout", Logout);
authRouter.post("/send-verify-otp", sendVerifyOTP);
authRouter.post("/verify-phone-number", verifyPhoneNumber);
authRouter.get("/is-auth", userAuth(), isAuthenticated);
authRouter.post("/send-reset-otp", sendResetPasswordOTP);
authRouter.post("/reset-password", resetPassword);
export default authRouter;
