const buckets = new Map();

const getClientKey = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const ip = forwardedIp ? forwardedIp.split(',')[0].trim() : req.ip;
    return `${ip}:${req.originalUrl.split('?')[0]}`;
};

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 20 } = {}) => {
    return (req, res, next) => {
        const now = Date.now();
        const key = getClientKey(req);
        const current = buckets.get(key);

        if (!current || current.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        current.count += 1;

        if (current.count > max) {
            const retryAfter = Math.ceil((current.resetAt - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
        }

        next();
    };
};

setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
        }
    }
}, 15 * 60 * 1000).unref();

module.exports = rateLimit;
