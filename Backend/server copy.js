import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import session from "express-session";
import { RedisStore } from "connect-redis";

import DBconnection from "./config/mangodb.js";
import connectCloudinary from "./config/cloudinary.js";
import redis from "./utils/redisClient.js"; // your Redis client

import authRouter from "./Routes/authRoutes.js";
import userRouter from "./Routes/userRoutes.js";
import educatorRouter from "./Routes/educatorRoute.js";
import courseRouter from "./Routes/courseRoute.js";
import instructorRouter from "./Routes/instructorRoutes.js";
import { rateLimit } from "express-rate-limit";
const port = process.env.PORT || 4000;
const app = express();

// CORS setup
const allowedOrigins = [
  "https://mylms-frontend.vercel.app",
  "https://mylms-software-web.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin || true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Cookie & Body parsers
app.use(cookieParser());
app.use(express.json());

// MongoDB & Cloudinary connections
DBconnection();
connectCloudinary();

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "Too many requests. Please try again in 15 minutes.",
});
app.use(limiter);

// Trust proxy (needed for Vercel/HTTPS)
app.set("trust proxy", 1);

// Session setup with Redis
app.use(
  session({
    store: new RedisStore({ client: redis, prefix: "sess:" }),
    secret: process.env.SESSION_SECRET || "super-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Routes
app.get("/", (req, res) => res.send("Backend server running!"));
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/educator", educatorRouter);
app.use("/api/course", courseRouter);
app.use("/api/instructor", instructorRouter);

// Start server with Socket.io
httpServer.listen(port, () => console.log(`Server running on port ${port}`));
export default app; // default export for Vercel
