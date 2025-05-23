import rateLimit from "express-rate-limit"

//:: 429, too many rrequests
const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
  });

  const registerLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
  });

  export  { loginLimiter, registerLimiter };

