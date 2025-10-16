import express from "express";
import {
  Login,
  Register,
  Logout,
  isAuthenticated,
  sendResetPasswordOTP,
  resetPassword,
  isuserRegistered,
} from "../Controllers/authController.js";
import userAuth from "../Middlewear/userAuth.js";
import rateLimit from "express-rate-limit";
const authRouter = express.Router();

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // ✅ Correct key: max number of requests
  message: "Too many login attempts. Try again in 5 minutes.",
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

authRouter.post("/register", Register);
authRouter.post("/is-user-registered", isuserRegistered);
// login middleware
authRouter.post("/login", loginLimiter, Login);
authRouter.post("/logout", Logout);
authRouter.get("/is-auth", userAuth(), isAuthenticated);
authRouter.post("/send-reset-otp", sendResetPasswordOTP);
authRouter.post("/reset-password", resetPassword);
export default authRouter;
