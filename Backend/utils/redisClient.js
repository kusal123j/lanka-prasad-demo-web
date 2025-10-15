// utils/redisClient.js
import { createClient } from "redis";

const redis = createClient({
  url:
    process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${
      process.env.REDIS_PORT || 6379
    }`,
  password: process.env.REDIS_PASSWORD || undefined,
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err));

await redis.connect(); // important!

export default redis;
