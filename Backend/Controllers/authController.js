import bcrypt from "bcryptjs";
import userModel from "../models/userModel.js";
import generateStudentId from "../utils/generateStudentId.js";
import { sendSMSWithRetry } from "../utils/smsService.js";
import redis from "../utils/redisClient.js";

const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes
const allowedExamYears = [
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
];
const allowedGenders = ["Male", "Female", "Other"];
const phoneRegex = /^[0-9]{10}$/;
const nameRegex = /^[A-Za-z\s\-]{2,15}$/;

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const destroySession = (store, sid) =>
  new Promise((resolve) => {
    if (!sid) return resolve();
    store.destroy(sid, (err) => {
      if (err) console.error("Failed to destroy previous session:", err);
      resolve();
    });
  });

const regenerateAndSaveSession = (req, data) =>
  new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = data;
      req.session.save((err2) => (err2 ? reject(err2) : resolve()));
    });
  });
export const isuserRegistered = async (req, res) => {
  try {
    const { phonenumber } = req.body;
    if (!phonenumber) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }

    const user = await userModel.findOne({ phonenumber });
    if (user) {
      return res.json({
        success: true,
        exists: true,
        message: "User already exists",
      });
    }

    return res.json({
      success: false,
      exists: false,
      message: "User is not registered",
    });
  } catch (error) {
    console.error("isuserRegistered error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Try again later." });
  }
};

export const Register = async (req, res) => {
  try {
    const {
      name,
      lastname,
      phonenumber,
      password,
      BirthDay,
      Gender,
      Address,
      School,
      ExamYear,
      District,
      tuteDliveryPhoennumebr1,
      tuteDliveryPhoennumebr2,
    } = req.body;

    // Required fields (based on your new schema)
    const required = {
      name,
      lastname,
      Address,
      School,
      District,
      phonenumber,
      password,
      BirthDay,
      Gender,
      ExamYear,
      tuteDliveryPhoennumebr1,
      tuteDliveryPhoennumebr2,
    };
    for (const [key, value] of Object.entries(required)) {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message: `${key} is required.`,
        });
      }
    }

    // Validate names
    if (!nameRegex.test(name)) {
      return res.status(400).json({
        success: false,
        message: "Invalid first name (2–15 letters).",
      });
    }
    if (lastname && !nameRegex.test(lastname)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid last name (2–15 letters)." });
    }

    // Validate exam year and gender
    if (!allowedExamYears.includes(String(ExamYear))) {
      return res.status(400).json({
        success: false,
        message: `Invalid Exam Year. Allowed: ${allowedExamYears.join(", ")}.`,
      });
    }
    if (!allowedGenders.includes(Gender)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Gender value." });
    }

    // Validate phone numbers
    if (!phoneRegex.test(phonenumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number (must be 10 digits).",
      });
    }
    if (
      !phoneRegex.test(tuteDliveryPhoennumebr1) ||
      !phoneRegex.test(tuteDliveryPhoennumebr2)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid tute delivery phone number(s) (must be 10 digits).",
      });
    }
    if (tuteDliveryPhoennumebr1 === tuteDliveryPhoennumebr2) {
      return res.status(400).json({
        success: false,
        message:
          "tuteDliveryPhoennumebr1 and tuteDliveryPhoennumebr2 must be different.",
      });
    }

    // Validate BirthDay (expects YYYY-MM-DD)
    if (!isIsoDate(BirthDay)) {
      return res.status(400).json({
        success: false,
        message: "Invalid BirthDay format (use YYYY-MM-DD).",
      });
    }

    // Optional string type checks
    if (
      Address !== undefined &&
      Address !== null &&
      typeof Address !== "string"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Address must be a string." });
    }
    if (School !== undefined && School !== null && typeof School !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "School must be a string." });
    }
    if (
      District !== undefined &&
      District !== null &&
      typeof District !== "string"
    ) {
      return res
        .status(400)
        .json({ success: false, message: "District must be a string." });
    }

    // Password strength (simple)
    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // Duplicate checks
    const existingUser = await userModel.findOne({ phonenumber });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this phone number.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique studentId
    const studentId = await generateStudentId();

    // Create user
    const user = await userModel.create({
      name,
      lastname,
      studentId,
      phonenumber,
      password: hashedPassword,
      BirthDay,
      Gender,
      Address,
      School,
      ExamYear,
      District,
      tuteDliveryPhoennumebr1,
      tuteDliveryPhoennumebr2,
    });
    // Create a fresh session to prevent fixation
    await regenerateAndSaveSession(req, {
      id: user._id,
      phonenumber: user.phonenumber,
      role: user.role,
      isAdmin: user.isAdmin || false,
    });

    // Single-session handling
    const userSessionKey = `user_session:${user._id}`;

    // Check if user already has a session and kill it
    const existingSessionID = await redis.get(userSessionKey);
    if (existingSessionID && existingSessionID !== req.sessionID) {
      await destroySession(req.sessionStore, existingSessionID);
    }

    // Save the new session ID in Redis with TTL matching cookie.maxAge
    const ttlSeconds = Math.floor(
      (req.session.cookie?.maxAge || 7 * 24 * 60 * 60 * 1000) / 1000
    );

    // node-redis v4 style options; fallback to ioredis varargs
    try {
      await redis.set(userSessionKey, req.sessionID, { EX: ttlSeconds });
    } catch {
      await redis.set(userSessionKey, req.sessionID, "EX", ttlSeconds);
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res
        .status(409)
        .json({ success: false, message: `Duplicate value for ${field}.` });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

export const Login = async (req, res) => {
  const { phonenumber, password } = req.body;

  if (!phonenumber || !password) {
    return res.status(400).json({
      success: false,
      code: "MISSING_CREDENTIALS",
      message: "Missing credentials",
    });
  }

  try {
    const user = await userModel.findOne({ phonenumber });
    if (!user) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        code: "BLOCKED",
        message: "Your account is blocked",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
      });
    }

    // Create a fresh session to prevent fixation
    await regenerateAndSaveSession(req, {
      id: user._id,
      phonenumber: user.phonenumber,
      role: user.role,
      isAdmin: user.isAdmin || false,
    });

    // Single-session handling
    const userSessionKey = `user_session:${user._id}`;

    // Check if user already has a session and kill it
    const existingSessionID = await redis.get(userSessionKey);
    if (existingSessionID && existingSessionID !== req.sessionID) {
      await destroySession(req.sessionStore, existingSessionID);
    }

    // Save the new session ID in Redis with TTL matching cookie.maxAge
    const ttlSeconds = Math.floor(
      (req.session.cookie?.maxAge || 7 * 24 * 60 * 60 * 1000) / 1000
    );

    // node-redis v4 style options; fallback to ioredis varargs
    try {
      await redis.set(userSessionKey, req.sessionID, { EX: ttlSeconds });
    } catch {
      await redis.set(userSessionKey, req.sessionID, "EX", ttlSeconds);
    }

    return res.json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Server error. Please try again later.",
    });
  }
};
/**
 * Logout and clear session mapping
 */
