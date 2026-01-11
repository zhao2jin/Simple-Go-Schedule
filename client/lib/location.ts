import type { Station } from "@shared/types";

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function findNearestStation(
  userLat: number,
  userLon: number,
  stations: Station[]
): Station | undefined {
  if (stations.length === 0) return undefined;

  let nearestStation: Station | undefined;
  let minDistance = Infinity;

  for (const station of stations) {
    if (station.latitude && station.longitude) {
      const distance = haversineDistance(
        userLat,
        userLon,
        station.latitude,
        station.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    }
  }

  return nearestStation;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}
