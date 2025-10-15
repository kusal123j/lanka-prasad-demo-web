import mongoose, { Types } from "mongoose";

const VideoWatchSchema = new mongoose.Schema(
  {
    user: { type: Types.ObjectId, ref: "user", required: true },
    course: { type: Types.ObjectId, ref: "Course", required: true },
    chapterId: { type: String, required: true },
    lectureId: { type: String, required: true },

    // Session tracking
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    watchedDuration: { type: Number, default: 0 }, // in seconds
    isActive: { type: Boolean, default: true },

    // NEW: Persist last known playhead position in seconds
    lastPositionSec: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TTL index (3 days). Remove or increase if you want longer persistence.
VideoWatchSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 3 }
);

// Helpful index for fast lookups
VideoWatchSchema.index({
  user: 1,
  course: 1,
  chapterId: 1,
  lectureId: 1,
  updatedAt: -1,
});

const VideoWatch = mongoose.model("VideoWatch", VideoWatchSchema);
export default VideoWatch;
