import { useMemo, useState } from "react";
import { Clock3, ExternalLink, MapPin, Navigation, Route } from "lucide-react";
import PickupMap from "./PickupMap";

function formatDistance(meters) {
  return meters < 1000
    ? `${Math.round(meters / 10) * 10} m`
    : `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  if (seconds < 1) return "Under 1 min";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `About ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes
    ? `About ${hours} hr ${remainingMinutes} min`
    : `About ${hours} hr`;
}

function getDirectionsUrl(pickup, origin) {
  const params = new URLSearchParams({
    api: "1",
    destination: `${pickup.latitude},${pickup.longitude}`,
    travelmode: "driving",
  });
  if (origin) {
    params.set("origin", `${origin.latitude},${origin.longitude}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function RoutePlanner({ food }) {
  const [origin, setOrigin] = useState(null);
  const [route, setRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const pickup = {
    latitude: Number(food.latitude),
    longitude: Number(food.longitude),
  };
  const pickupPosition = useMemo(
    () => [pickup.latitude, pickup.longitude],
    [pickup.latitude, pickup.longitude],
  );
  const originPosition = useMemo(
    () => origin ? [origin.latitude, origin.longitude] : null,
    [origin],
  );
  const hasPickupPin =
    food.latitude != null &&
    food.longitude != null &&
    Number.isFinite(pickup.latitude) &&
    Number.isFinite(pickup.longitude);

  const estimateRoute = () => {
    setError("");
    setRoute(null);
    setOrigin(null);

    if (!hasPickupPin) {
      setError("This food listing does not have a pinned pickup location yet.");
      return;
    }
    if (!navigator.geolocation) {
      setError("Location access is not available in this browser.");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const currentLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        setOrigin(currentLocation);

        try {
          const routeUrl =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${currentLocation.longitude},${currentLocation.latitude};` +
            `${pickup.longitude},${pickup.latitude}?overview=full&geometries=geojson&steps=false`;
          const response = await fetch(routeUrl);
          if (!response.ok) {
            throw new Error("The road routing service is temporarily unavailable.");
          }

          const data = await response.json();
          const bestRoute = data?.code === "Ok" ? data.routes?.[0] : null;
          if (
            !bestRoute ||
            !Number.isFinite(bestRoute.distance) ||
            !Number.isFinite(bestRoute.duration) ||
            !Array.isArray(bestRoute.geometry?.coordinates) ||
            bestRoute.geometry.coordinates.length < 2
          ) {
            throw new Error("A driving route could not be found for these locations.");
          }
          setRoute(bestRoute);
        } catch (requestError) {
          setError(
            requestError instanceof Error && requestError.message !== "Failed to fetch"
              ? requestError.message
              : "Could not estimate the road distance. Try Google Maps instead.",
          );
        } finally {
          setIsLoading(false);
        }
      },
      (locationError) => {
        setError(
          locationError.code === 1
            ? "Location permission was denied. Allow location access or open the directions in Google Maps."
            : "Could not get your current location. Try again or open the directions in Google Maps.",
        );
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  return (
    <div className="mt-4 rounded-2xl border border-green-100 bg-[#F7FAF6] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold text-[#202B24]">
            <Route size={17} className="text-green-700" />
            Route to pickup
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {food.pickup_location}
          </p>
        </div>
        <button
          type="button"
          onClick={estimateRoute}
          disabled={isLoading || !hasPickupPin}
          className="inline-flex items-center gap-2 rounded-xl bg-[#176B46] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Navigation size={15} />
          {isLoading ? "Finding route..." : "Estimate from my location"}
        </button>
      </div>

      {hasPickupPin ? (
        <div className="mt-4 overflow-hidden rounded-xl">
          <PickupMap
            center={pickupPosition}
            selected={pickupPosition}
            origin={originPosition}
            routeCoordinates={route?.geometry?.coordinates}
          />
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <MapPin size={17} className="mt-0.5 shrink-0" />
          The provider has not pinned this pickup location yet. You can still use the address above.
        </div>
      )}
      {origin && hasPickupPin && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Your location
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-700" />
            Pickup point
          </span>
        </div>
      )}

      {route && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-green-100 p-2.5 text-green-800">
              <Navigation size={19} />
            </span>
            <div>
              <p className="text-xl font-extrabold text-[#176B46]">
                {formatDistance(route.distance)}
              </p>
              <p className="flex items-center gap-1 text-xs text-gray-500">
                <Clock3 size={13} /> {formatDuration(route.duration)} driving
              </p>
            </div>
          </div>
          <a
            href={getDirectionsUrl(pickup, origin)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-50"
          >
            Open directions <ExternalLink size={14} />
          </a>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {error}
          {hasPickupPin && (
            <>
              {" "}
              <a
                href={getDirectionsUrl(pickup, origin)}
                target="_blank"
                rel="noreferrer"
                className="font-bold underline underline-offset-2"
              >
                Open Google Maps
              </a>
            </>
          )}
        </p>
      )}

      <p className="mt-3 text-[11px] leading-5 text-gray-500">
        Your location is requested only when you tap the button. Coordinates are sent to the public OSRM routing service for an approximate road distance; this estimate does not include live traffic.
      </p>
    </div>
  );
}
