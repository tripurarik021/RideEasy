# GoRide — Real-Time Ride-Hailing Platform

A full-stack ride-hailing system with real-time matching, geospatial driver search, WebSocket communication, and a polished React frontend.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│  PassengerDashboard  DriverDashboard  RatingPage         │
│  Mapbox GL JS        Zustand Store    Socket.IO Client   │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP + WebSocket
┌──────────────────────────▼──────────────────────────────┐
│               BACKEND (Express + Socket.IO)              │
│                                                          │
│  Routes → Controllers → Services → Models                │
│  Auth (JWT)  │  Ride Lifecycle  │  Driver Matching        │
│              │                  │                         │
│  ┌───────────▼──────────────────▼────────────────────┐   │
│  │                    Redis                          │   │
│  │  • GEOADD/GEOSEARCH  — driver location index     │   │
│  │  • ZSET              — driver ranking by dist    │   │
│  │  • PUB/SUB           — ride status broadcasts   │   │
│  │  • GET/SETEX         — route & pricing cache     │   │
│  │  • Bull Queues       — background job processing │   │
│  └───────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │                   MongoDB                         │   │
│  │  Users  Rides  Ratings  Transactions              │   │
│  │  2dsphere indexes for geospatial fallback         │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Zustand | UI, state management |
| Maps | Mapbox GL JS + react-map-gl | Real-time map visualization |
| Backend | Node.js + Express | REST API |
| Real-time | Socket.IO 4 | Bidirectional WebSocket events |
| Primary DB | MongoDB 7 + Mongoose | Users, rides, ratings |
| Cache/Geo | Redis 7 | Geospatial queries, pub/sub, caching |
| Queue | Bull (Redis-backed) | Background job processing |
| Auth | JWT (access + refresh tokens) | Stateless authentication |
| Container | Docker + docker-compose | Local dev + deployment |
| API Docs | Swagger/OpenAPI 3.0 | Interactive API documentation |

---

