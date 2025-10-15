import bcrypt from "bcryptjs";
import userModel from "../models/userModel.js";
import generateStudentId from "../utils/generateStudentId.js";
import { sendSMSWithRetry } from "../utils/smsService.js";
import { uploadFileOnBunny } from "../CDN/bunnycdn.js";
import redis from "../utils/redisClient.js";
import { io, onlineUsers } from "../server.js";

export const isuserRegistered = async (req, res) => {
  const { phonenumber } = req.body;
  if (!phonenumber) {
    return res.json({ success: false, message: "Some details are missing" });
  }

  const user = await userModel.findOne({ phonenumber });
  if (user) {
    return res.json({ success: true, message: "User already exists" });
  }

  res.json({ success: false, message: "User is not registered" });
};

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

    // Validation regex patterns
    const nameRegex = /^[A-Za-z\s\-]{2,15}$/;
    const phoneRegex = /^[0-9]{10}$/;
    const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/; // old & new NIC formats
    const allowedExamYears = ["2025", "2026", "2027"];
    const allowedGenders = ["Male", "Female", "Other"];

    // === Required field check ===
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
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // === First name & last name ===
    if (!nameRegex.test(name)) {
      return res.status(400).json({
        success: false,
        message: "Invalid first name (2–15 letters only).",
      });
    }
    if (!nameRegex.test(lastname)) {
      return res.status(400).json({
        success: false,
        message: "Invalid last name (2–15 letters only).",
      });
    }

    // === Exam year ===
    if (!allowedExamYears.includes(String(ExamYear))) {
      return res.status(400).json({
        success: false,
        message: "Invalid Exam Year. Allowed: 2025, 2026, 2027.",
      });
    }

    // === Phone number ===
    if (!phoneRegex.test(phonenumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number (must be 10 digits).",
      });
    }

    // === Password ===
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // === BirthDay ===
    if (isNaN(Date.parse(BirthDay))) {
      return res.status(400).json({
        success: false,
        message: "Invalid BirthDay format (use YYYY-MM-DD).",
      });
    }

    // === Gender ===
    if (!allowedGenders.includes(Gender)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Gender value." });
    }

    // === NIC ===
    if (!nicRegex.test(NIC)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid NIC number." });
    }

    // === Other required strings ===
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

    // Check duplicate user
    const existingUser = await userModel.findOne({ phonenumber });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }
    // Check duplicate user
    const existingUserwithNIC = await userModel.findOne({ NIC });
    if (existingUserwithNIC) {
      return res
        .status(409)
        .json({ success: false, message: "Need unique NIC" });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate student ID & OTP
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
        return res
          .status(500)
          .json({ success: false, message: "Failed to upload NIC image" });
      }
      nicImageUrl = uploaded.url;
    }

    // Create user
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
      verifyOtpExpireAt: Date.now() + 15 * 60 * 1000, // 15 mins
    });

    await newUser.save();

    // SMS content
    const message = `Hi ${newUser.name}, your OTP for Lasithaprasad.lk is ${otp}. It will expire in 15 minutes. Do not share this code.`;

    try {
      // Try sending SMS with 5 retries
      await sendSMSWithRetry(newUser.phonenumber, "TEAMICT", message, 5, 3000);
      res.json({ success: true, message: "OTP sent successfully" });
    } catch (smsError) {
      console.warn("Failed to send OTP SMS after retries:", smsError.message);
      res.json({
        success: false,
        message: "Failed to send OTP. Please try again later.",
      });
    }
    req.session.user = {
      id: newUser._id,
      phonenumber: newUser.phonenumber,
      role: newUser.role,
    };

    return res.status(201).json({
      success: true,
      message: "User registered successfully. OTP sent if SMS succeeded",
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const Login = async (req, res) => {
  const { phonenumber, password } = req.body;

  if (!phonenumber || !password) {
    return res.json({ success: false, message: "Missing credentials" });
  }

  try {
    const user = await userModel.findOne({ phonenumber });
    if (!user) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    if (user.isBlocked) {
      return res.json({ success: false, message: "Your account is blocked" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }
    if (!user.isAccountVerifyed) {
      return res.json({
        success: false,
        isAccountVerifyed: false,
        message: "Your account is not verified",
      });
    }
    const userSessionKey = `user_session:${user._id}`;

    // Check for existing session
    const existingSessionID = await redis.get(userSessionKey);
    if (existingSessionID) {
      // Destroy previous session in Redis
      await redis.del(`sess:${existingSessionID}`);

      // Force real-time logout via Socket.io
      const oldSocketId = onlineUsers.get(user._id.toString());
      if (oldSocketId) {
        io.to(oldSocketId).emit("forceLogout");
      }
    }

    // Create new session
    req.session.user = {
      id: user._id,
      phonenumber: user.phonenumber,
      role: user.role,
      isAdmin: user.isAdmin || false,
    };

    // Save new session ID in Redis
    await redis.set(userSessionKey, req.sessionID);

    return res.json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const Logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res
          .status(500)
          .json({ success: false, message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true, message: "Logged out successfully" });
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const sendVerifyOTP = async (req, res) => {
  try {
    const { phonenumber } = req.body;
    if (!phonenumber) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Phonenumber missing",
      });
    }
    const user = await userModel.findOne({ phonenumber });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.isAccountVerifyed) {
      return res.status(400).json({
        success: false,
        message: "Account is already verified.",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit OTP

    user.verifyOtp = otp;
    user.verifyOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes from now
    await user.save();

    // SMS content
    const message = `Hi ${user.name}, your OTP for Lasithaprasad.lk is ${otp}. It will expire in 15 minutes. Do not share this code.`;

    try {
      // Try sending SMS with 5 retries
      await sendSMSWithRetry(user.phonenumber, "TEAMICT", message, 5, 3000);
      res.json({
        success: true,
        Gender: user.Gender,
        BirthDay: user.BirthDay,
        message: "OTP sent successfully",
      });
    } catch (smsError) {
      console.warn("Failed to send OTP SMS after retries:", smsError.message);
      res.json({
        success: false,
        message: "Failed to send OTP. Please try again later.",
      });
    }
  } catch (error) {
    console.error("sendVerifyOTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

export const verifyPhoneNumber = async (req, res) => {
  try {
    const { finalOtp, phonenumber, BirthDay, Gender } = req.body;

    if (!phonenumber || !finalOtp || !BirthDay || !Gender) {
      return res.status(400).json({
        success: false,
        message: "Missing user phonenumber or OTP.",
      });
    }

    const user = await userModel.findOne({ phonenumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (
      !user.verifyOtp ||
      String(user.verifyOtp).trim() !== String(finalOtp).trim()
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    if (user.verifyOtpExpireAt < Date.now()) {
      return res.status(410).json({
        success: false,
        message: "OTP has expired.",
      });
    }

    user.isAccountVerifyed = true;
    user.verifyOtp = "";
    user.verifyOtpExpireAt = 0;
    user.BirthDay = BirthDay;
    user.Gender = Gender;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Phone number verified successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

export const isAuthenticated = (req, res) => {
  try {
    res.json({
      success: true,
      message: "User is authenticated",
      userId: req.userId,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Forgot Password
export const sendResetPasswordOTP = async (req, res) => {
  const { phonenumber } = req.body;

  if (!phonenumber) {
    return res.json({ success: false, message: "Phone number is required" });
  }

  try {
    const user = await userModel.findOne({ phonenumber });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digit OTP
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // SMS content
    const message = `Hi ${user.name}, your OTP for Lasithaprasad.lk is ${otp}. It will expire in 15 minutes. Do not share this code.`;

    try {
      // Try sending SMS with 5 retries
      await sendSMSWithRetry(user.phonenumber, "TEAMICT", message, 5, 3000);
      res.json({ success: true, message: "OTP sent successfully" });
    } catch (smsError) {
      console.warn("Failed to send OTP SMS after retries:", smsError.message);
      res.json({
        success: false,
        message: "Failed to send OTP. Please try again later.",
      });
    }

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Rest user password
export const resetPassword = async (req, res) => {
  const { phonenumber, otp, newPassword } = req.body;

  if (!phonenumber || !otp || !newPassword) {
    return res.json({ success: false, message: "Some Details are missing" });
  }

  try {
    const user = await userModel.findOne({ phonenumber });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.resetPasswordOtp !== otp || user.resetPasswordOtp === "") {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.resetPasswordOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "Expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOtp = "";
    user.resetPasswordOtpExpireAt = 0;
    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
