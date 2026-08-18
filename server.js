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
require("dotenv").config({ override: true });
const http = require("http");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const path = require("path");
const config = require("./config");

const preferredPort = Number(process.env.PORT) || Number(config.PORT) || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server);

function issueToken(user) {
  return jwt.sign(
    {
      username: user.username,
      role: user.role,
    },
    config.JWT_SECRET,
    { expiresIn: "8h" },
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const tokenFromHeader = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const token = req.cookies?.authToken || tokenFromHeader;

  if (!token) {
    return res.redirect("/login.html");
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    res.clearCookie("authToken");
    return res.redirect("/login.html");
  }
}

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res
        .status(403)
        .send(`Access denied. Requires ${requiredRole} role.`);
    }

    return next();
  };
}

function loginUser(req, res) {
  const { username, password } = req.body || {};
  const userRole = config.ROLE || "admin";

  if (username === config.USERNAME && password === config.PASSWORD) {
    const token = issueToken({ username, role: userRole });

    res.cookie("authToken", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    });

    return res.json({
      success: true,
      message: "Login successful",
      redirect: "/map.html",
      user: { username, role: userRole },
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials. Please try again.",
  });
}

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/login.html", (req, res) => {
  const token = req.cookies?.authToken;

  if (token) {
    try {
      jwt.verify(token, config.JWT_SECRET);
      return res.redirect("/map.html");
    } catch (error) {
      res.clearCookie("authToken");
    }
  }

  return res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/logout", (req, res) => {
  res.clearCookie("authToken");
  return res.redirect("/login.html");
});

app.post("/api/login", loginUser);
app.post("/login", loginUser);

app.get("/", requireAuth, (req, res) => {
  res.redirect("/map.html");
});

app.get("/map.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "map.html"));
});

app.get("/weather.html", requireAuth, requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "views", "weather.html"));
});

app.post("/weather", requireAuth, requireRole("admin"), (req, res) => {
  const { id, lat, lng } = req.body || {};

  if (id && lat !== undefined && lng !== undefined) {
    io.emit("map-data", { id, lat, lng });
  }

  return res.json({ success: true });
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

function startServer(port) {
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const nextPort = port + 1;
      console.log(`Port ${port} is busy. Trying ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error("Server error:", error);
    process.exit(1);
  });
}

startServer(preferredPort);
