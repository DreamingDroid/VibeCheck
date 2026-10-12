export interface LocalityCentroid {
  locality: string;
  lat: number;
  lng: number;
  label: string;
}

export const VIZAG_LOCALITY_CENTROIDS: LocalityCentroid[] = [
  {
    locality: "Beach Road & RK Beach",
    lat: 17.7144,
    lng: 83.3195,
    label: "RK Beach & Promenade",
  },
  {
    locality: "Siripuram & Waltair",
    lat: 17.7245,
    lng: 83.3152,
    label: "Siripuram & Waltair Uplands",
  },
  {
    locality: "MVP Colony",
    lat: 17.7441,
    lng: 83.3347,
    label: "MVP Colony & Sector Parks",
  },
  {
    locality: "Rushikonda & Sagar Nagar",
    lat: 17.7818,
    lng: 83.3853,
    label: "Rushikonda Beach & Sagar Nagar",
  },
  {
    locality: "Madhurawada & IT SEZ",
    lat: 17.8182,
    lng: 83.3524,
    label: "Madhurawada & IT SEZ",
  },
  {
    locality: "Dwaraka Nagar & Asilmetta",
    lat: 17.7295,
    lng: 83.3041,
    label: "Dwaraka Nagar & RTC Complex",
  },
  {
    locality: "Gajuwaka & Steel Plant",
    lat: 17.6904,
    lng: 83.2105,
    label: "Gajuwaka & Steel Plant Hub",
  },
];

/**
 * Great-circle distance using Haversine formula in kilometers
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface NearestLocalityResult {
  locality: string;
  distanceKm: number;
  isWithinVizag: boolean;
}

export function getNearestVizagLocality(userLat: number, userLng: number): NearestLocalityResult {
  let nearest = VIZAG_LOCALITY_CENTROIDS[0];
  let minDistance = Infinity;

  for (const item of VIZAG_LOCALITY_CENTROIDS) {
    const dist = getDistanceKm(userLat, userLng, item.lat, item.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = item;
    }
  }

  // Visakhapatnam urban boundary is within ~45km
  const isWithinVizag = minDistance <= 45;

  return {
    locality: nearest.locality,
    distanceKm: Math.round(minDistance * 10) / 10,
    isWithinVizag,
  };
}

export function requestUserCoordinates(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000, // 5 min cache
      }
    );
  });
}
