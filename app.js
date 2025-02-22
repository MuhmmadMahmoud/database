require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting (100 requests/hour)
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 100 });
app.use(limiter);

// Database connection with UTF8MB4 support
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: 3306, // InfinityFree's MySQL port
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4', // Critical for Arabic/Eastern numerals
  waitForConnections: true,
  connectionLimit: 10
});

// API Key Authentication
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.query.api_key;
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Calculate license status
function getStatus(expireDate) {
  const today = new Date();
  const expire = new Date(expireDate);
  const thirtyDaysLater = new Date(today.setDate(today.getDate() + 30));

  if (expire < new Date()) return 'expired';
  if (expire <= thirtyDaysLater) return 'expiring_soon';
  return 'active';
}

// --- Car License Endpoint ---
app.get('/api/cars/:license', authenticateApiKey, async (req, res) => {
  try {
    const license = decodeURIComponent(req.params.license);
    
    const [rows] = await pool.query(
      'SELECT expire_date FROM car_licenses WHERE license_number = ?',
      [license]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    res.json({ status: getStatus(rows[0].expire_date) });
  } catch (err) {
    console.error('Car license error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Driver License Endpoint ---
app.get('/api/drivers/:license', authenticateApiKey, async (req, res) => {
  try {
    const license = decodeURIComponent(req.params.license);
    
    const [rows] = await pool.query(
      'SELECT expire_date FROM driver_licenses WHERE license_number = ?',
      [license]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    res.json({ status: getStatus(rows[0].expire_date) });
  } catch (err) {
    console.error('Driver license error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
