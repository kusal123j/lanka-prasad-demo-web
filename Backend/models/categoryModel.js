import mongoose, { Types } from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "2025" or "Theory"
    type: {
      type: String,
      enum: ["main", "sub"],
      required: true,
    }, // main or sub category
    parent: { type: Types.ObjectId, ref: "Category", default: null },
    // if sub category, link to parent (main category)
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", CategorySchema);
export default Category;
