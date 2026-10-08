const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "32kb" }));

const PORT = process.env.PORT || 10000;

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || !process.env.DEVICE_API_KEY) {
  console.warn("WARNING: MONGODB_URI, JWT_SECRET and DEVICE_API_KEY should be configured.");
}

const telemetrySchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  wifi: Boolean,
  ip: String,
  gpsFix: Boolean,
  satellites: Number,
  latitude: Number,
  longitude: Number,
  acceleration: Number,
  ax: Number,
  ay: Number,
  az: Number,
  gx: Number,
  gy: Number,
  gz: Number,
  temperature: Number,
  impactDetected: Boolean,
  vibrationDetected: Boolean,
  sosActive: Boolean,
  oled: Boolean,
  buzzer: Boolean,
  led: Boolean,
  eventType: String,
  event: String,
  receivedAt: { type: Date, default: Date.now, index: true }
}, { versionKey: false });

const Telemetry = mongoose.model("Telemetry", telemetrySchema);

function deviceAuth(req, res, next) {
  const key = req.get("X-Device-Key");
  if (!key || key !== process.env.DEVICE_API_KEY) {
    return res.status(401).json({ error: "Invalid device key" });
  }
  next();
}

function adminAuth(req, res, next) {
  const auth = req.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "RAKSHA IoT Cloud API",
    time: new Date().toISOString()
  });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { role: "admin", username },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token });
});

app.post("/api/device/telemetry", deviceAuth, async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload.deviceId) {
      return res.status(400).json({ error: "deviceId is required" });
    }

    const saved = await Telemetry.create({
      deviceId: String(payload.deviceId),
      wifi: Boolean(payload.wifi),
      ip: payload.ip || "",
      gpsFix: Boolean(payload.gpsFix),
      satellites: Number(payload.satellites || 0),
      latitude: Number(payload.latitude || 0),
      longitude: Number(payload.longitude || 0),
      acceleration: Number(payload.acceleration || 0),
      ax: Number(payload.ax || 0),
      ay: Number(payload.ay || 0),
      az: Number(payload.az || 0),
      gx: Number(payload.gx || 0),
      gy: Number(payload.gy || 0),
      gz: Number(payload.gz || 0),
      temperature: Number(payload.temperature || 0),
      impactDetected: Boolean(payload.impactDetected),
      vibrationDetected: Boolean(payload.vibrationDetected),
      sosActive: Boolean(payload.sosActive),
      oled: Boolean(payload.oled),
      buzzer: Boolean(payload.buzzer),
      led: Boolean(payload.led),
      eventType: payload.eventType || "SYSTEM",
      event: payload.event || ""
    });

    res.status(201).json({
      ok: true,
      id: saved._id,
      receivedAt: saved.receivedAt
    });
  } catch (error) {
    console.error("Telemetry error:", error);
    res.status(500).json({ error: "Could not store telemetry" });
  }
});

app.get("/api/device/:deviceId/latest", adminAuth, async (req, res) => {
  try {
    const latest = await Telemetry.findOne({
      deviceId: req.params.deviceId
    }).sort({ receivedAt: -1 }).lean();

    if (!latest) {
      return res.status(404).json({ error: "No telemetry received yet" });
    }

    res.json(latest);
  } catch (error) {
    console.error("Latest telemetry error:", error);
    res.status(500).json({ error: "Could not retrieve telemetry" });
  }
});

app.get("/api/device/:deviceId/history", adminAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 500);

    const rows = await Telemetry.find({
      deviceId: req.params.deviceId
    })
      .sort({ receivedAt: -1 })
      .limit(limit)
      .lean();

    res.json(rows);
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ error: "Could not retrieve history" });
  }
});

// Serve the simple cloud dashboard.
app.use("/", express.static(path.join(__dirname, "..", "dashboard")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "dashboard", "index.html"));
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`RAKSHA API listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  });
