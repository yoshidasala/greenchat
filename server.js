const express = require("express");
const path = require("path");
const http = require("http");

const socketio = require("socket.io");
const formatMessage = require("./utils/messages.js");
const {
  userJoin,
  getCurrentUser,
  userLeaves,
  getRoomUsers,
} = require("./utils/users.js");

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const username = "username";

// static file-serving middleware
app.use(express.static(path.join(__dirname, "public")));

//run when a client connects

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

    //welcome the user when they enter
    socket.emit(
      "message",
      formatMessage(username, "when life gives you lemons...")
    );

    //broadcast when any user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(username, `${user.username} has joined the chat`)
      );

    //send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  //listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  //runs when client disconnection
  socket.on("disconnect", () => {
    const user = userLeaves(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(username, `${user.username} has left the chat`)
      );
      //send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = 5000 || process.env.PORT;

server.listen(PORT, () => console.log(`server running on port ${PORT}`));
