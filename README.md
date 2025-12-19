# 🌿 Bong Hits Tracker

Track your squad's smoke sessions with style.

## Quick Start

```bash
npm install
npm start
```

Visit `http://localhost:3000`

## Architecture

```mermaid
graph TB
    NFC[NFC Tag] -->|Redirects to| WEB[Web App]
    WEB -->|User taps button| API[Node.js API]
    API -->|Reads/Writes| JSON[taps.json]
    JSON -->|Daily IST Reset| API
    API -->|Returns stats| WEB
    WEB -->|Shows| UI[Leaderboard + Feed]
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant Server
    participant Storage

    User->>Browser: Tap NFC tag
    Browser->>Browser: Check username
    alt No username
        Browser->>User: Ask for name
        User->>Browser: Enter name
    end

    User->>Browser: Click hit button
    Browser->>Browser: Play sound + particles
    Browser->>Server: POST /api/tap {userId, username}
    Server->>Storage: Load taps.json
    Server->>Server: Check IST date, reset if new day
    Server->>Storage: Update count + add hit
    Server->>Browser: Return {userCount, leaderboard, recentHits}
    Browser->>User: Show updated stats
```

## Data Structure

```mermaid
graph LR
    subgraph taps.json
        A[lastReset: date]
        B[users: object]
        C[hits: array]
    end

    B -->|userId| D[count, username]
    C -->|hit| E[userId, username, timestamp]
```

## Features

- 🎯 **Auto-record on NFC tap** - Just tap the bong, hit is recorded!
- 🗣️ **Voice announcements** - "Nikku's 5th hit! crazzzzyy!"
- ⏱️ **5-second cooldown** - Prevents accidental double-taps
- 🏆 Live leaderboard (top 10)
- 💨 Real-time session feed
- 🎵 Bong sound effects
- ✨ Smoke particle animations
- 📱 Mobile-first responsive design
- 🔄 Daily reset at midnight IST
- 👤 Changeable usernames (click your name)
- 🎉 Ordinal numbers (1st, 2nd, 3rd, 4th...)
- 🔥 Dynamic exclamations based on hit count

## API Endpoints

### POST /api/tap
Records a hit.

**Body:** `{ userId, username }`

**Returns:** `{ userCount, totalTaps, totalUsers, leaderboard, recentHits }`

### GET /api/stats
Gets current stats without recording a hit.

**Returns:** `{ totalTaps, totalUsers, leaderboard, recentHits }`

## Tech Stack

```mermaid
graph LR
    A[Frontend] -->|HTML/CSS/JS| B[Animated UI]
    C[Backend] -->|Node.js + Express| D[REST API]
    E[Storage] -->|JSON File| F[taps.json]

    B --> D
    D --> F
```

## Deploy with ngrok

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from ngrok.com

# Authenticate (one-time)
ngrok config add-authtoken YOUR_TOKEN

# Start your server
npm start

# In another terminal, expose it
ngrok http 3000
```

Copy the ngrok URL and program it into your NFC tags.

## File Structure

```
.
├── index.html      # Frontend (trippy UI)
├── server.js       # Backend (Express API)
├── package.json    # Dependencies
└── taps.json       # Auto-generated data
```
