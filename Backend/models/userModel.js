import mongoose, { Types } from "mongoose";

const userShema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    studentId: { type: String, unique: true, required: true },
    lastname: { type: String, required: true },
    phonenumber: { type: String, required: true, unique: true },
    BirthDay: { type: String, required: true },
    Address: { type: String, required: true },
    Gender: { type: String, required: true },
    tuteDliveryPhoennumebr1: { type: String, required: true },
    tuteDliveryPhoennumebr2: { type: String, required: true },
    School: { type: String, required: true },
    ExamYear: { type: String, required: true },
    District: { type: String, required: true },
    password: { type: String, required: true },
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
