import mongoose, { Types } from "mongoose";

const userShema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    studentId: { type: String, unique: true, required: true },
    studentIdCard: { type: String, default: "" },
    lastname: { type: String },
    institute: { type: String, required: true },
    phonenumber: { type: String, required: true, unique: true },
    BirthDay: { type: String, required: true },
    Address: { type: String },
    Gender: { type: String, required: true },
    NIC: { type: String, unique: true, required: true },
    IsNICVerified: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    NICFrontImage: { type: String },
    whatsapp: { type: String },
    School: { type: String },
    ExamYear: { type: String, required: true },
    District: { type: String },
    stream: { type: String },
    password: { type: String, required: true },
    tuteCenter: { type: Boolean, default: false },
    verifyOtp: { type: String, default: "" },
    verifyOtpExpireAt: { type: Number, default: 0 },
    isAccountVerifyed: { type: Boolean, default: false },
    resetPasswordOtp: { type: String, default: "" },
    resetPasswordOtpExpireAt: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },
    payments: [
      {
        type: Types.ObjectId,
        ref: "Payment",
      },
    ],
  },
  { timestamps: true }
);

const userModel = mongoose.model("user", userShema);

export default userModel;
