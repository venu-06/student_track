const store = new Map();

const getWindowKey = ({ key, now, windowMs }) => `${key}:${Math.floor(now / windowMs)}`;

export const rateLimit = ({ windowMs, maxRequests, keyFn, label }) => {
  return (req, res, next) => {
    const now = Date.now();
    const identity = keyFn ? keyFn(req) : req.ip;
    const bucketKey = getWindowKey({ key: `${label || "rl"}:${identity}`, now, windowMs });
    const currentCount = store.get(bucketKey) || 0;

    if (currentCount >= maxRequests) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    store.set(bucketKey, currentCount + 1);
    next();
  };
};
