# RAKSHA IoT Cloud - Phase 1

This package creates the cloud side of the RAKSHA IoT module.

Architecture:
ESP32 -> HTTPS/HTTP API -> Node.js/Express -> MongoDB Atlas -> Cloud Dashboard

The current ESP32 local dashboard can remain enabled as a fallback.

## 1. MongoDB Atlas
Create a MongoDB Atlas deployment and database user. Copy the Node.js connection URI.

## 2. Backend
cd backend
npm install

Copy `.env.example` to `.env` and fill in:
- MONGODB_URI
- ADMIN_USERNAME
- ADMIN_PASSWORD
- JWT_SECRET
- DEVICE_API_KEY

Run locally:
npm start

Open:
http://localhost:10000

## 3. Render
Create a Web Service from this Git repository.

Root Directory: (leave blank if this repository is uploaded as-is)
Build Command: `cd backend && npm install`
Start Command: `cd backend && npm start`

Set the same environment variables in Render.

Render web services should listen on `0.0.0.0` and use the PORT environment variable.

## 4. ESP32
The ESP32 must POST its telemetry to:
https://YOUR-RENDER-SERVICE.onrender.com/api/device/telemetry

with header:
X-Device-Key: YOUR_DEVICE_API_KEY

Do not put MongoDB credentials in the ESP32.

For the first hardware/cloud test, use the ESP32 HTTPS client with TLS verification handled appropriately. Do not use `setInsecure()` in a production deployment.

## 5. Custom domain
After the Render service works, add your own domain in Render and configure the DNS records requested by Render.

## Important
The cloud backend is a starting point for the IoT module. Before real emergency deployment, add proper device provisioning, certificate/TLS verification, rate limiting, audit logs, alert delivery, offline fallback, battery monitoring, and secure secret management.
