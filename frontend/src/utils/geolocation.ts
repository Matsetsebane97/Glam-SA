// Browser geolocation wrapper with user-friendly error messages.
export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type GeolocationResult = Coordinates & {
  locationLabel: string;
};

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
}

async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return formatCoordinates(latitude, longitude);

    const data = (await response.json()) as {
      address?: {
        suburb?: string;
        neighbourhood?: string;
        city?: string;
        town?: string;
        municipality?: string;
        state?: string;
      };
    };
    const address = data.address;
    if (!address) return formatCoordinates(latitude, longitude);

    const city = address.city || address.town || address.municipality;
    const suburb = address.suburb || address.neighbourhood;
    const parts = [address.state, city, suburb].filter(
      (part, index, values): part is string => Boolean(part) && values.indexOf(part) === index,
    );
    if (parts.length > 0) return parts.join(", ");
    return formatCoordinates(latitude, longitude);
  } catch {
    return formatCoordinates(latitude, longitude);
  }
}

export function requestUserLocation(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Your browser does not support location services."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locationLabel = await reverseGeocode(latitude, longitude);
        resolve({ latitude, longitude, locationLabel });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location access is required to join Glam SA. Please allow location in your browser settings."));
        } else if (error.code === error.TIMEOUT) {
          reject(new Error("Location request timed out. Please try again."));
        } else {
          reject(new Error("We could not detect your location. Please try again."));
        }
      },
      GEOLOCATION_OPTIONS,
    );
  });
}
