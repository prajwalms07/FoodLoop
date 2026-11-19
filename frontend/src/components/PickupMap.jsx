import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });
  return null;
}

function MapCenter({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 13));
  }, [center, map]);

  return null;
}

function RouteBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [24, 24] });
    }
  }, [map, positions]);

  return null;
}

export default function PickupMap({
  center,
  selected,
  onSelect,
  origin,
  routeCoordinates,
}) {
  const routePositions = useMemo(
    () => routeCoordinates?.map(([longitude, latitude]) => [latitude, longitude]) || [],
    [routeCoordinates],
  );
  const boundsPositions = useMemo(
    () => {
      if (routePositions.length > 1) return routePositions;
      return origin && selected ? [origin, selected] : [];
    },
    [origin, routePositions, selected],
  );

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-56 w-full rounded-xl border border-green-100"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenter center={center} />
      {onSelect && <MapClickHandler onSelect={onSelect} />}
      {routePositions.length > 1 && (
        <>
          <Polyline
            positions={routePositions}
            pathOptions={{ color: "#176B46", weight: 5, opacity: 0.8 }}
          />
          <RouteBounds positions={boundsPositions} />
        </>
      )}
      {origin && (
        <CircleMarker
          center={origin}
          radius={8}
          pathOptions={{ color: "#1d4ed8", fillColor: "#60a5fa", fillOpacity: 0.9 }}
        />
      )}
      {selected && (
        <CircleMarker
          center={selected}
          radius={9}
          pathOptions={{ color: "#176B46", fillColor: "#36A66B", fillOpacity: 0.9 }}
        />
      )}
      {!routePositions.length && boundsPositions.length > 1 && (
        <RouteBounds positions={boundsPositions} />
      )}
    </MapContainer>
  );
}
