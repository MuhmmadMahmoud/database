const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Store connected clients and last activity timestamp
let clients = [];
let lastActivity = Date.now();

// Store latest sensor data
let latestData = {
    temperature: 0,
    humidity: 0,
    light: 0,
    waterLevel: 0,
    fanStatus: false,
    ledStatus: false,
    tankStatus: '',
    pumpStatus: false
};

// Keep track of server uptime
const startTime = Date.now();

// SSE endpoint
app.get('/events', (req, res) => {
    try {
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
        console.log(`New client connected. Total clients: ${clients.length}`);
        res.write(`data: ${JSON.stringify(latestData)}\n\n`);

        req.on('close', () => {
            clients = clients.filter(client => client.id !== clientId);
            console.log(`Client ${clientId} disconnected. Remaining clients: ${clients.length}`);
        });
    } catch (error) {
        console.error('Error in /events:', error);
        res.status(500).end();
    }
});

// Sensor data endpoint
app.post('/sensor-data', (req, res) => {
    try {
        lastActivity = Date.now();
        console.log('Received raw data:', req.body);
        
        // Update latest data
        latestData = {
            temperature: req.body.temperature || latestData.temperature,
            humidity: req.body.humidity || latestData.humidity,
            light: req.body.light || latestData.light,
            waterLevel: req.body.waterLevel || latestData.waterLevel,
            fanStatus: req.body.fanStatus || latestData.fanStatus,
            ledStatus: req.body.ledStatus || latestData.ledStatus,
            tankStatus: req.body.tankStatus || latestData.tankStatus,
            pumpStatus: req.body.pumpStatus || latestData.pumpStatus
        };
        
        console.log('Processed data:', latestData);
        
        // Broadcast to all connected clients
        clients.forEach(client => {
            try {
                client.response.write(`data: ${JSON.stringify(latestData)}\n\n`);
            } catch (error) {
                console.error(`Error broadcasting to client ${client.id}:`, error);
            }
        });
        
        res.json({ 
            success: true,
            message: 'Data received and broadcasted',
            clientCount: clients.length,
            processedData: latestData
        });
    } catch (error) {
        console.error('Error in /sensor-data:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    lastActivity = Date.now();
    res.json({ 
        status: 'healthy',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        lastActivity: new Date(lastActivity).toISOString(),
        connectedClients: clients.length,
        memoryUsage: process.memoryUsage(),
        lastData: latestData
    });
});

// Handle invalid routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server started at ${new Date().toISOString()}`);
    console.log(`Running on port ${port}`);
    console.log(`Health check available at /health`);
});

// Log periodic statistics
setInterval(() => {
    console.log(`
Server Statistics:
-----------------
Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s
Connected Clients: ${clients.length}
Last Activity: ${new Date(lastActivity).toISOString()}
Memory Usage: ${JSON.stringify(process.memoryUsage())}
Last Data: ${JSON.stringify(latestData)}
    `);
}, 300000); // Log every 5 minutes
