import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

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
      console.error("[stations] METROLINX_API_KEY not configured");
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

      console.log(`[stations] Returning ${stations.length} stations`);
      res.json({ stations });
    } catch (error: any) {
      console.error("[stations] Error fetching stations:", error.message);
      res.status(500).json({ error: "Failed to fetch stations", details: error.message });
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
      const now = new Date();
      const torontoFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      const parts = torontoFormatter.formatToParts(now);
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
      const year = getPart("year");
      const month = getPart("month");
      const day = getPart("day");
      const hours = getPart("hour");
      const minutes = getPart("minute");
      const dateStr = `${year}${month}${day}`;
      const timeStr = `${hours}${minutes}`;

      // Query both endpoints in parallel for best coverage
      const journeyEndpoint = `/api/V1/Schedule/Journey/${dateStr}/${origin}/${destination}/${timeStr}/50`;
      const nextServiceEndpoint = `/api/V1/Stop/NextService/${origin}`;

      const [journeyResult, nextServiceResult] = await Promise.allSettled([
        fetchMetrolinx(journeyEndpoint, apiKey),
        fetchMetrolinx(nextServiceEndpoint, apiKey),
      ]);

      const journeyData = journeyResult.status === "fulfilled" ? journeyResult.value : null;
      const nextServiceData = nextServiceResult.status === "fulfilled" ? nextServiceResult.value : null;

      // --- 1. Parse Journey schedule data ---
      const journeys = journeyData?.SchJourneys || [];
      const tripNumbers = new Set<string>();
      const scheduleDepartures: any[] = [];

      for (const journey of journeys) {
        const services = journey?.Services || [];
        for (const service of services) {
          const trips = service?.Trips?.Trip || [];
          const tripArray = Array.isArray(trips) ? trips : [trips];

          for (const trip of tripArray) {
            if (!trip) continue;
            const tripNumber = trip.Number || "";
            if (tripNumbers.has(tripNumber)) continue;
            tripNumbers.add(tripNumber);

            const lineCode = trip.Line || "";
            const lineName = trip.Display || lineCode;
            const vehicleType = trip.Type === "T" ? "train" : trip.Type === "B" ? "bus" : getVehicleType(lineCode, lineName);

            const departureTime = service.StartTime || "";
            const arrivalTime = service.EndTime || "";

            scheduleDepartures.push({
              tripNumber,
              departureTime,
              arrivalTime,
              platform: undefined,
              delay: 0,
              status: "on_time",
              line: lineName || `Route ${lineCode}`,
              vehicleType,
              source: "schedule",
            });
          }
        }
      }

      // --- 2. Parse NextService real-time data ---
      const nextServiceLines = nextServiceData?.NextService?.Lines || [];
      const rawLines = Array.isArray(nextServiceLines) ? nextServiceLines : [];

      // Determine which lines serve the destination station
      const routeLineCode = getLineForRoute(origin as string, destination as string);

      // Build a lookup of station names for destination matching
      const STATION_NAMES: Record<string, string> = {
        "UN": "Union", "AL": "Aldershot", "BU": "Burlington", "AP": "Appleby",
        "BO": "Bronte", "OA": "Oakville", "CL": "Clarkson", "PO": "Port Credit",
        "LO": "Long Branch", "MI": "Mimico", "EX": "Exhibition", "HA": "Hamilton",
        "WR": "West Harbour", "NI": "Niagara", "OS": "Oshawa", "WH": "Whitby",
        "AJ": "Ajax", "PIN": "Pickering", "RO": "Rouge Hill", "GU": "Guildwood",
        "EG": "Eglinton", "SC": "Scarborough", "DA": "Danforth", "ML": "Milton",
        "LS": "Lisgar", "ME": "Meadowvale", "SR": "Streetsville", "ER": "Erindale",
        "CO": "Cooksville", "DI": "Dixie", "KP": "Kipling", "KI": "Kitchener",
        "GL": "Guelph", "AC": "Acton", "GE": "Georgetown", "MO": "Mount Pleasant",
        "BR": "Brampton", "BE": "Bramalea", "MA": "Malton", "ET": "Etobicoke North",
        "WE": "Weston", "BL": "Bloor", "BA": "Barrie South", "AD": "Allandale Waterfront",
        "BD": "Bradford", "EA": "East Gwillimbury", "NE": "Newmarket", "AU": "Aurora",
        "KC": "King City", "MP": "Maple", "RU": "Rutherford", "DW": "Downsview Park",
        "RI": "Richmond Hill", "BM": "Bloomington", "GO": "Gormley", "LA": "Langstaff",
        "OL": "Old Cummer", "OR": "Oriole", "LI": "Lincolnville", "ST": "Stouffville",
        "MJ": "Mount Joy", "MR": "Markham", "CE": "Centennial", "UI": "Unionville",
        "MK": "Milliken", "AG": "Agincourt", "KE": "Kennedy", "CF": "Confederation",
        "WS": "Whitchurch-Stouffville", "SCTH": "St. Catharines",
      };

      // Filter NextService lines: keep only departures heading toward the destination
      const destName = STATION_NAMES[destination as string] || (destination as string);
      const filteredRealTime = rawLines.filter((line: any) => {
        const dirName = (line.DirectionName || "").trim();
        const lineCode = (line.LineCode || "").trim();

        // Must be on a line that serves both origin and destination
        if (routeLineCode && lineCode !== routeLineCode) return false;

        // Check if the direction name mentions the destination or a station past the destination
        if (dirName.toLowerCase().includes(destName.toLowerCase())) return true;
        if (dirName.toLowerCase().includes("union") && destination === "UN") return true;

        // For trips heading toward Union, check if destination is between origin and Union
        if (destination === "UN" && dirName.toLowerCase().includes("union")) return true;

        // Check if the destination is on the route toward the terminal
        // Extract terminal station from DirectionName (format: "LE - Durham College Oshawa GO")
        const terminalPart = dirName.split(" - ").slice(1).join(" - ").trim();
        if (!terminalPart) return false;

        // Check if both the destination and the terminal are on the same line
        // and the train passes through the destination on its way
        const lineStations = LINE_DESTINATIONS[lineCode] || [];
        if (lineStations.length === 0) return false;

        const originIdx = lineStations.indexOf(origin as string);
        const destIdx = lineStations.indexOf(destination as string);
        if (originIdx === -1 || destIdx === -1) return false;

        // Find which direction the train is going based on terminal
        // The terminal station name should match one end of the line
        const terminalLower = terminalPart.toLowerCase();
        let terminalIdx = -1;
        for (let i = 0; i < lineStations.length; i++) {
          const stationName = STATION_NAMES[lineStations[i]] || lineStations[i];
          if (terminalLower.includes(stationName.toLowerCase())) {
            terminalIdx = i;
          }
        }

        if (terminalIdx === -1) return false;

        // Train goes from origin toward terminal
        // Destination must be between origin and terminal (inclusive)
        if (originIdx < destIdx && destIdx <= terminalIdx) return true;
        if (originIdx > destIdx && destIdx >= terminalIdx) return true;

        return false;
      });

      // Build real-time map keyed by trip number
      const realTimeMap = new Map<string, any>();
      for (const line of filteredRealTime) {
        realTimeMap.set(line.TripNumber, line);
      }

      // --- 3. Merge: Enrich schedule departures with real-time data ---
      const mergedDepartures = scheduleDepartures.map((dep) => {
        const realTime = realTimeMap.get(dep.tripNumber);
        if (realTime) {
          realTimeMap.delete(dep.tripNumber); // consumed
          return enrichWithRealTime(dep, realTime);
        }
        return dep;
      });

      // --- 4. Add NextService-only departures not in schedule ---
      for (const [tripNum, line] of realTimeMap.entries()) {
        const lineCode = (line.LineCode || "").trim();
        const lineName = line.LineName || lineCode;
        const vehicleType = line.ServiceType === "T" ? "train" : line.ServiceType === "B" ? "bus" : getVehicleType(lineCode, lineName);

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
        const platform = line.ScheduledPlatform || line.ActualPlatform || undefined;

        mergedDepartures.push({
          tripNumber: tripNum,
          departureTime: scheduledTime,
          arrivalTime: "",
          platform: platform || undefined,
          delay: delayMinutes,
          status: isCancelled ? "cancelled" : isDelayed ? "delayed" : "on_time",
          line: `${lineName}` || `Route ${lineCode}`,
          vehicleType,
          source: "realtime",
        });
      }

      // Sort all departures by time
      const sortedDepartures = mergedDepartures
        .filter((d: any) => d.departureTime)
        .sort((a: any, b: any) => {
          const timeA = new Date(a.departureTime.replace(" ", "T")).getTime();
          const timeB = new Date(b.departureTime.replace(" ", "T")).getTime();
          return timeA - timeB;
        });

      // Fetch service alerts and filter by route
      let relevantAlerts: any[] = [];
      try {
        const alertsEndpoint = "/api/V1/ServiceUpdate/ServiceAlert/All";
        const alertsData = await fetchMetrolinx(alertsEndpoint, apiKey);
        const rawMessages = alertsData?.Messages || alertsData?.ServiceAlerts?.Messages || [];
        const messages = Array.isArray(rawMessages) ? rawMessages : [];

        const allAlerts = messages.map((msg: any) => {
          const affectedLines = msg.AssociatedLines?.map((line: any) => line.LineCode || line.Code || line) ||
                               msg.Lines?.map((line: any) => line.LineCode || line.Code || line) ||
                               msg.Routes ||
                               [];

          let severity: 'info' | 'warning' | 'severe' = 'info';
          if (msg.Category?.toLowerCase().includes('disruption') ||
              msg.SubCategory?.toLowerCase().includes('suspension') ||
              msg.Priority === 'High') {
            severity = 'severe';
          } else if (msg.Priority === 'Medium' ||
                     msg.SubCategory?.toLowerCase().includes('delay')) {
            severity = 'warning';
          }

          return {
            id: msg.Code || msg.MessageId || msg.Id || String(Date.now()),
            title: msg.SubjectEnglish || msg.Subject || msg.Title || "Service Alert",
            description: msg.BodyEnglish || msg.Body || msg.Description || "",
            severity,
            affectedRoutes: affectedLines,
          };
        });

        const lineCode = getLineForRoute(origin as string, destination as string);
        relevantAlerts = allAlerts.filter((alert: any) => {
          if (!alert.affectedRoutes || alert.affectedRoutes.length === 0) {
            return true;
          }
          return alert.affectedRoutes.includes(lineCode) ||
                 alert.affectedRoutes.includes(origin) ||
                 alert.affectedRoutes.includes(destination);
        });
      } catch (alertError) {
        console.error("Error fetching route alerts:", alertError);
      }

      res.json({
        departures: sortedDepartures,
        alerts: relevantAlerts,
        lastUpdated: Date.now(),
      });
    } catch (error: any) {
      console.error("Error fetching journey:", error.message);
      res.status(500).json({ error: "Failed to fetch journey data", departures: [], alerts: [] });
    }
  });

  function enrichWithRealTime(dep: any, realTime: any): any {
    const scheduledTime = realTime.ScheduledDepartureTime || "";
    const computedTime = realTime.ComputedDepartureTime || "";
    let delayMinutes = 0;
    if (scheduledTime && computedTime && scheduledTime !== computedTime) {
      try {
        const scheduled = new Date(scheduledTime.replace(" ", "T"));
        const computed = new Date(computedTime.replace(" ", "T"));
        delayMinutes = Math.round((computed.getTime() - scheduled.getTime()) / 60000);
      } catch {}
    }
    const status = realTime.DepartureStatus || "";
    const isCancelled = status === "C";
    const isDelayed = delayMinutes > 5 || status === "L";

    return {
      ...dep,
      departureTime: scheduledTime || dep.departureTime,
      platform: realTime.ScheduledPlatform || realTime.ActualPlatform || dep.platform || undefined,
      delay: delayMinutes,
      status: isCancelled ? "cancelled" : isDelayed ? "delayed" : dep.status,
    };
  }

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

      const rawMessages = data?.Messages || data?.ServiceAlerts?.Messages || [];
      const messages = Array.isArray(rawMessages) ? rawMessages : [];
      const alerts = messages.map((msg: any) => {
        // Extract affected line codes from AssociatedLines or Lines array
        const affectedLines = msg.AssociatedLines?.map((line: any) => line.LineCode || line.Code || line) ||
                             msg.Lines?.map((line: any) => line.LineCode || line.Code || line) ||
                             msg.Routes ||
                             [];

        // Determine severity based on Category, SubCategory, or Priority
        let severity: 'info' | 'warning' | 'severe' = 'info';
        if (msg.Category?.toLowerCase().includes('disruption') ||
            msg.SubCategory?.toLowerCase().includes('suspension') ||
            msg.Priority === 'High') {
          severity = 'severe';
        } else if (msg.Priority === 'Medium' ||
                   msg.SubCategory?.toLowerCase().includes('delay')) {
          severity = 'warning';
        }

        return {
          id: msg.Code || msg.MessageId || msg.Id || String(Date.now()),
          title: msg.SubjectEnglish || msg.Subject || msg.Title || "Service Alert",
          description: msg.BodyEnglish || msg.Body || msg.Description || "",
          severity,
          affectedRoutes: affectedLines,
        };
      });

      res.json({ alerts });
    } catch (error: any) {
      console.error("Error fetching alerts:", error.message);
      res.json({ alerts: [] });
    }
  });

  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error("Error getting Stripe publishable key:", error.message);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  app.get("/api/donation/prices", async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.search({
        query: "metadata['app']:'go-tracker' AND metadata['type']:'donation'"
      });

      if (products.data.length === 0) {
        return res.json({ prices: [] });
      }

      const productId = products.data[0].id;
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
      });

      const sortedPrices = prices.data
        .sort((a, b) => (a.unit_amount || 0) - (b.unit_amount || 0))
        .map(price => ({
          id: price.id,
          amount: price.unit_amount || 0,
          currency: price.currency,
          tier: price.metadata?.tier || 'donation'
        }));

      res.json({ prices: sortedPrices });
    } catch (error: any) {
      console.error("Error fetching donation prices:", error.message);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  });

  app.post("/api/donation/checkout", async (req, res) => {
    try {
      const { priceId, customAmount } = req.body;
      
      if (!priceId && !customAmount) {
        return res.status(400).json({ error: "Price ID or custom amount required" });
      }

      const stripe = await getUncachableStripeClient();
      
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      const baseUrl = `${protocol}://${domain}`;

      let lineItems;
      
      if (customAmount && typeof customAmount === 'number' && customAmount >= 100) {
        lineItems = [{
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Support Simple Go Schedule',
              description: 'Custom donation - Thank you for your support!',
            },
            unit_amount: customAmount,
          },
          quantity: 1,
        }];
      } else if (priceId) {
        lineItems = [{ price: priceId, quantity: 1 }];
      } else {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/donation/success`,
        cancel_url: `${baseUrl}/donation/cancel`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
