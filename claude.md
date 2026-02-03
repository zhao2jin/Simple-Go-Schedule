# Simple Go Schedule - Codebase Reference

## Project Overview

Simple Go Schedule is a React Native mobile application (iOS/Android) built with Expo that helps GO Transit (Toronto commuter rail) passengers quickly check upcoming departure times for their regularly-commuted routes. The app prioritizes rapid access to train schedules with a brutally minimal, Swiss railway departure board aesthetic.

**Philosophy**: Minimal taps, huge glanceable time displays, editorial precision.

## Tech Stack

### Frontend (Mobile App)
- **React Native 0.81.5** with React 19.1.0
- **Expo 54.0.23** - Development platform
- **React Navigation 7.x** - Bottom tabs + native stack
- **TanStack React Query 5.90.7** - Data fetching and caching
- **Zod + drizzle-zod** - Schema validation
- **AsyncStorage** - Local device storage
- **React Native Reanimated 4.1.1** - Animations

### Backend (Node.js)
- **Express.js 4.21.2** - HTTP API server
- **Drizzle ORM 0.39.3** - Database ORM
- **PostgreSQL** - Database (minimal usage currently)
- **Stripe 20.0.0** - Donation payment processing
- **Node 22** - Runtime

### External APIs
- **Metrolinx OpenData API** - Real-time GO Transit schedule data
- **Stripe API** - Payment processing

### Build & Deployment
- **TypeScript 5.9.2** - Full type safety
- **EAS Build** - Expo build service
- **Replit** - Development environment
- **Cloud Run** - Production deployment

## Architecture Overview

### Directory Structure

```
Simple-Go-Schedule/
├── client/                  # React Native mobile app
│   ├── App.tsx             # Root component with providers
│   ├── components/         # Reusable UI components (20 files)
│   ├── screens/            # Main app screens (4 files)
│   ├── navigation/         # React Navigation setup (5 files)
│   ├── context/            # React Context providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and config
│   └── constants/          # Design system constants
│
├── server/                 # Express.js backend
│   ├── index.ts           # Express app setup
│   ├── routes.ts          # API endpoint handlers
│   ├── stripeClient.ts    # Stripe integration
│   └── templates/         # HTML templates
│
├── shared/                # Shared code (client & server)
│   ├── types.ts          # TypeScript interfaces
│   ├── schema.ts         # Drizzle ORM database schema
│   └── lines.ts          # GO Transit line definitions
│
└── assets/               # App icons and images
```

### Key Screens

1. **MyRoutesScreen** ([client/screens/MyRoutesScreen.tsx](client/screens/MyRoutesScreen.tsx))
   - Home screen showing all saved routes as large cards
   - Displays next 3 departures per route
   - Pull-to-refresh, reverse toggle, donation prompts
   - Auto-refreshes every 60 seconds

2. **AddRouteScreen** ([client/screens/AddRouteScreen.tsx](client/screens/AddRouteScreen.tsx))
   - Station picker for origin and destination
   - Saves routes to AsyncStorage
   - Duplicate detection and validation

3. **RouteDetailScreen** ([client/screens/RouteDetailScreen.tsx](client/screens/RouteDetailScreen.tsx))
   - Modal showing full journey schedule (next 10 departures)
   - Real-time delay information and status indicators
   - Auto-refresh every 60 seconds

4. **ProfileScreen** ([client/screens/ProfileScreen.tsx](client/screens/ProfileScreen.tsx))
   - Theme selection (Light/Dark/Auto)
   - Clear all data option
   - Haptic feedback on interactions

### Key Components

- **RouteCard** - Large card showing route with next 3 departures
- **SwipeableRouteCard** - Swipeable variant for edit/delete actions
- **DepartureRow** - Single departure with time, status, platform, delay
- **StationPicker** - Searchable dropdown of all GO stations
- **DonationModal** - Stripe-integrated donation prompt
- **CelebrationAnimation** - Lottie animation after donation
- **ThemedText/ThemedView** - Theme-aware wrapper components

## Data Models

### Core Types (from [shared/types.ts](shared/types.ts))

```typescript
interface Station {
  code: string;              // e.g., "UN" (Union Station)
  name: string;
  latitude?: number;
  longitude?: number;
}

interface SavedRoute {
  id: string;                // `${origin}-${destination}-${timestamp}`
  originCode: string;
  originName: string;
  destinationCode: string;
  destinationName: string;
  createdAt: number;
}

interface Departure {
  tripNumber: string;
  departureTime: string;     // ISO datetime
  arrivalTime: string;
  platform?: string;
  delay: number;             // Minutes
  status: 'on_time' | 'delayed' | 'cancelled';
  line?: string;
  vehicleType?: 'train' | 'bus';
}

interface JourneyResult {
  departures: Departure[];
  alerts: ServiceAlert[];
  lastUpdated: number;
}

interface UserPreferences {
  displayName: string;
  themeMode: 'light' | 'dark' | 'auto';
  notificationsEnabled: boolean;
}
```

### State Management

