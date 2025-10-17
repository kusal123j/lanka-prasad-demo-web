import mongoose, { model, Types } from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
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
