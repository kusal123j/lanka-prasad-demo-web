import Course from "../models/courseModel.js";
import paymentModel from "../models/paymentModel.js";
import userModel from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";
import Enrollment from "../models/enrollementModel.js";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { uploadFileOnBunny } from "../CDN/bunnycdn.js";

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const paymentbybankslip = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      TXnumber,
      courseId,
      address,
      phonenumber1,
      phonenumber2,
      deliveryBy,
    } = req.body;
    const image = req.file;

    // 1. Check user
    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 2. Validate required fields
    if (
      !TXnumber ||
      !courseId ||
      !image ||
      !address ||
      !phonenumber1 ||
      !phonenumber2 ||
      !deliveryBy
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // 3. Check duplicate TXnumber
    const checktxnumber = await paymentModel.findOne({ TXnumber });
    if (checktxnumber) {
      return res.status(409).json({
        success: false,
        message: "Transaction number already exists, upload a new one",
      });
    }

    // 4. Validate course
    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const amount = course.coursePrice;
    if (amount === undefined || amount === null) {
      return res
        .status(400)
        .json({ success: false, message: "Course price not found" });
    }

    // Upload Bank Slip image to BunnyCDN
    let bankSlipImageUrl = null;

    const uploaded = await uploadFileOnBunny(
      "Bank-Slip",
      image,
      `${TXnumber}-${Date.now()}.png`
    );
    if (!uploaded || !uploaded.success) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to upload Bank Slip image" });
    }
    bankSlipImageUrl = uploaded.url;

    // 6. Create payment
    const payment = await paymentModel.create({
      TXnumber,
      user: userId,
      course: courseId,
      amount,
      address,
      phonenumber1,
      phonenumber2,
      deliveryBy,
      bankSlipImage: bankSlipImageUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Payment Pending Approval",
      data: payment,
    });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//For user dashborad

