const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Store connected clients
let clients = [];
let latestData = {
    temperature: 0,
    humidity: 0,
    light: 0,
    waterLevel: 0,
    fanStatus: false,
    ledStatus: false,
    tankStatus: '',
    pumpStatus: false  // Added pump status
};

// SSE endpoint
app.get('/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        response: res
    };
    
    clients.push(newClient);
    res.write(`data: ${JSON.stringify(latestData)}\n\n`);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
    });
});

// Endpoint for ESP32 data
app.post('/sensor-data', (req, res) => {
    latestData = req.body;
    
    // Log received data for debugging
    console.log('Received sensor data:', latestData);
    
    clients.forEach(client => {
        client.response.write(`data: ${JSON.stringify(latestData)}\n\n`);
    });
    
    res.json({ 
        success: true,
        message: 'Data received and broadcasted to all clients'
    });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connectedClients: clients.length
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Health check available at /health`);
});
