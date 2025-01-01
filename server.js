const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://hushes.vercel.app",
    // origin: "https://hushes-frontend.vercel.app",
    //backup previous
    methods: ["GET", "POST"],
  },
});

let rooms = {};
let roomTimers = {};

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
