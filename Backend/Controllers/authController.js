import bcrypt from "bcryptjs";
import userModel from "../models/userModel.js";
import generateStudentId from "../utils/generateStudentId.js";
import { sendSMSWithRetry } from "../utils/smsService.js";
import { uploadFileOnBunny } from "../CDN/bunnycdn.js";
import redis from "../utils/redisClient.js";

const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes
const allowedExamYears = ["2025", "2026", "2027"];
const allowedGenders = ["Male", "Female", "Other"];
const phoneRegex = /^[0-9]{10}$/;
const nameRegex = /^[A-Za-z\s\-]{2,15}$/;
const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/; // LK NIC formats

/**
 * Check if a user is registered by phone
 */
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

/**
 * Register new user (no session until phone is verified)
 */
export const Register = async (req, res) => {
  try {
    const {
      name,
      ExamYear,
      lastname,
      phonenumber,
      password,
      BirthDay,
      Gender,
      NIC,
      Address,
      whatsapp,
      School,
      District,
      stream,
      institute,
    } = req.body;

    // Required
    if (
      !name ||
      !lastname ||
      !ExamYear ||
      !phonenumber ||
      !password ||
      !BirthDay ||
      !Gender ||
      !NIC ||
      !Address ||
      !School ||
      !District ||
      !stream ||
      !institute ||
      !whatsapp
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    // Validate
    if (!nameRegex.test(name)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid first name (2–15 letters)" });
    }
    if (!nameRegex.test(lastname)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid last name (2–15 letters)" });
    }

    if (!allowedExamYears.includes(String(ExamYear))) {
      return res.status(400).json({
        success: false,
        message: "Invalid Exam Year. Allowed: 2025, 2026, 2027.",
      });
    }

    if (!phoneRegex.test(phonenumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number (must be 10 digits).",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    if (isNaN(Date.parse(BirthDay))) {
      return res.status(400).json({
        success: false,
        message: "Invalid BirthDay format (use YYYY-MM-DD).",
      });
    }

    if (!allowedGenders.includes(Gender)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Gender value." });
    }

    if (!nicRegex.test(NIC)) {
      return res.status(400).json({
        success: false,
        message: "Invalid NIC number.",
      });
    }

    const requiredStrings = {
      Address,
      School,
      District,
      stream,
      institute,
      whatsapp,
    };
    for (const [key, value] of Object.entries(requiredStrings)) {
      if (typeof value !== "string" || value.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: `${key} is required and must be a valid string.`,
        });
      }
    }

    // Duplicate checks
    const existingUser = await userModel.findOne({ phonenumber });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    const existingUserwithNIC = await userModel.findOne({ NIC });
    if (existingUserwithNIC) {
      return res.status(409).json({
        success: false,
        message: "Need unique NIC",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate IDs and OTP
    const studentId = await generateStudentId();
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Upload NIC image if provided
    let nicImageUrl = null;
    if (req.file) {
      const uploaded = await uploadFileOnBunny(
        "NIC-Front",
        req.file,
        `${studentId}-${Date.now()}.png`
      );
      if (!uploaded || !uploaded.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload NIC image",
        });
      }
      nicImageUrl = uploaded.url;
    }

    // Create user (not verified yet)
    const newUser = new userModel({
      name,
      lastname,
      studentId,
      phonenumber,
      password: hashedPassword,
      BirthDay,
      Gender,
      NIC,
      NICFrontImage: nicImageUrl,
      Address,
      whatsapp,
      School,
      ExamYear,
      District,
      stream,
      institute,
      verifyOtp: otp,
      verifyOtpExpireAt: Date.now() + OTP_TTL_MS,
      isAccountVerifyed: false,
    });

    await newUser.save();

    // Send OTP via SMS
    const message = `Hi ${newUser.name}, your OTP for Lasithaprasad.lk is ${otp}. It will expire in 15 minutes. Do not share this code.`;

    try {
      await sendSMSWithRetry(newUser.phonenumber, "TEAMICT", message, 5, 3000);
      return res.status(201).json({
        success: true,
        code: "REGISTERED",
        message: "User registered successfully. OTP sent.",
      });
    } catch (smsError) {
      console.warn("Failed to send OTP SMS after retries:", smsError.message);
      return res.status(201).json({
        success: true,
        code: "REGISTERED_OTP_FAILED",
        message:
          "User registered successfully, but failed to send OTP. Please retry.",
      });
    }
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

/**
 * Login with phone/password
 * - Returns UNVERIFIED code if account not verified (for OTP step)
 * - Creates a new session and kills any old one
 */
// Helper to promisify session methods
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

    if (!user.isAccountVerifyed) {
      return res.status(409).json({
        success: false,
        code: "UNVERIFIED",
        isAccountVerifyed: false,
        message: "Your account is not verified",
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
 * Send OTP for verifying phone (registration/unverified users)
 */
export const sendVerifyOTP = async (req, res) => {
  try {
    const { phonenumber } = req.body;
    if (!phonenumber) {
      return res.status(400).json({
        success: false,
        code: "MISSING_PHONE",
        message: "Phone number is required",
      });
    }
    const user = await userModel.findOne({ phonenumber });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, code: "NOT_FOUND", message: "User not found" });
    }

    if (user.isAccountVerifyed) {
      return res.status(409).json({
        success: false,
        code: "ALREADY_VERIFIED",
        message: "Account is already verified.",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + OTP_TTL_MS;
    await user.save();

    const message = `Hi ${user.name}, your OTP for Lasithaprasad.com is ${otp}. It will expire in 15 minutes. Do not share this code.`;

    try {
      await sendSMSWithRetry(user.phonenumber, "TEAMICT", message, 5, 3000);
      return res.json({
        success: true,
        code: "OTP_SENT",
        Gender: user.Gender,
        BirthDay: user.BirthDay,
        message: "OTP sent successfully",
      });
    } catch (smsError) {
      console.warn("Failed to send OTP SMS after retries:", smsError.message);
      return res.status(502).json({
        success: false,
        code: "SMS_FAILED",
        message: "Failed to send OTP. Please try again later.",
      });
    }
  } catch (error) {
    console.error("sendVerifyOTP error:", error);
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Server error. Please try again later.",
    });
  }
};

/**
 * Verify phone number with OTP and auto-login the user (create session)
 */
export const verifyPhoneNumber = async (req, res) => {
  try {
    const { finalOtp, phonenumber, BirthDay, Gender } = req.body;

    if (!phonenumber || !finalOtp || !BirthDay || !Gender) {
      return res.status(400).json({
        success: false,
        code: "MISSING_FIELDS",
        message: "Missing required fields.",
      });
    }

    if (!allowedGenders.includes(Gender)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_GENDER",
        message: "Invalid Gender value.",
      });
    }

    const user = await userModel.findOne({ phonenumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "User not found.",
      });
    }

    if (
      !user.verifyOtp ||
      String(user.verifyOtp).trim() !== String(finalOtp).trim()
    ) {
      return res
        .status(401)
        .json({ success: false, code: "INVALID_OTP", message: "Invalid OTP." });
    }

    if (user.verifyOtpExpireAt < Date.now()) {
      return res.status(410).json({
        success: false,
        code: "OTP_EXPIRED",
        message: "OTP has expired.",
      });
    }

    user.isAccountVerifyed = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0;
    user.BirthDay = BirthDay;
    user.Gender = Gender;
    await user.save();

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

    return res.status(200).json({
      success: true,
      code: "VERIFIED",
      message: "Phone number verified successfully. You are now logged in.",
    });
  } catch (error) {
    console.error("verifyPhoneNumber error:", error);
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