##  Quick Start
### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local dev without Docker)
- A [Mapbox](https://mapbox.com) account (free tier works)

### 1. Clone and configure

```bash
git clone <repo-url>
cd ridehail
cp .env.example .env
```

Edit `.env` and set your Mapbox token:
```env
REACT_APP_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

### 2. Start with Docker (recommended)

```bash
docker-compose up --build
```

Services start on:
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| API Docs | http://localhost:5000/api-docs |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |

### 3. Local development (without Docker)

**Backend:**
```bash
cd backend
npm install
# Ensure MongoDB and Redis are running locally
npm run dev          # nodemon auto-reload
```

**Frontend:**
```bash
cd frontend
npm install
npm start            # CRA dev server on :3000
```

---

## 🗂️ Project Structure

```
ridehail/
├── docker-compose.yml          # Full stack orchestration
├── .env.example                # All environment variables documented
├── docker/
│   ├── mongo-init.js           # DB init with indexes
│   └── nginx.conf              # SPA + proxy config
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js           # Bootstrap: DB + Redis + Socket.IO + HTTP
│       ├── app.js              # Express middleware stack + routes
│       ├── config/
│       │   ├── database.js     # MongoDB connection with retry
│       │   ├── redis.js        # Redis geo, pub/sub, cache helpers
│       │   ├── socket.js       # Socket.IO initialization + event handlers
│       │   └── swagger.js      # OpenAPI spec
│       ├── models/
│       │   ├── User.js         # User schema (passenger + driver)
│       │   ├── Ride.js         # Ride lifecycle schema
│       │   └── Rating.js       # Rating schema
│       ├── services/
│       │   ├── auth.service.js    # Registration, login, token refresh
│       │   ├── ride.service.js    # Core ride business logic
│       │   ├── driver.service.js  # Driver availability + geo search
│       │   ├── rating.service.js  # Rating submission + aggregation
│       │   └── pricing.service.js # Fare calculation + surge pricing
│       ├── controllers/        # Thin HTTP handlers (call services)
│       ├── routes/             # Express routers with Swagger annotations
│       ├── middleware/
│       │   ├── auth.js         # JWT verify + role authorization
│       │   ├── validate.js     # express-validator rule sets
│       │   └── errorHandler.js # Central error handling
│       ├── jobs/
│       │   └── queueManager.js # Bull queue init + job processors
│       └── utils/
│           └── logger.js       # Winston + daily rotating files
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.js              # Router + role-based routing
        ├── index.js
        ├── store/
        │   └── index.js        # Zustand stores (auth, ride, driver)
        ├── services/
        │   ├── api.js          # Axios client + all API calls
        │   └── socket.js       # Socket.IO client + emit helpers
        ├── hooks/
        │   ├── useSocket.js    # Global socket event wiring
        │   └── useGeolocation.js # GPS tracking hook
        ├── components/
        │   ├── auth/           # Login, Register pages
        │   ├── map/            # Mapbox map with live markers
        │   ├── booking/        # Passenger dashboard, history
        │   ├── driver/         # Driver dashboard
        │   └── rating/         # Post-ride rating UI
        └── styles/
            └── globals.css     # Design system CSS variables
```

---

## 🔌 API Reference

Full interactive docs at `http://localhost:5000/api-docs`

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login, receive JWT pair |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate session |
| GET  | `/api/v1/auth/me` | Get current user |

### Rides

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/rides/estimate` | Any | Fare estimate (no ride created) |
| POST | `/api/v1/rides` | Passenger | Create ride request |
| GET  | `/api/v1/rides` | Any | Get ride history (paginated) |
| GET  | `/api/v1/rides/:id` | Any | Get ride details |
| PATCH | `/api/v1/rides/:id/accept` | Driver | Accept ride |
| PATCH | `/api/v1/rides/:id/start` | Driver | Start ride |
| PATCH | `/api/v1/rides/:id/complete` | Driver | Complete ride |
| PATCH | `/api/v1/rides/:id/cancel` | Any | Cancel ride |

### Drivers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/v1/drivers/nearby` | Any | Find nearby available drivers |
| PATCH | `/api/v1/drivers/availability` | Driver | Set online/offline |
| PATCH | `/api/v1/drivers/location` | Driver | Update GPS location |
| GET  | `/api/v1/drivers/stats` | Driver | Earnings + trip stats |

### Ratings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/ratings/ride/:rideId` | Any | Submit rating for ride |
| GET  | `/api/v1/ratings/me` | Any | My received ratings |
| GET  | `/api/v1/ratings/user/:userId` | Any | User's public ratings |

---

## ⚡ Real-Time Events (Socket.IO)

### Connection
```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000', {
  auth: { token: 'your_jwt_token' }
});
```

### Events — Emitted TO clients

| Event | Recipient | Payload |
|-------|-----------|---------|
| `ride:new_request` | Nearby drivers | `{ rideId, passenger, pickupLocation, dropoffLocation, estimatedFare }` |
| `ride:status_update` | Passenger + Driver | `{ rideId, status, driver?, fare? }` |
| `driver:location` | Passenger (active ride) | `{ driverId, lat, lng, rideId }` |
| `driver:availability_confirmed` | Driver | `{ available }` |

### Events — Emitted FROM clients

| Event | Who | Payload |
|-------|-----|---------|
| `driver:update_location` | Driver | `{ lat, lng, rideId? }` |
| `driver:set_availability` | Driver | `{ available, lat?, lng? }` |
| `ride:join` | Any | `{ rideId }` |
| `ride:leave` | Any | `{ rideId }` |

---

## 🗺️ Redis Implementation

### Geospatial Driver Index
```
GEOADD drivers:available <lng> <lat> <driverId>
GEOSEARCH drivers:available FROMLONLAT <lng> <lat> BYRADIUS 5000 m ASC COUNT 10 WITHCOORD WITHDIST
ZREM drivers:available <driverId>    # when driver goes offline
```

### Pub/Sub Channels
```
ride:status:<rideId>          # Ride lifecycle events
driver:location:<driverId>    # Driver GPS broadcasts
```

### Cache Keys
```
user:session:<userId>          TTL: 600s  (session cache)
pricing:config:<vehicleType>   TTL: 300s  (pricing models)
route:<lat,lng>-<lat,lng>:type TTL: 3600s (estimated routes)
driver:available:<driverId>    TTL: 43200s (availability flag)
```

### Sorted Sets (Driver Ranking)
```
ride:drivers:<rideId>          Score = distance in metres
                               TTL: 300s (auto-expire after 5 min)
```

---

## 🏗️ Background Jobs (Bull)

| Queue | Trigger | Action |
|-------|---------|--------|
| `ride-completion` | Ride marked complete | Analytics, driver payout, push notifications |
| `ride-timeout` | Ride created (delayed job) | Auto-cancel if no driver accepts within timeout |
| `driver-ranking` | Periodic | Refresh driver geo rankings |

Jobs use Redis as backend, with exponential backoff retries and automatic cleanup of completed/failed jobs.

---

## 💰 Pricing Model

```
Fare = (baseFare + distanceKm × costPerKm + durationMin × costPerMin) × surgeMultiplier

Vehicle multipliers:
  economy : 1.0×
  comfort : 1.4×
  xl      : 1.8×

Surge (peak hours 7-9am, 5-7pm): 1.5×
Max surge: 3.0× (configurable)
```

All pricing parameters are configurable via `.env` and cached in Redis.

---

## 🔒 Security

- **Helmet.js** — HTTP security headers
- **express-mongo-sanitize** — NoSQL injection prevention
- **express-rate-limit** — 200 req/15min (API), 20 req/15min (auth)
- **bcryptjs** — Password hashing (cost factor 12)
- **JWT** — Short-lived access tokens (7d) + refresh tokens (30d)
- **express-validator** — Input validation + sanitization
- **Non-root Docker user** — Containers run as `appuser`
- **Request size limit** — 10kb body limit

---

## 📊 MongoDB Indexes

| Collection | Index | Type |
|------------|-------|------|
| users | `location` | 2dsphere |
| users | `email` | unique |
| users | `role, isOnline` | compound |
| rides | `pickupLocation` | 2dsphere |
| rides | `dropoffLocation` | 2dsphere |
| rides | `status, createdAt` | compound |
| rides | `passengerId, status` | compound |
| rides | `driverId, status` | compound |
| ratings | `rideId, raterId` | unique compound |
| ratings | `ratedUserId` | index |

---

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild after code changes
docker-compose up --build

# Stop all services
docker-compose down

# Reset (remove volumes)
docker-compose down -v

# Access MongoDB shell
docker exec -it ridehail_mongo mongosh -u admin -p secret

# Access Redis CLI
docker exec -it ridehail_redis redis-cli -a redispass
```

---

## 🧪 Development Tips

### Testing the API with curl

```bash
# Register a passenger
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com","password":"Pass1234","phone":"+1234567890","role":"passenger"}'

# Get fare estimate
curl -X POST http://localhost:5000/api/v1/rides/estimate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pickupCoordinates":[-74.006,40.7128],"dropoffCoordinates":[-73.985,40.748],"vehicleType":"economy"}'

# Find nearby drivers
curl "http://localhost:5000/api/v1/drivers/nearby?lat=40.7128&lng=-74.006&radius=5000" \
  -H "Authorization: Bearer <token>"
```

### Simulating a full ride flow
1. Register a **driver** and a **passenger**
2. Driver: `PATCH /drivers/availability` `{ available: true, lat, lng }`
3. Passenger: `POST /rides` with pickup + dropoff
4. Driver: `PATCH /rides/:id/accept`
5. Driver: `PATCH /rides/:id/start`
6. Driver: `PATCH /rides/:id/complete`
7. Both: `POST /ratings/ride/:id` with score

---

## 📝 Environment Variables

See `.env.example` for all variables with descriptions. Key ones:

```env
JWT_SECRET=                   # Min 32 chars, random string
MONGO_URI=                    # MongoDB connection string
REDIS_URL=                    # Redis connection string
REACT_APP_MAPBOX_TOKEN=       # Mapbox public token (pk.*)
DRIVER_SEARCH_RADIUS=5000     # Initial search radius (metres)
SURGE_MULTIPLIER_MAX=3.0      # Max surge pricing cap
RIDE_REQUEST_TIMEOUT_SECONDS=30  # Auto-cancel if no driver accepts
```

---


