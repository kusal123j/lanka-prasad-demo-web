import mongoose from "mongoose";

const DBconnection = async () => {
  // Connection event listeners
  mongoose.connection.on("connected", () => {
    console.log("✅ MongoDB connection successful");
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.log("⚠️ MongoDB disconnected");
  });

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);

    // Optional retry after 5 seconds
    console.log("Retrying connection in 5 seconds...");
    setTimeout(DBconnection, 5000);

    // Exit process if you don't want retries
    // process.exit(1);
  }
};

export default DBconnection;
