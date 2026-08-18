// const cookieParser = require("cookie-parser");
// const socketIO = require("socket.io");
// const config = require("./config");
// const express = require("express");
// const tarkine = require("tarkine");
// const http = require("http");

// const app = express();
// const server = http.createServer(app);
// const io = new socketIO.Server(server);
// const PORT = process.env.PORT || config.port;
// global.remoteURL;

// global.IO = io;

// app.set("view engine", "html");
// app.engine("html", tarkine.renderFile);
// app.use(cookieParser());
// app.use(express.urlencoded({ extended: false }));
// app.use(express.static(__dirname + "/public"));
// app.use(express.json());

// app.use("/", require("./router"));

// server.listen(PORT, async () => {
//   const localURL = `http://localhost:${PORT}`;
//   remoteURL = await cloudflaredTunnel({
//     "--url": localURL,
//   }).url;

//   console.log(`LOCAL  : ${localURL}`);
//   console.log(`REMOTE : ${remoteURL}`);
// });

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const config = require("./config");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));
// Ensure express handles POST data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Add the POST route handler for /login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const config = require("./config");

  if (username === config.username && password === config.password) {
    // Redirect to map view on successful login
    res.redirect("/map.html");
  } else {
    res.status(401).send("Invalid credentials. Please try again.");
  }
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Receive consent-based location from sender
  socket.on("send-location", (data) => {
    // Broadcast location data to dashboard viewers
    io.emit("receive-location", { id: socket.id, ...data });
  });

  socket.on("disconnect", () => {
    io.emit("user-disconnected", socket.id);
  });
});

server.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
