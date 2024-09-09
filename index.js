const http = require("http");
const express = require("express");
const app = express();

app.use(express.static("public"));
app.use(express.json()); // To parse JSON bodies

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);
const WebSocket = require("ws");

let keepAliveId;

const wss =
    process.env.NODE_ENV === "production"
        ? new WebSocket.Server({ server })
        : new WebSocket.Server({ port: 5001 });

server.listen(serverPort);
console.log(`Server started on port ${serverPort} in stage ${process.env.NODE_ENV}`);

wss.on("connection", function (ws, req) {
    console.log("Connection Opened");
    console.log("Client size: ", wss.clients.size);

    if (wss.clients.size === 1) {
        console.log("first connection. starting keepalive");
    }

    ws.on("message", (data) => {
        let stringifiedData = data.toString();
        if (stringifiedData === 'pong') {
            console.log('keepAlive');
            return;
        }
        broadcast(ws, stringifiedData, false);
    });

    ws.on("close", (data) => {
        console.log("closing connection");

        if (wss.clients.size === 0) {
            console.log("last client disconnected, stopping keepAlive interval");
            clearInterval(keepAliveId);
        }
    });
});

// Implement broadcast function because ws doesn't have it
const broadcast = (ws, message, includeSelf) => {
    if (includeSelf) {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    } else {
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
};

// New HTTP POST endpoint to forward messages to WebSocket clients
app.post('/forward', (req, res) => {
    const message = req.body;

    if (!message) {
        return res.status(400).send('Message is required');
    }

    // Broadcast message to all WebSocket clients
    broadcast(null, message, true);

    console.log(`Forwarding message: ${message}`);
    res.send('Message forwarded to WebSocket clients');
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});
