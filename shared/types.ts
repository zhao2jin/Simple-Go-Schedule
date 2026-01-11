export interface Station {
  code: string;
  name: string;
  locationName?: string;
  locationType?: string;
}

export interface SavedRoute {
  id: string;
  originCode: string;
  originName: string;
  destinationCode: string;
  destinationName: string;
  createdAt: number;
}

export interface Departure {
  tripNumber: string;
  departureTime: string;
  arrivalTime: string;
  platform?: string;
  delay: number;
  status: 'on_time' | 'delayed' | 'cancelled';
  line?: string;
}

export interface ServiceAlert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'severe';
  affectedRoutes?: string[];
}

export interface JourneyResult {
  departures: Departure[];
  alerts: ServiceAlert[];
  lastUpdated: number;
}

export interface UserPreferences {
  displayName: string;
  themeMode: 'light' | 'dark' | 'auto';
  notificationsEnabled: boolean;
}
