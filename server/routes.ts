import type { Express } from "express";
import { createServer, type Server } from "node:http";

const METROLINX_BASE_URL = "https://api.openmetrolinx.com/OpenDataAPI";

async function fetchMetrolinx(endpoint: string, apiKey: string) {
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${METROLINX_BASE_URL}${endpoint}${separator}key=${apiKey}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Metrolinx API error: ${response.status}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response from Metrolinx API`);
  }
}

const LINE_DESTINATIONS: Record<string, string[]> = {
  "LW": ["AL", "BU", "AP", "BO", "OA", "CL", "PO", "LO", "MI", "EX", "UN", "HA", "WR", "SCTH", "NI"],
  "LE": ["OS", "WH", "AJ", "PIN", "RO", "GU", "EG", "SC", "DA", "UN"],
  "ML": ["ML", "LS", "ME", "SR", "ER", "CO", "DI", "KP", "UN"],
  "GT": ["KI", "GL", "AC", "GE", "MO", "BR", "BE", "MA", "ET", "WE", "BL", "UN"],
  "BA": ["BA", "AD", "BD", "EA", "NE", "AU", "KC", "MP", "RU", "DW", "UN"],
  "RH": ["RI", "BM", "GO", "LA", "OL", "OR", "UN"],
  "ST": ["LI", "ST", "MJ", "MR", "CE", "UI", "MK", "AG", "KE", "UN"],
};

const TRAIN_LINE_CODES = ["LW", "LE", "ML", "GT", "BA", "RH", "ST", "KI"];

function getVehicleType(lineCode: string, lineName: string): 'train' | 'bus' {
  if (TRAIN_LINE_CODES.includes(lineCode)) return 'train';
  if (lineName?.toLowerCase().includes('bus')) return 'bus';
  if (lineName?.toLowerCase().includes('train')) return 'train';
  if (lineCode?.startsWith('B') || lineCode?.length > 2) return 'bus';
  return 'train';
}

function getLineForRoute(origin: string, destination: string): string | undefined {
  for (const [lineCode, stations] of Object.entries(LINE_DESTINATIONS)) {
    if (stations.includes(origin) && stations.includes(destination)) {
      return lineCode;
    }
  }
  return undefined;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const apiKey = process.env.METROLINX_API_KEY;

  app.get("/api/stations", async (req, res) => {
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }
    try {
      const data = await fetchMetrolinx("/api/V1/Stop/All", apiKey);
      const stops = data?.Stations?.Station || data?.Stops || [];
      
      const trainStops = stops.filter((stop: any) => {
        const locationType = stop.LocationType || "";
        return locationType.includes("GO") || 
               locationType.includes("Train") || 
               locationType.includes("Rail") ||
               locationType.includes("Station");
      });

      const allStops = trainStops.length > 0 ? trainStops : stops.slice(0, 200);

      const stations = allStops.map((stop: any) => ({
        code: stop.LocationCode || stop.StopCode || stop.Code,
        name: stop.LocationName || stop.StopName || stop.Name,
        locationName: stop.LocationName,
        locationType: stop.LocationType,
        latitude: stop.Latitude || stop.StopLatitude,
        longitude: stop.Longitude || stop.StopLongitude,
      }));

      res.json({ stations });
    } catch (error: any) {
      console.error("Error fetching stations:", error.message);
      res.status(500).json({ error: "Failed to fetch stations" });
    }
  });

  app.get("/api/journey", async (req, res) => {
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ error: "Origin and destination required" });
    }
    try {
      const endpoint = `/api/V1/Stop/NextService/${origin}`;
      const data = await fetchMetrolinx(endpoint, apiKey);

      const lines = data?.NextService?.Lines || [];
      
      const expectedLine = getLineForRoute(origin as string, destination as string);
      
      const filteredLines = expectedLine 
        ? lines.filter((line: any) => {
            const lineCode = line.LineCode || "";
            const directionName = (line.DirectionName || "").toUpperCase();
            return lineCode === expectedLine || 
                   directionName.includes((destination as string).toUpperCase());
          })
        : lines;

      const departures = filteredLines.map((line: any) => {
        const scheduledTime = line.ScheduledDepartureTime || "";
        const computedTime = line.ComputedDepartureTime || "";
        
        let delayMinutes = 0;
        if (scheduledTime && computedTime && scheduledTime !== computedTime) {
          try {
            const scheduled = new Date(scheduledTime.replace(" ", "T"));
            const computed = new Date(computedTime.replace(" ", "T"));
            delayMinutes = Math.round((computed.getTime() - scheduled.getTime()) / 60000);
          } catch {}
        }
        
        const status = line.DepartureStatus || "";
        const isCancelled = status === "C";
        const isDelayed = delayMinutes > 5 || status === "L";
        const lineCode = line.LineCode || "";
        const lineName = line.LineName || "";
        
        return {
          tripNumber: line.TripNumber || "N/A",
          departureTime: scheduledTime,
          arrivalTime: "",
          platform: line.ScheduledPlatform || line.ActualPlatform || undefined,
          delay: delayMinutes,
          status: isCancelled ? "cancelled" : isDelayed ? "delayed" : "on_time",
          line: lineName || lineCode,
          vehicleType: getVehicleType(lineCode, lineName),
        };
      });

      const sortedDepartures = departures
        .filter((d: any) => d.departureTime)
        .sort((a: any, b: any) => {
          const timeA = new Date(a.departureTime.replace(" ", "T")).getTime();
          const timeB = new Date(b.departureTime.replace(" ", "T")).getTime();
          return timeA - timeB;
        })
        .slice(0, 10);

      res.json({
        departures: sortedDepartures,
        alerts: [],
        lastUpdated: Date.now(),
      });
    } catch (error: any) {
      console.error("Error fetching journey:", error.message);
      res.status(500).json({ error: "Failed to fetch journey data", departures: [], alerts: [] });
    }
  });

  app.get("/api/departures", async (req, res) => {
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }
    const { stop } = req.query;
    if (!stop) {
      return res.status(400).json({ error: "Stop code required" });
    }
    try {
      const endpoint = `/api/V1/Stop/NextService/${stop}`;
      const data = await fetchMetrolinx(endpoint, apiKey);

      const lines = data?.NextService?.Lines || [];
      const departures = lines.map((line: any) => {
        const scheduledTime = line.ScheduledDepartureTime || "";
        const computedTime = line.ComputedDepartureTime || "";
        
        let delayMinutes = 0;
        if (scheduledTime && computedTime && scheduledTime !== computedTime) {
          try {
            const scheduled = new Date(scheduledTime.replace(" ", "T"));
            const computed = new Date(computedTime.replace(" ", "T"));
            delayMinutes = Math.round((computed.getTime() - scheduled.getTime()) / 60000);
          } catch {}
        }
        
        const status = line.DepartureStatus || "";
        const isCancelled = status === "C";
        const isDelayed = delayMinutes > 5 || status === "L";
        const lineCode = line.LineCode || "";
        const lineName = line.LineName || "";
        
        return {
          tripNumber: line.TripNumber || "N/A",
          departureTime: scheduledTime,
          arrivalTime: "",
          platform: line.ScheduledPlatform || line.ActualPlatform || undefined,
          delay: delayMinutes,
          status: isCancelled ? "cancelled" : isDelayed ? "delayed" : "on_time",
          line: lineName || lineCode,
          vehicleType: getVehicleType(lineCode, lineName),
        };
      });

      res.json({
        departures: departures.slice(0, 10),
        lastUpdated: Date.now(),
      });
    } catch (error: any) {
      console.error("Error fetching departures:", error.message);
      res.status(500).json({ error: "Failed to fetch departures", departures: [] });
    }
  });

  app.get("/api/alerts", async (req, res) => {
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }
    try {
      const endpoint = "/api/V1/ServiceUpdate/ServiceAlert/All";
      const data = await fetchMetrolinx(endpoint, apiKey);

      const messages = data?.Messages || data?.ServiceAlerts?.Messages || [];
      const alerts = messages.map((msg: any) => ({
        id: msg.MessageId || msg.Id || String(Date.now()),
        title: msg.Subject || msg.Title || "Service Alert",
        description: msg.Body || msg.Description || "",
        severity: msg.Priority === "High" ? "severe" : msg.Priority === "Medium" ? "warning" : "info",
        affectedRoutes: msg.Routes || [],
      }));

      res.json({ alerts });
    } catch (error: any) {
      console.error("Error fetching alerts:", error.message);
      res.json({ alerts: [] });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
