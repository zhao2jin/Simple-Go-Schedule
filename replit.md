# Simply Go - Transit Schedule App

## Overview
Simply Go is an iOS mobile app for tracking GO Transit train schedules. Users can save their preferred commute routes and see upcoming departure times at a glance. The app features a simple reverse toggle to swap directions for the commute home.

## Tech Stack
- **Frontend**: React Native with Expo
- **Backend**: Express.js
- **Data Source**: Metrolinx Open API
- **Storage**: AsyncStorage (local)

## Features
- Save multiple commute routes
- View upcoming train departure times with countdown
- Reverse toggle to swap route directions
- Real-time service alerts
- Detailed route view with platform information
- Theme preference (light/dark/auto)

## Project Structure
```
client/
├── components/     # Reusable UI components
├── constants/      # Theme, colors, spacing
├── hooks/          # Custom React hooks
├── lib/            # Utilities (storage, API client)
├── navigation/     # React Navigation setup
└── screens/        # App screens

server/
├── routes.ts       # API endpoints (proxies Metrolinx API)
└── index.ts        # Express server setup

shared/
└── types.ts        # TypeScript type definitions
```

## API Endpoints
- `GET /api/stations` - List all GO Transit stations
- `GET /api/journey?origin=XX&destination=YY` - Get upcoming departures between two stations
- `GET /api/departures?stop=XX` - Get next services at a stop
- `GET /api/alerts` - Get current service alerts

## Environment Variables
- `METROLINX_API_KEY` - Required API key for Metrolinx Open API

## Running the App
1. Backend: `npm run server:dev` (port 5000)
2. Frontend: `npm run expo:dev` (port 8081)

## Design
- Brand color: GO Transit Green (#00853E)
- Swiss railway-inspired minimal design
- Large departure time displays for easy reading
