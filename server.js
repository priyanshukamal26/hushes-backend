const path = require("path"); // Add this line
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let rooms = {};
let roomTimers = {};

app.use(express.static(path.join(__dirname, "../hushes-frontend/public")));

// Handle all other routes by serving index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../hushes-frontend/public/index.html"));
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join-room", (roomName) => {
    if (!roomName || typeof roomName !== "string") {
      socket.emit("error", "Invalid room name");
      return;
    }

    const roomId = roomName.trim();
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = [];
      console.log(`Room created: ${roomId}`);
    }

    console.log(`User ${socket.id} joined room: ${roomId}`);
    socket.emit("chat-history", rooms[roomId]);
    socket.emit("room-created", roomId);

    if (roomTimers[roomId]) {
      clearTimeout(roomTimers[roomId]);
      delete roomTimers[roomId];
    }

    socket.on("message", (message) => {
      if (!message || typeof message !== "string") return;
      rooms[roomId].push(message);
      io.to(roomId).emit("message", message);
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.id} disconnected`);
      if (io.sockets.adapter.rooms.get(roomName)?.size === 0) {
        delete rooms[roomName];
        console.log(`Room ${roomName} deleted`);
      }
      cleanupEmptyRooms(roomId);
    });
  });
});

function cleanupEmptyRooms(roomId) {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room || room.size === 0) {
    roomTimers[roomId] = setTimeout(() => {
      delete rooms[roomId];
      delete roomTimers[roomId];
      console.log(`Room ${roomId} deleted due to inactivity`);
    }, 3600000);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server is running on http://localhost:3000");
});