export const Logout = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (userId) {
      await redis.del(`user_session:${userId}`);
    }
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({
          success: false,
          code: "SESSION_ERROR",
          message: "Failed to destroy session",
        });
      }
      // clear cookie name might differ (default: connect.sid)
      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      return res.json({ success: true, message: "Logged out" });
    });
  } catch (e) {
    console.error("Logout error:", e);
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Server error. Please try again later.",
    });
  }
};

/**
 * Check session-based authentication
 */
export const isAuthenticated = (req, res) => {
  try {
    const sessUser = req.session?.user;
    if (!sessUser) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }
    return res.json({
      success: true,
      message: "User is authenticated",
      user: {
        id: sessUser.id,
        phonenumber: sessUser.phonenumber,
        role: sessUser.role,
        isAdmin: !!sessUser.isAdmin,
      },
    });
  } catch (error) {
    console.error("isAuthenticated error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

/**
 * Forgot Password: Send OTP
 */
export const sendResetPasswordOTP = async (req, res) => {
  const { phonenumber } = req.body;

  if (!phonenumber) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number is required" });
  }

  try {
    const user = await userModel.findOne({ phonenumber });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpireAt = Date.now() + OTP_TTL_MS;
    await user.save();

    const message = `Hi ${user.name}, your OTP for Lasithaprasad.com is ${otp}. It will expire in 15 minutes. Do not share this code.`;

    try {
      await sendSMSWithRetry(user.phonenumber, "TEAMICT", message, 5, 3000);
      return res.json({ success: true, message: "OTP sent successfully" });
    } catch (smsError) {
      console.warn("Failed to send OTP SMS after retries:", smsError.message);
      return res.status(502).json({
        success: false,
        message: "Failed to send OTP. Please try again later.",
      });
    }
  } catch (error) {
    console.error("sendResetPasswordOTP error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reset Password using OTP
 */
export const resetPassword = async (req, res) => {
  const { phonenumber, otp, newPassword } = req.body;

  if (!phonenumber || !otp || !newPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Some details are missing" });
  }

  try {
    const user = await userModel.findOne({ phonenumber });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
      return res.status(401).json({ success: false, message: "Invalid OTP" });
    }

    if (user.resetPasswordOtpExpireAt < Date.now()) {
      return res.status(410).json({ success: false, message: "Expired OTP" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOtp = "";
    user.resetPasswordOtpExpireAt = 0;
    await user.save();

    return res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
