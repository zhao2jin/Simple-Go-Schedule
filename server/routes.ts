import type { Express } from "express";
import { createServer, type Server } from "node:http";

const METROLINX_BASE_URL = "https://api.openmetrolinx.com/OpenDataAPI";

async function fetchMetrolinx(endpoint: string, apiKey: string) {
  const url = `${METROLINX_BASE_URL}${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${apiKey}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Metrolinx API error: ${response.status}`);
  }
  return response.json();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const apiKey = process.env.METROLINX_API_KEY;

  app.get("/api/stations", async (req, res) => {
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }
    try {
      const data = await fetchMetrolinx("/api/V1/Stop/All", apiKey);
      const stations = (data?.Stops || []).map((stop: any) => ({
        code: stop.StopCode,
        name: stop.StopName,
        locationName: stop.LocationName,
        locationType: stop.LocationType,
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
      const dateStr = date || new Date().toISOString().split("T")[0];
      const timeStr = time || new Date().toTimeString().slice(0, 5).replace(":", "");
      const endpoint = `/api/V1/Schedule/Journey/${origin}/${destination}/${dateStr}/${timeStr}/10`;
      const data = await fetchMetrolinx(endpoint, apiKey);

      const departures = (data?.Journeys || []).map((journey: any) => {
        const firstLeg = journey.Legs?.[0];
        const lastLeg = journey.Legs?.[journey.Legs?.length - 1];
        const delay = firstLeg?.DelaySeconds || 0;
        return {
          tripNumber: firstLeg?.TripNumber || "N/A",
          departureTime: firstLeg?.DepartureTime || "",
          arrivalTime: lastLeg?.ArrivalTime || "",
          platform: firstLeg?.Platform || undefined,
          delay: Math.round(delay / 60),
          status: delay > 300 ? "delayed" : "on_time",
          line: firstLeg?.LineName || firstLeg?.LineCode,
        };
      });

      res.json({
        departures,
        alerts: [],
        lastUpdated: Date.now(),
      });
    } catch (error: any) {
      console.error("Error fetching journey:", error.message);
      res.status(500).json({ error: "Failed to fetch journey data" });
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

      const departures = (data?.NextService?.Lines || []).flatMap((line: any) =>
        (line.Trips || []).map((trip: any) => {
          const delay = trip.DelaySeconds || 0;
          return {
            tripNumber: trip.TripNumber || "N/A",
            departureTime: trip.DepartureTime || trip.ScheduledDepartureTime || "",
            arrivalTime: "",
            platform: trip.Platform || undefined,
            delay: Math.round(delay / 60),
            status: delay > 300 ? "delayed" : trip.IsCancelled ? "cancelled" : "on_time",
            line: line.LineName || line.LineCode,
          };
        })
      );

      res.json({
        departures: departures.slice(0, 10),
        lastUpdated: Date.now(),
      });
    } catch (error: any) {
      console.error("Error fetching departures:", error.message);
      res.status(500).json({ error: "Failed to fetch departures" });
    }
  });

  app.get("/api/alerts", async (req, res) => {
    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }
    try {
      const endpoint = "/api/V1/ServiceUpdate/ServiceAlert/All";
      const data = await fetchMetrolinx(endpoint, apiKey);

      const alerts = (data?.Messages || []).map((msg: any) => ({
        id: msg.MessageId || String(Date.now()),
        title: msg.Subject || "Service Alert",
        description: msg.Body || "",
        severity: msg.Priority === "High" ? "severe" : msg.Priority === "Medium" ? "warning" : "info",
        affectedRoutes: msg.Routes || [],
      }));

      res.json({ alerts });
    } catch (error: any) {
      console.error("Error fetching alerts:", error.message);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
