const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

if (!process.env.JWT_SECRET) {
    console.error('[CRITICAL] JWT_SECRET is missing in environment variables!');
    // In production, we should probably exit
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

const app = express();
const PORT = process.env.PORT || 3002;

const parseOrigin = (url) => {
    if (!url) return null;
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
};

const allowedOrigins = new Set([
    parseOrigin(process.env.CLIENT_URL),
    parseOrigin(process.env.SERVER_URL),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
].filter(Boolean));

if (process.env.CORS_ORIGINS) {
    process.env.CORS_ORIGINS
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
        .forEach(origin => allowedOrigins.add(origin));
}

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

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    }
}));
app.use((req, res, next) => {
    console.log(`REQ: ${req.method} ${req.url}`);
    next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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
const publicContractRoutes = require('./routes/publicContractRoutes');

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
app.use('/api/contracts', require('./routes/contractRoutes'));
app.use('/api/public-contracts', publicContractRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/client-emails', require('./routes/clientEmailRoutes'));
app.use('/api/financials', require('./routes/financialRoutes'));
app.use('/api/excel', require('./routes/excelRoutes'));
app.use('/api/debts', require('./routes/debtRoutes'));
app.use('/api/demands', require('./routes/demandRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.message);
    const status = err.status || 500;
    
    res.status(status).json({ 
        error: {
            message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
            code: err.code || 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        }
    });
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