- **AsyncStorage (Local)**: Routes, preferences, donation tracking, reversed mode
- **React Query**: Remote API data with 30s stale time, 60s auto-refetch
- **React Context**: Theme mode and color scheme
- **Component State**: Form inputs, loading states, UI interactions

## API Integration

### Metrolinx OpenData API

**Base URL**: `https://api.openmetrolinx.com/OpenDataAPI`
**Auth**: `METROLINX_API_KEY` environment variable

**Key Endpoints**:

1. `GET /api/V1/Stop/All?key={apiKey}`
   - Returns all GO Transit stations
   - Cached for 1 hour on client

2. `GET /api/V1/Schedule/Journey/{date}/{origin}/{destination}/{time}/10?key={apiKey}`
   - Gets next 10 journeys between stations
   - Date: YYYYMMDD, Time: HHMM (24-hour Eastern Time)

3. `GET /api/V1/Stop/NextService/{stop}?key={apiKey}`
   - Real-time next service info with delays and platform

### Backend API Routes (Express)

- `GET /api/stations` - Returns cached station list
- `GET /api/journey?origin={code}&destination={code}` - Departures with real-time delays
- `GET /api/departures?stop={code}` - Real-time departures for a station
- `POST /api/create-checkout-session` - Stripe donation session
- `POST /api/webhook/stripe` - Stripe webhook handler
- `GET /manifest` or `/` - Expo manifest/landing page

## Important Patterns & Conventions

### Navigation Pattern

- **Bottom Tab Navigation**: 3 tabs (My Routes, Add Route, Profile)
- **Native Stack Modals**: Route Detail as full-screen modal
- **No Authentication**: Local-only app, no user accounts
- **Type-Safe Navigation**: RootStackParamList defines all screen params

### Data Fetching with React Query

```typescript
// Pattern used throughout:
useQuery({
  queryKey: ['stations'],
  queryFn: () => fetch('/api/stations').then(res => res.json()),
  staleTime: 30000,           // 30s before refetch
  refetchInterval: 60000,     // Auto-refresh every 60s
})
```

### Local Storage Pattern

All AsyncStorage operations use helper functions in [client/lib/storage.ts](client/lib/storage.ts):

```typescript
// Generic get/set pattern with silent failure:
export async function getRoutes(): Promise<SavedRoute[]> {
  try {
    const data = await AsyncStorage.getItem('routes');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];  // Silent failure returns default
  }
}
```

**Storage Keys**:
- `routes` - Array of SavedRoute objects
- `preferences` - UserPreferences object
- `isReversed` - Boolean for route reversal toggle
- `donationTracking` - First use date, last donation, last dismiss
- `usageCount` - Number of app launches

### Donation Logic

- Shows prompt after 30 days of first use
- Waits 30 days between reminders
- Valid donation lasts 2 years
- Tracks via AsyncStorage: first use date, last donation date, last dismiss date

### Theme System

```typescript
ThemeMode = 'light' | 'dark' | 'auto'
ColorScheme = 'light' | 'dark'

// Auto mode uses system color scheme
// Persists to AsyncStorage
// Injected via ThemeContext to all components
```

### Route Reversal Feature

- Toggle in MyRoutesScreen swaps origin/destination for ALL routes
- Persists to AsyncStorage under `isReversed` key
- Applied on-the-fly when navigating to detail screen
- Shows reversed journey result from same API call

### Real-Time Delay Calculation

1. Fetches scheduled departures from Journey API
2. Fetches real-time data from NextService API
3. Compares ScheduledDepartureTime vs ComputedDepartureTime
4. Calculates delay in minutes
5. Maps to status: `on_time` | `delayed` | `cancelled`

### Error Handling

- **ErrorBoundary**: Catches React rendering errors
- **API Error Fallback**: Returns `{ departures: [], alerts: [] }`
- **Validation**: Zod schemas for data validation
- **Alerts**: Native `Alert.alert()` for user-facing errors

### Haptic Feedback

- Light impact on pull-to-refresh
- Selection feedback on theme changes
- Success notification after route save
- Import from `expo-haptics` module

### GO Transit Line Data

Hardcoded in [shared/lines.ts](shared/lines.ts):
- 7 GO lines with station codes
- Lakeshore West (LW), Lakeshore East (LE), Milton (ML), Kitchener (KT), Barrie (BA), Richmond Hill (RH), Stouffville (ST)
- Used for static reference (API provides dynamic data)

### Timezone Handling

- All API queries use **Eastern Time** (America/Toronto)
- Uses `Intl.DateTimeFormat` with `timeZone` parameter
- Date format: YYYYMMDD for API, ISO for storage
- Time format: HHMM (24-hour) for API

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start backend (watches on port 5000)
npm run server:dev

# Start Expo dev server (separate terminal)
npm run expo:dev

