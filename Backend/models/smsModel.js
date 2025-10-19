import mongoose, { model, Types } from "mongoose";

const smsCounterSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // format: YYYY-MM-DD
  count: { type: Number, default: 0 },
});

const smsCounterModel = model("SMSCounter", smsCounterSchema);

export default smsCounterModel;
