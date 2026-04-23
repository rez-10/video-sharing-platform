import redis from "redis";
const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.error("Redis Error:", err));
(async () => {
    try {
        await redisClient.connect();
        console.log("Redis connected...");
    } catch (err) {
        console.error("Redis connection failed:", err.message);
    }
})();
redisClient.on("end", () => {
    console.log("Redis client disconnected");
});

export default redisClient;