export const getPaymentDetails = async (req, res) => {
  try {
    const userId = req.userId;

    const payments = await paymentModel
      .find({ user: userId })
      .select("TXnumber amount  paymentStatus createdAt trackingNumber address")
      .populate({
        path: "course",
        select: "courseTitle coursePrice",
      })
      .sort({ createdAt: -1 });

    if (!payments || payments.length === 0) {
      return res.json({ success: false, message: "No payments found" });
    }

    return res.json({ success: true, payments });
  } catch (error) {
    console.error("Payment retrieval error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// or get pending payments for educator
export const getPendingPayments = async (req, res) => {
  try {
    // Get page and limit from query, with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    // Count total pending payments for pagination
    const total = await paymentModel.countDocuments({
      paymentStatus: "pending",
    });

    // Get paginated payments
    const pendingPayments = await paymentModel
      .find({ paymentStatus: "pending" })
      .select("bankSlipImage TXnumber amount user course createdAt")
      .populate("user", "name phonenumber")
      .populate({
        path: "course",
        select: "courseTitle coursePrice",
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // optional: latest first

    res.status(200).json({
      success: true,
      count: pendingPayments.length,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPayments: total,
      payments: pendingPayments.map((payment) => ({
        id: payment._id,
        bankSlipImage: payment.bankSlipImage,
        TXnumber: payment.TXnumber,
        amount: payment.amount,
        user: payment.user,
        course: payment.course,
        createdAt: payment.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching pending payments.",
    });
  }
};
//also educator
export const updatePaymentStatus = async (req, res) => {
  const { status } = req.body;
  const { paymentId } = req.params;

  // Allowed statuses
  const validStatuses = ["pending", "completed", "failed"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment status. Allowed: pending, completed, failed.",
    });
  }

  try {
    // Fetch payment and populate user & course
    const payment = await paymentModel
      .findById(paymentId)
      .populate("user")
      .populate("course");

    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found." });
    }

    const user = payment.user;
    const course = payment.course;

    if (!user || !course) {
      return res.status(404).json({
        success: false,
        message: "Associated user or course not found.",
      });
    }
    // Update payment status in DB
    payment.paymentStatus = status;
    await payment.save();

    // If payment is completed, enroll via Enrollment collection
    if (status === "completed") {
      // Check if already enrolled
      const existingEnrollment = await Enrollment.findOne({
        user: user._id,
        course: course._id,
      });

      if (existingEnrollment) {
        return res.status(409).json({
          success: false,
          message: "User already enrolled in this course.",
        });
      }

      // Create new enrollment with 30-day expiry
      await Enrollment.create({
        user: user._id,
        course: course._id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), //30days
      });

      return res.status(200).json({
        success: true,
        message: "User successfully enrolled in course.",
      });
    }

    // If not "completed", just return
    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully.",
      payment,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating payment status.",
      error: error.message,
    });
  }
};

// Get completed payment by dates
export const getPaymentsByDatePDF = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.body;

    // ---- date range ----
    let start, end;
    if (date) {
      start = new Date(date);
      start.setHours(0, 0, 0, 0);
      end = new Date(date);
      end.setHours(23, 59, 59, 999);
    } else if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      return res.status(400).json({
        message: "Please provide either 'date' or 'startDate' and 'endDate'",
      });
    }

    const payments = await paymentModel
      .find({
        paymentStatus: "completed",
        createdAt: { $gte: start, $lte: end },
      })
      .populate(
        "user",
        "name lastname Address tuteDliveryPhoennumebr1 tuteDliveryPhoennumebr2"
      )
      .populate("course", "courseTitle month");

    // ---- fonts (Sinhala) ----
    const fontDir = path.join(__dirname, "../Fonts");
    const regPath = path.join(fontDir, "NotoSansSinhala-Regular.ttf");
    const boldPath = path.join(fontDir, "NotoSansSinhala-Bold.ttf");

    if (!fs.existsSync(regPath)) {
      return res.status(500).json({
        message: `Sinhala font not found: ${regPath}. Place NotoSansSinhala-Regular.ttf in /Fonts.`,
      });
    }
    // Fallback to regular if bold is missing
    const boldPathSafe = fs.existsSync(boldPath) ? boldPath : regPath;

    // ---- create PDF + register fonts ----
    const doc = new PDFDocument({ size: "A4", margin: 20 });
    doc.registerFont("Sinhala", regPath);
    doc.registerFont("Sinhala-Bold", boldPathSafe);

    const FONT_REG = "Sinhala";
    const FONT_BOLD = "Sinhala-Bold";

    // ---- stream headers ----
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payments_${Date.now()}.pdf"`
    );
    doc.pipe(res);

    // ---- layout + styles ----
    const page = { width: doc.page.width, height: doc.page.height };
    const topMargin = 24;
    const leftMargin = 24;
    const bottomMargin = 28;

    const titleFontSize = 18;
    const headerFontSize = 11; // "Class"
    const bodyFontSize = 10; // other fields
    const lineGapHeader = 1;
    const lineGapBody = 1.2;
    const fieldSpacing = 2; // space between fields

    const cardWidth = 170; // rectangle width
    const gapX = 18;
    const gapY = 18;
    const padding = 6;

    const maxCols = Math.max(
      1,
      Math.floor((page.width - leftMargin * 2 + gapX) / (cardWidth + gapX))
    );
    const contentWidth = cardWidth - padding * 2;

    const drawTitle = () => {
      doc.font(FONT_BOLD).fontSize(titleFontSize).fillColor("#000");
      doc.text("Payments Report", 0, topMargin, { align: "center" });
    };

    drawTitle();
    let x = leftMargin;
    let y = topMargin + 40;
    let col = 0;

    payments.forEach((p) => {
      const user = p.user || {};
      const course = p.course || {};

      // No ellipsis; wrap as needed (Sinhala-friendly fonts)
      const fields = [
        {
          text: `Class: ${course.courseTitle}`,
          bold: true,
          size: headerFontSize,
          gap: lineGapHeader,
        },
        {
          text: `Month: ${course.month}`,
          bold: false,
          size: bodyFontSize,
          gap: lineGapBody,
        },
        {
          text: `Name: ${user.name} ${user.lastname || ""}`,
          bold: false,
          size: bodyFontSize,
          gap: lineGapBody,
        },
        {
          text: `Address: ${user.Address}`, // ✅ fixed
          bold: false,
          size: bodyFontSize,
          gap: lineGapBody,
        },
        {
          text: `Phone: ${user.tuteDliveryPhoennumebr1}`, // ✅ fixed
          bold: false,
          size: bodyFontSize,
          gap: lineGapBody,
        },
        {
          text: `S-Phone: ${user.tuteDliveryPhoennumebr2}`, // ✅ fixed
          bold: false,
          size: bodyFontSize,
          gap: lineGapBody,
        },
      ];

      // Measure box height using the SAME font as used for drawing
      let textHeight = 0;
      fields.forEach((f) => {
        doc.font(f.bold ? FONT_BOLD : FONT_REG).fontSize(f.size);
        const h = doc.heightOfString(f.text, {
          width: contentWidth,
          lineGap: f.gap,
        });
        textHeight += h + fieldSpacing;
      });
      const boxHeight = padding + textHeight + padding;

      // Page break if needed
      if (y + boxHeight > page.height - bottomMargin) {
        doc.addPage();
        drawTitle();
        x = leftMargin;
        y = topMargin + 40;
        col = 0;
      }

      // Rectangle border
      doc.lineWidth(1).strokeColor("#333");
      doc.rect(x, y, cardWidth, boxHeight).stroke();

      // Content
      let textY = y + padding;
      fields.forEach((f) => {
        doc
          .font(f.bold ? FONT_BOLD : FONT_REG)
          .fontSize(f.size)
          .fillColor("#000")
          .text(f.text, x + padding, textY, {
            width: contentWidth,
            lineGap: f.gap,
          });
        const h = doc.heightOfString(f.text, {
          width: contentWidth,
          lineGap: f.gap,
        });
        textY += h + fieldSpacing;
      });

      // Next column/row
      col++;
      if (col >= maxCols) {
        col = 0;
        x = leftMargin;
        y += boxHeight + gapY;
      } else {
        x += cardWidth + gapX;
      }
    });

    if (!payments.length) {
      doc.moveDown(2);
      doc
        .font(FONT_REG)
        .fontSize(12)
        .fillColor("#555")
        .text("No completed payments found for the selected date range.", {
          align: "center",
        });
    }

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    // If headers already sent, just end the response
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    } else {
      try {
        res.end();
      } catch (_) {}
    }
  }
};
