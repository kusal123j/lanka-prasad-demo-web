import { KJUR } from "jsrsasign";
import Course from "../models/courseModel";
import userModel from "../models/userModel";
import Enrollment from "../models/enrollementModel";

export const generateZoomSignature = async (req, res) => {
  try {
    const userId = req.userId;
    const { courseId, expirationSeconds } = req.body;
    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });
    // 3️⃣ Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
    });

    if (!enrollment)
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });

    // 4️⃣ Check if enrollment is expired
    if (new Date(enrollment.expiresAt) < new Date())
      return res
        .status(403)
        .json({ success: false, message: "Your enrollment has expired" });
    const meetingNumber = course.zoomMeetingNumber;
    const role = user.role === "admin" ? 1 : 0;
    const videoWebRtcMode = 1;
    const iat = Math.floor(Date.now() / 1000);
    const exp = expirationSeconds ? iat + expirationSeconds : iat + 60 * 60 * 2;
    const oHeader = { alg: "HS256", typ: "JWT" };
    const oPayload = {
      appKey: process.env.ZOOM_MEETING_SDK_KEY,
      sdkKey: process.env.ZOOM_MEETING_SDK_KEY,
      mn: meetingNumber,
      role,
      iat,
      exp,
      tokenExp: exp,
      video_webrtc_mode: videoWebRtcMode,
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const sdkJWT = KJUR.jws.JWS.sign(
      "HS256",
      sHeader,
      sPayload,
      process.env.ZOOM_MEETING_SDK_SECRET
    );
    return res.json({
      name: user.name,
      signature: sdkJWT,
      sdkKey: process.env.ZOOM_MEETING_SDK_KEY,
      meetingNumber,
      role,
      passcode: course.zoomMeetingPasscord,
    });
  } catch (err) {
    console.error("❌ [Zoom] Signature generation failed:", err);
    return res.status(500).json({ error: "Failed to generate signature" });
  }
};
