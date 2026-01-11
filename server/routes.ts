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
    const { origin, destination, date, time } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ error: "Origin and destination required" });
    }
    try {
      const now = new Date();
      const dateStr = (date as string) || now.toISOString().split("T")[0];
      const hours = now.getHours().toString().padStart(2, "0");
      const mins = now.getMinutes().toString().padStart(2, "0");
      const timeStr = (time as string) || `${hours}${mins}`;
      
      const endpoint = `/api/V1/Schedule/Journey/${origin}/${destination}/${dateStr}/${timeStr}/10`;
      const data = await fetchMetrolinx(endpoint, apiKey);

      const journeys = data?.Journeys || data?.Journey?.Journeys || [];
      const departures = journeys.map((journey: any) => {
        const trips = journey.Trips || journey.JourneyTrips || [journey];
        const firstTrip = trips[0] || journey;
        const lastTrip = trips[trips.length - 1] || journey;
        
        const delay = firstTrip?.DelaySeconds || firstTrip?.Delay || 0;
        const delayMinutes = Math.round(delay / 60);
        
        return {
          tripNumber: firstTrip?.TripNumber || firstTrip?.Trip || "N/A",
          departureTime: firstTrip?.DepartureTime || firstTrip?.ScheduledDepartureTime || journey?.DepartureTime || "",
          arrivalTime: lastTrip?.ArrivalTime || lastTrip?.ScheduledArrivalTime || journey?.ArrivalTime || "",
          platform: firstTrip?.Platform || undefined,
          delay: delayMinutes,
          status: delayMinutes > 5 ? "delayed" : "on_time",
          line: firstTrip?.LineName || firstTrip?.LineCode || firstTrip?.Line || journey?.Line,
        };
      });

      res.json({
        departures,
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

      const lines = data?.NextService?.Lines || data?.Lines || [];
      const departures = lines.flatMap((line: any) =>
        (line.Trips || []).map((trip: any) => {
          const delay = trip.DelaySeconds || trip.Delay || 0;
          const delayMinutes = Math.round(delay / 60);
          return {
            tripNumber: trip.TripNumber || trip.Trip || "N/A",
            departureTime: trip.DepartureTime || trip.ScheduledDepartureTime || "",
            arrivalTime: "",
            platform: trip.Platform || undefined,
            delay: delayMinutes,
            status: delayMinutes > 5 ? "delayed" : trip.IsCancelled ? "cancelled" : "on_time",
            line: line.LineName || line.LineCode || line.Line,
          };
        })
      );

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
