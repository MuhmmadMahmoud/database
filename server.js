// server.js
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
    tankStatus: ''
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
    
    clients.forEach(client => {
        client.response.write(`data: ${JSON.stringify(latestData)}\n\n`);
    });
    
    res.json({ success: true });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
