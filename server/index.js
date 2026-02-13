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
app.use('/api/users', require('./routes/userRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
