import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    enrolledAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Use TTL index so MongoDB auto-deletes expired docs
enrollmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
export default Enrollment;
