const http = require("http");
const express = require("express");
const url = require("url");
const app = express();

app.use(express.static("public"));
app.use(express.json()); // To parse JSON bodies

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);
const WebSocket = require("ws");

let keepAliveId;

// WebSocket Servers
const wss = new WebSocket.Server({ server });

// Track WebSocket clients for each path
const ws1Clients = new Set();
const ws2Clients = new Set();

server.listen(serverPort);
console.log(`Server started on port ${serverPort} in stage ${process.env.NODE_ENV}`);

wss.on("connection", function (ws, req) {
    console.log("Connection Opened");
    console.log("Client size: ", wss.clients.size);

    const location = url.parse(req.url, true);

    if (location.pathname === '/ws1') {
        console.log('Client connected to Server 1');
        ws1Clients.add(ws);

        ws.on('message', (message) => {
            console.log(`Message from Server 1: ${message}`);
            // Handle Server 1 messages here
        });

        ws.on('close', () => {
            ws1Clients.delete(ws);
            console.log('Client disconnected from Server 1');
            if (ws1Clients.size === 0) {
                console.log("Last client disconnected from /ws1");
                clearInterval(keepAliveId);
            }
        });

    } else if (location.pathname === '/ws2') {
        console.log('Client connected to Server 2');
        ws2Clients.add(ws);

        ws.on('message', (message) => {
            console.log(`Message from Server 2: ${message}`);
            // Handle Server 2 messages here
        });

        ws.on('close', () => {
            ws2Clients.delete(ws);
            console.log('Client disconnected from Server 2');
            if (ws2Clients.size === 0) {
                console.log("Last client disconnected from /ws2");
                clearInterval(keepAliveId);
            }
        });

    } else {
        console.log('Unknown WebSocket path');
        ws.close();
    }

    if (wss.clients.size === 1) {
        console.log("First connection. Starting keepalive");
    }
});

// Implement broadcast function to forward messages to WebSocket clients
const broadcast = (clients, message) => {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
};

const basicAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // Check if Authorization header is present
    if (!authHeader) {
        return res.status(401).json({
            status: 'error',
            code: "401",
            message: 'Authorization header is required'
        });
    }

    // Basic authentication uses the format 'Basic <base64(username:password)>'
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Check if the provided username and password match the expected values
    const expectedUsername = 'SinarmasDigitalDay'; // Replace with your desired username
    const expectedPassword = 'C4VrHlXtRTzTzthfcfUZ2noY4QrnQW'; // Replace with your desired password

    if (username === expectedUsername && password === expectedPassword) {
        // Authentication successful
        next();
    } else {
        // Authentication failed
        return res.status(403).json({
            status: 'error',
            code: "403",
            message: 'Invalid credentials'
        });
    }
};

app.post('/vvip', basicAuth, (req, res) => {
    // Extract message body
    const { name, photo, is_vvip } = req.body;

    // Validate mandatory fields
    if (!name || is_vvip === undefined) {
        return res.status(400).json({
            status: 'error',
            code: "400",
            message: 'Name and is_vvip fields are mandatory'
        });
    }

    try {
        // Broadcast the message to WebSocket clients connected to /ws1
        broadcast(ws1Clients, req.body);

        console.log(`Forwarding data to /ws1: ${JSON.stringify(req.body)}`);
        res.status(200).json({
            error: false,
            code: "200",
            message: "Data successfully forwarded"
        });
    } catch (error) {
        console.error('Error forwarding data:', error);
        res.status(500).json({
            error: true,
            code: "500",
            message: 'An internal server error occurred'
        });
    }
});

app.post('/non-vvip', basicAuth, (req, res) => {
    // Extract message body
    const { name, photo, is_vvip } = req.body;

    // Validate mandatory fields
    if (!name || is_vvip === undefined) {
        return res.status(400).json({
            status: 'error',
            code: "400",
            message: 'Name and is_vvip fields are mandatory'
        });
    }

    try {
        // Broadcast the message to WebSocket clients connected to /ws2
        broadcast(ws2Clients, req.body);

        console.log(`Forwarding data to /ws2: ${JSON.stringify(req.body)}`);
        res.status(200).json({
            error: false,
            code: "200",
            message: "Data successfully forwarded"
        });
    } catch (error) {
        console.error('Error forwarding data:', error);
        res.status(500).json({
            error: true,
            code: "500",
            message: 'An internal server error occurred'
        });
    }
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/vvip', (req, res) => {
    res.send('URL Endpoint untuk peserta VVIP');
});

app.get('/non-vvip', (req, res) => {
    res.send('URL Endpoint untuk peserta non VVIP');
});