# Open Expo Go app or iOS Simulator and scan QR code
```

### Testing & Quality

```bash
npm run lint              # ESLint
npm run lint:fix          # Auto-fix linting issues
npm run check:types       # TypeScript type checking
npm run format            # Prettier formatting
```

### Building for Production

```bash
npm run expo:static:build    # Bundles Expo app
npm run server:build         # Bundles Express server with esbuild
npm run server:prod          # Runs bundled server on port 5000
```

### Database Migrations

```bash
npm run db:push              # Run Drizzle migrations
npm run db:studio            # Open Drizzle Studio GUI
```

## Deployment

### Replit Configuration ([.replit](.replit))

- **Stack**: EXPO (React Native)
- **Runtime**: Node.js 22
- **Port**: 5000 (backend), 8081 (Expo bundler)
- **Environment**: Stripe integration via Replit connector

### Cloud Run Deployment

- Auto-deploys on push to Replit
- Build: `npm run expo:static:build && npm run server:build`
- Run: `npm run server:prod`
- Port: 5000
- Environment variables injected from Replit

### EAS Build ([eas.json](eas.json))

```bash
# Build iOS simulator for development
eas build --profile development --platform ios

# Build for internal testing
eas build --profile preview --platform ios

# Build for App Store submission
eas build --profile production --platform ios
```

**Profiles**:
- **Development**: Simulator build, debug mode
- **Preview**: Internal distribution, beta testing
- **Production**: Signed iOS app ready for App Store

### App Metadata ([app.json](app.json))

- **Name**: "Simple Go Schedule"
- **Slug**: `mygotrainschedule`
- **Bundle ID (iOS)**: `com.mygotrainschedule.app`
- **Bundle ID (Android)**: `com.mygotrainschedule.app`
- **Orientation**: Portrait only
- **New Architecture**: Enabled (React Native new architecture)
- **React Compiler**: Enabled (experimental)

## Environment Variables

### Required Variables

- `METROLINX_API_KEY` - API key for Metrolinx OpenData API
- `DATABASE_URL` - PostgreSQL connection string
- `STRIPE_SECRET_KEY` - Stripe API secret key (auto-configured via Replit connector)

### Development vs Production

- Development: Uses Expo Go, connects to localhost:5000
- Production: Uses bundled server on Cloud Run, connects to production API

## Key Features Summary

1. **Fast Route Lookup** - Saved routes with next 3 departures at a glance
2. **Real-Time Delays** - Updates every 60 seconds with Metrolinx API
3. **Route Reversal** - Quick toggle to swap origin/destination for all routes
4. **Dark Mode** - Full light/dark/auto theme support with system integration
5. **Donation System** - In-app Stripe donations with celebration animation
6. **Offline Support** - Routes and preferences stored locally on device
7. **Responsive UI** - Safe area aware, platform-specific styling
8. **Swiss Design** - Minimal, editorial aesthetic with huge time displays
9. **Type Safe** - Full TypeScript, Zod validation, Drizzle ORM
10. **Haptic Feedback** - Delightful interactions with device haptics

## Common Tasks

### Adding a New Screen

1. Create screen component in [client/screens/](client/screens/)
2. Add to appropriate navigator in [client/navigation/](client/navigation/)
3. Update `RootStackParamList` type for navigation params
4. Import and configure in navigator with screen options

### Adding a New API Endpoint

1. Add handler function in [server/routes.ts](server/routes.ts)
2. Register route in [server/index.ts](server/index.ts)
3. Update types in [shared/types.ts](shared/types.ts)
4. Create React Query hook in screen/component
5. Handle loading/error states in UI

### Modifying the Theme

1. Update color definitions in [client/constants/theme.ts](client/constants/theme.ts)
2. Colors auto-apply to all `ThemedText` and `ThemedView` components
3. Custom components can use `useTheme()` hook for color access

### Adding a New Storage Key

1. Add getter/setter functions in [client/lib/storage.ts](client/lib/storage.ts)
2. Define TypeScript interface in [shared/types.ts](shared/types.ts)
3. Use in components via async/await pattern
4. Handle errors with silent failure returning defaults

### Updating GO Transit Line Data

1. Edit [shared/lines.ts](shared/lines.ts)
2. Update station codes and line mappings
3. No rebuild needed (data is static reference)
4. API provides dynamic/real-time data

## Troubleshooting

### Common Issues

1. **API returns empty departures**
   - Check `METROLINX_API_KEY` is set correctly
   - Verify station codes are valid GO Transit stations
   - Check API rate limits and quota

2. **Routes not saving**
   - Check AsyncStorage permissions on device
   - Verify route IDs are unique
   - Check for duplicate route detection logic

3. **Theme not persisting**
   - Ensure `ThemeContext` wraps entire app in [client/App.tsx](client/App.tsx)
   - Check AsyncStorage key `preferences` is being saved
   - Verify theme mode is valid: `light` | `dark` | `auto`

4. **Build failures**
   - Run `npm run check:types` to find TypeScript errors
   - Run `npm run lint:fix` to auto-fix linting issues
   - Clear Metro bundler cache: `npx expo start -c`

5. **Real-time delays not showing**
   - Check NextService API response format
   - Verify timezone conversion (Eastern Time)
   - Ensure React Query refetchInterval is active

---

**Last Updated**: 2026-02-03
**Codebase Version**: See [package.json](package.json) for current version
