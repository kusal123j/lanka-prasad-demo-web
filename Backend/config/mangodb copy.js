import mongoose from "mongoose";

const DBconnection = async () => {
  mongoose.connection.on("connected", () => {
    console.log("MongoDB connection successful");
  });

  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default DBconnection;
