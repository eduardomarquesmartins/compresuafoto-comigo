const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_ENTRIES = 10_000;
let lastCleanup = 0;

const cleanup = (now) => {
    if (now - lastCleanup < WINDOW_MS) return;
    lastCleanup = now;
    for (const [key, value] of buckets) if (now - value.startedAt > WINDOW_MS) buckets.delete(key);
    while (buckets.size > MAX_ENTRIES) buckets.delete(buckets.keys().next().value);
};

exports.publicTokenGuard = (req, res, next) => {
    res.set('Referrer-Policy', 'no-referrer');
    const now = Date.now();
    cleanup(now);
    const key = `${req.ip}:${req.params.token || ''}`;
    const bucket = buckets.get(key) || { startedAt: now, count: 0 };
    if (now - bucket.startedAt > WINDOW_MS) { bucket.startedAt = now; bucket.count = 0; }
    bucket.count += 1;
    buckets.set(key, bucket);
    while (buckets.size > MAX_ENTRIES) buckets.delete(buckets.keys().next().value);
    if (bucket.count > 30) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em instantes.' });
    return next();
};

exports._internals = { buckets, cleanup, MAX_ENTRIES };
