const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

process.on('exit', (code) => {
    console.log(`PROCESS EXIT: Node process exited with code: ${code}`);
});

process.on('SIGINT', () => {
    console.log('PROCESS SIGNAL: Received SIGINT (Ctrl+C)');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('PROCESS SIGNAL: Received SIGTERM');
    process.exit(0);
});

process.on('beforeExit', (code) => {
    console.log(`PROCESS BEFORE EXIT: No more work scheduled, code: ${code}`);
});

app.use(cors());
app.use((req, res, next) => {
    console.log(`REQ: ${req.method} ${req.url}`);
    next();
});
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', deployedAt: '2026-02-10 15:30' });
});

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const photoRoutes = require('./routes/photoRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);

// Increased timeout specifically for photo uploads
app.use('/api/photos/upload', (req, res, next) => {
    req.setTimeout(600000); // 10 minutes
    res.setTimeout(600000);
    next();
});
app.use('/api/photos', photoRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/webhooks/mercadopago', require('./controllers/webhookController').handleMercadoPagoWebhook);
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/proposals', require('./routes/proposalRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Heartbeat to keep process alive if event loop becomes silent
setInterval(() => {
    // This empty function ensures the event loop always has a scheduled task
}, 60000);

const server = app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Non-blocking collection check
    try {
        const rekognitionService = require('./services/rekognition');
        rekognitionService.ensureCollection();
    } catch (err) {
        console.error('Failed to start Rekognition collection check:', err);
    }
});

server.on('error', (err) => {
    console.error('SERVER ERROR:', err);
});

server.on('close', () => {
    console.log('SERVER CLOSED');
});
