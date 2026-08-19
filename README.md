# Live Location Tracker

A full-stack live location tracking application built with **Expo React Native (Clerk Auth)** and **Node.js (Express + Socket.IO)**.

## 📁 Project Architecture

```
live-location-tracker/
├── frontend/             ← Expo React Native Mobile App
│   ├── app/              ← Clerk Auth & 5 Navigation Tabs (Home, Map, History, Trace, Profile)
│   ├── services/         ← Socket.IO & REST API helpers
│   ├── hooks/            ← Custom useLocation hook
│   ├── .env              ← Expo & Clerk publishable keys
│   └── package.json
│
└── backend/              ← Express + Socket.IO Backend Server
    ├── views/            ← Trace consent HTML page & Web maps
    ├── .env              ← Backend PORT (3001) & JWT secrets
    ├── server.js         ← REST endpoints, Socket.IO & Trace Link engine
    └── package.json
```

---

## 🚀 How to Run

### 1. Start Backend Server
```bash
cd backend
npm run dev
```
> Running on `http://localhost:3001`

### 2. Start Mobile Frontend App
```bash
cd frontend
npx expo start
```
- Press `a` for Android Emulator.
- Scan QR code with Expo Go on physical mobile devices.

---

## 🔐 Authentication & Features
- **Clerk Authentication**: Sign-in, Sign-up with email code verification.
- **Live Map**: Real-time position tracking using WebView + Leaflet.js + Socket.IO.
- **Trace Feature**: Generate consent-based location request links to track target GPS.
- **Location History**: Past location points history timeline.
- **Profile & Settings**: Account details and configuration.
