# GO Transit Tracker - Design Guidelines

## 1. Brand Identity

**Purpose**: A no-nonsense transit companion for daily GO Transit commuters who need train times instantly.

**Aesthetic Direction**: Brutally minimal with editorial precision
- Maximum whitespace, essential information only
- Bold typographic hierarchy (times are HUGE)
- High contrast for outdoor readability
- Inspired by Swiss railway departure boards: clean, reliable, immediate
- The memorable element: Oversized time displays that feel like looking at a station board

**Differentiation**: The fastest way to see your next train. No scrolling through routes or tapping through menus—your saved routes appear immediately with massive, glanceable departure times.

## 2. Navigation Architecture

**Root Navigation**: Tab Bar (3 tabs)
- **My Routes** (Home icon) - Primary screen, shows saved routes
- **Add Route** (Plus icon, center position) - Route configuration
- **Profile** (User icon) - Settings and preferences

**No Authentication Required** - Local storage only. Profile screen includes customizable avatar, display name, and app preferences.

## 3. Screen-by-Screen Specifications

### 3.1 My Routes (Home Tab)
**Purpose**: Instantly view upcoming departures for all saved routes

**Layout**:
- Transparent navigation header, no title, right button: "Edit" (to reorder/delete routes)
- ScrollView root (not list - each route is a large card)
- Top inset: headerHeight + Spacing.xl
- Bottom inset: tabBarHeight + Spacing.xl

**Components**:
- Large route cards (one per saved route), each showing:
  - Origin → Destination (small, subtle text)
  - Next 3 departure times (HUGE bold numbers with minute countdown)
  - Service alerts (if any) in warning color, inline below times
  - Tap card → Route Detail screen (modal)
- Floating Action: "Reverse" toggle button (bottom-right, above tab bar) - swaps all origins/destinations
- Empty state: Large centered illustration (empty-routes.png) + "Add your first route" text + button to Add Route tab

### 3.2 Route Detail (Modal)
**Purpose**: View full schedule and status for selected route

**Layout**:
- Default navigation header with "Done" button (right)
- Title: Origin → Destination
- ScrollView root
- Top inset: Spacing.xl
- Bottom inset: insets.bottom + Spacing.xl

**Components**:
- Current time indicator (small, top)
- List of upcoming departures (next 8-10 trains):
  - Departure time (large)
  - Platform/track number
  - Status (On Time / Delayed X min)
  - Scheduled arrival time at destination
- Service alerts section at top (if active)

### 3.3 Add Route (Center Tab)
**Purpose**: Configure a new route to track

**Layout**:
- Default navigation header with title "Add Route"
- Scrollable form
- Top inset: Spacing.xl
- Bottom inset: tabBarHeight + Spacing.xl

**Components**:
- Station picker for Origin (searchable dropdown)
- Station picker for Destination (searchable dropdown)
- "Save Route" button (large, primary color, at bottom of form)
- Uses Schedule/Journey API to validate route exists

### 3.4 Profile (Right Tab)
**Purpose**: App settings and user preferences

**Layout**:
- Default navigation header with title "Profile"
- ScrollView root
- Top inset: Spacing.xl
- Bottom inset: tabBarHeight + Spacing.xl

**Components**:
- Avatar (single preset illustration: profile-avatar.png)
- Display name field (text input)
- Notification preferences toggle (enable departure alerts)
- Theme preference (Light/Dark/Auto)
- About section (app version, privacy policy link, terms link)

## 4. Color Palette

**Primary**: #00853E (GO Transit green, bold and trustworthy)
**Accent**: #FFB81C (Warning/alert yellow, high visibility)
**Background**: #FAFAFA (Light) / #121212 (Dark)
**Surface**: #FFFFFF (Light) / #1E1E1E (Dark)
**Text Primary**: #1A1A1A (Light) / #FFFFFF (Dark)
**Text Secondary**: #666666 (Light) / #999999 (Dark)
**Delayed**: #E53935 (Urgent red for delays)
**On Time**: #00853E (Matches primary for consistency)

## 5. Typography

**Font**: System Font (SF Pro) - optimal for legibility and performance
- **Display (Departure Times)**: Bold, 48-56pt
- **Title (Route Names)**: Semibold, 18pt
- **Body**: Regular, 16pt
- **Caption (Status, metadata)**: Regular, 14pt

## 6. Visual Design

**iOS 26 Liquid Glass**: 
- Uses expo-glass-effect's GlassView for cards, tab bar, and navigation on iOS 26+
- Frosted glass effect with subtle GO green tint (primary + 12-15% opacity)
- Falls back to solid backgrounds on unsupported platforms
- Tab bar uses transparent glass with subtle blur
- Route cards use glass effect for modern translucent appearance

**Touchable Feedback**: All buttons/cards scale to 0.98 with spring animation on press
**Icons**: Use Feather icons from @expo/vector-icons - no emojis
**Shadows**: Replaced by glass effects on iOS 26+; fallback uses 1px borders

**Route Cards**:
- Glass effect with GO green tint on iOS 26+
- Fallback: solid surface color with 1px border
- Generous padding (24px)
- Rounded corners (24px)

## 7. Assets to Generate

**Required**:
1. **icon.png** - App icon featuring stylized train front view in GO green
2. **splash-icon.png** - Simplified train icon for launch screen
3. **empty-routes.png** - Illustration of empty train platform/station board, minimal line art style in secondary text color. WHERE USED: My Routes screen empty state
4. **profile-avatar.png** - Preset user avatar (simple, geometric, neutral). WHERE USED: Profile screen

**Recommended**:
5. **alert-illustration.png** - Small icon for service disruptions (megaphone/warning symbol). WHERE USED: Route cards and detail screen when alerts exist

**Asset Style**: Clean, minimal line illustrations. Single-color (text secondary) with subtle details. Avoid complexity—these support content, don't compete with it.