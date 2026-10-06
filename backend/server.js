require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();

// Connect to MongoDB Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// Serve Frontend Static Files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'PennyTracker Backend is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// Fallback to frontend index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred. Please try again.',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(` PennyTracker Server running on port ${PORT}`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
