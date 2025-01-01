const express = require('express');
const app = express();
const cors = require('cors');

// Enable CORS for the frontend dashboard
app.use(cors());

// SSE endpoint
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send data every second
  setInterval(() => {
    const data = {
      temperature: 0,  // Placeholder, will be updated by ESP32
      humidity: 0,     // Placeholder
      light: 0,        // Placeholder
      water: 0,        // Placeholder
      fanStatus: 'OFF',  // Placeholder
      ledStatus: 'OFF',  // Placeholder
      tankStatus: 'Full', // Placeholder
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 1000);
});

// Serve static files (e.g., your HTML dashboard)
app.use(express.static('public'));

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
