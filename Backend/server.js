// server.js
import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { rateLimit } from "express-rate-limit";

import DBconnection from "./config/mangodb.js";
import connectCloudinary from "./config/cloudinary.js";
import redis from "./utils/redisClient.js"; // your Redis client (node-redis/ioredis)

import authRouter from "./Routes/authRoutes.js";
import userRouter from "./Routes/userRoutes.js";
import educatorRouter from "./Routes/educatorRoute.js";
import courseRouter from "./Routes/courseRoute.js";
import instructorRouter from "./Routes/instructorRoutes.js";

const port = process.env.PORT || 4000;
const app = express();

// CORS setup
const allowedOrigins = [
  "https://lanka-prasad-demo-web-froontend.vercel.app",
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

// Parsers
app.use(cookieParser());
app.use(express.json());

// DBs
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

// Trust proxy (for HTTPS, e.g., Vercel/Render/NGINX)
app.set("trust proxy", 1);

// Sessions (Redis)
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

// Start server (Socket.IO removed)
app.listen(port, () => console.log(`Server running on port ${port}`));

export default app; // If deploying to Vercel, you typically don't call app.listen and only export app.
