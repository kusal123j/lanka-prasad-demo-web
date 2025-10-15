// utils/generateStudentId.js
import userModel from "../models/userModel.js";

async function generateStudentId() {
  let studentId;
  let exists = true;

  while (exists) {
    // Generate random 6-digit number
    studentId = Math.floor(100000 + Math.random() * 900000).toString();

    // Check MongoDB for existing ID
    exists = await userModel.findOne({ studentId });
  }

  return studentId;
}

export default generateStudentId;
