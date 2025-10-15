import mongoose, { model, Types } from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bankSlipImage: {
      type: String,
    },
    TXnumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: Types.ObjectId,
      ref: "user",
      required: true,
    },
    course: {
      type: Types.ObjectId,
      ref: "Course",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phonenumber1: {
      type: String,
      required: true,
    },
    phonenumber2: {
      type: String,
      required: true,
    },
    deliveryBy: {
      type: String,
      enum: ["slpost", "courier"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    trackingNumber: {
      type: String,
    },
  },
  { timestamps: true }
);

const paymentModel = model("Payment", paymentSchema);
export default paymentModel;
