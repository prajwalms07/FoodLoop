import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Leaf,
  MapPin,
  Navigation,
  Package,
  Plus,
  RefreshCw,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { getAuthErrorMessage } from "../services/auth";
import useAuth from "../context/useAuth";

const PickupMap = lazy(() => import("../components/PickupMap"));
const RoutePlanner = lazy(() => import("../components/RoutePlanner"));

const nextStatus = {
  reserved: { value: "picked_up", label: "Confirm pickup" },
  picked_up: { value: "delivered", label: "Confirm delivery" },
};

function getDefaultExpiry() {
  const date = new Date(Date.now() + 6 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getMapUrl(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

function getFoodImageUrl(imageUrl) {
  if (!imageUrl) return null;
  const apiBase = new URL(API.defaults.baseURL || "/api", window.location.origin);
  return new URL(imageUrl, apiBase).toString();
}

function StatusBadge({ status }) {
  const styles = {
    available: "bg-green-100 text-green-800",
    reserved: "bg-amber-100 text-amber-800",
    picked_up: "bg-blue-100 text-blue-800",
    delivered: "bg-emerald-100 text-emerald-800",
    completed: "bg-emerald-100 text-emerald-800",
    expired: "bg-gray-100 text-gray-600",
    cancelled: "bg-gray-100 text-gray-600",
  };
  const label = status.replace("_", " ");

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${styles[status] || styles.expired}`}>
      {label}
    </span>
  );
}

function DeliveryCard({ reservation, onUpdate, busy, showRoute }) {
  const action = nextStatus[reservation.status];
  const [routeOpen, setRouteOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm transition duration-200 hover:border-green-200 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{reservation.food_name}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {reservation.quantity} kg · {reservation.provider_name}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-600">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 shrink-0 text-green-700" size={16} />
          {reservation.pickup_location}
        </p>
        {showRoute ? (
          <button
            type="button"
            aria-expanded={routeOpen}
            onClick={() => setRouteOpen((open) => !open)}
            className="inline-flex items-center gap-2 font-semibold text-green-800 underline underline-offset-2"
          >
            <Navigation size={14} />
            {routeOpen ? "Close route" : "Map & distance"}
          </button>
        ) : getMapUrl(reservation.latitude, reservation.longitude) && (
          <a
            href={getMapUrl(reservation.latitude, reservation.longitude)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex font-semibold text-green-800 underline underline-offset-2"
          >
            Open pickup map
          </a>
        )}
        {showRoute && routeOpen && (
          <Suspense
            fallback={
              <div className="flex h-24 items-center justify-center rounded-xl bg-green-50 text-sm text-green-800">
                Loading pickup map...
              </div>
            }
          >
            <RoutePlanner food={reservation} />
          </Suspense>
        )}
        <p className="flex items-center gap-2">
          <Clock3 className="shrink-0 text-green-700" size={16} />
          Reserved {formatDate(reservation.reserved_at)}
        </p>
        {reservation.picked_up_at && (
          <p className="flex items-center gap-2">
            <Package className="shrink-0 text-blue-700" size={16} />
            Picked up {formatDate(reservation.picked_up_at)}
          </p>
        )}
        {reservation.delivered_at && (
          <p className="flex items-center gap-2">
            <CheckCircle2 className="shrink-0 text-green-700" size={16} />
            Delivered {formatDate(reservation.delivered_at)}
          </p>
        )}
      </div>

      {action && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onUpdate(reservation, action.value)}
          className="mt-5 w-full rounded-xl bg-[#176B46] px-4 py-3 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Updating..." : action.label}
        </button>
      )}
    </article>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isProvider = user.role === "provider";
  const [foods, setFoods] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyReservation, setBusyReservation] = useState(null);
  const [busyFood, setBusyFood] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const imageInput = useRef(null);
  const [routeFoodId, setRouteFoodId] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [locationError, setLocationError] = useState("");
  const [quantities, setQuantities] = useState({});
  const [form, setForm] = useState({
    food_name: "",
    category: "cooked",
    quantity: "10",
    expiry_time: getDefaultExpiry(),
    pickup_location: "",
    latitude: null,
    longitude: null,
  });
  const defaultMapCenter = useMemo(
    () => [
      user.latitude == null ? 12.2958 : Number(user.latitude),
      user.longitude == null ? 76.6394 : Number(user.longitude),
    ],
    [user.latitude, user.longitude],
  );
  const selectedPickup = useMemo(
    () => form.latitude != null && form.longitude != null
      ? [Number(form.latitude), Number(form.longitude)]
      : null,
    [form.latitude, form.longitude],
  );
  const mapCenter = selectedPickup || defaultMapCenter;

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [foodResponse, reservationResponse] = await Promise.all([
        API.get("/foods"),
        API.get("/reservations"),
      ]);
      setFoods(foodResponse.data.foods);
      setReservations(reservationResponse.data.reservations);
    } catch (requestError) {
      setError(
        getAuthErrorMessage(requestError, "Could not load your FoodLoop data."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadData);
  }, [loadData]);

  const createFood = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        expiry_time: new Date(form.expiry_time).toISOString(),
      };
      const requestBody = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          requestBody.append(key, value);
        }
      });
      if (imageFile) requestBody.append("image", imageFile);
      await API.post("/foods", requestBody, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm({
        food_name: "",
        category: "cooked",
        quantity: "10",
        expiry_time: getDefaultExpiry(),
        pickup_location: "",
        latitude: null,
        longitude: null,
      });
      setImageFile(null);
      if (imageInput.current) imageInput.current.value = "";
      setNotice("Your food listing is now available to local volunteers.");
      await loadData();
    } catch (requestError) {
      setError(
        getAuthErrorMessage(requestError, "Could not create the food listing."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setImageFile(null);
      return;
    }

    const supportedType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    const supportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!supportedType || !supportedExtension) {
      setImageFile(null);
      event.target.value = "";
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageFile(null);
      event.target.value = "";
      setError("Food images must be 5 MB or smaller.");
      return;
    }

    setError("");
    setImageFile(file);
  };

  const reserveFood = async (food) => {
    const quantity = Number(quantities[food.id] || 1);
    setBusyFood(food.id);
    setError("");
    setNotice("");

    try {
      await API.post(`/foods/${food.id}/reservations`, { quantity });
      setNotice(`${food.food_name} reserved. Confirm pickup when you collect it.`);
      await loadData();
    } catch (requestError) {
      setError(
        getAuthErrorMessage(requestError, "Could not reserve this food."),
      );
    } finally {
      setBusyFood(null);
    }
  };

  const updateReservation = async (reservation, status) => {
    setBusyReservation(reservation.id);
    setError("");
    setNotice("");
    try {
      await API.patch(`/reservations/${reservation.id}`, { status });
      setNotice(
        status === "picked_up"
          ? "Pickup confirmed. Mark it delivered when the food reaches people."
          : `${reservation.quantity} kg delivered. Any remaining stock stays available to other volunteers.`,
      );
      await loadData();
    } catch (requestError) {
      setError(
        getAuthErrorMessage(requestError, "Could not update delivery status."),
      );
    } finally {
      setBusyReservation(null);
    }
  };

  const activeReservations = reservations.filter(
    (reservation) => reservation.status === "reserved" || reservation.status === "picked_up",
  ).length;
  const deliveredReservations = reservations.filter(
    (reservation) => reservation.status === "delivered",
  ).length;
  const deliveredKg = reservations.reduce(
    (total, reservation) => total + (
      reservation.status === "delivered" ? Number(reservation.quantity || 0) : 0
    ),
    0,
  );
  const availableKg = foods.reduce(
    (total, food) => total + Number(food.available_quantity || 0),
    0,
  );

  const useCurrentLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location access is not available in this browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({
          ...current,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));
        setLocationError("");
        setIsLocating(false);
      },
      (locationRequestError) => {
        setLocationError(
          locationRequestError.code === locationRequestError.PERMISSION_DENIED
            ? "Location permission was denied. You can still choose a point on the map."
            : "Could not get your location. Choose a point on the map instead.",
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const selectMapLocation = ({ latitude, longitude }) => {
    setForm((current) => ({ ...current, latitude, longitude }));
    setLocationError("");
  };

  return (
    <div className="min-h-screen bg-[#F4F8F3] text-[#202B24]">
      <header className="sticky top-0 z-30 border-b border-green-100/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2" aria-label="FoodLoop home">
            <span className="rounded-xl bg-[#176B46] p-2 text-white shadow-sm shadow-green-900/15"><Leaf size={21} /></span>
            <span className="text-xl font-extrabold">Food<span className="text-[#36A66B]">Loop</span></span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-green-50 hover:text-green-800">
            <ArrowLeft size={16} /> Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#124D35] via-[#176B46] to-[#238153] px-6 py-8 text-white shadow-xl shadow-green-950/10 sm:px-10 sm:py-10">
          <div aria-hidden="true" className="absolute right-0 top-0 z-0 h-80 w-80 translate-x-1/3 -translate-y-1/3 rounded-full border-[36px] border-white/[0.07]" />
          <div aria-hidden="true" className="absolute bottom-0 right-28 z-0 h-64 w-64 translate-y-1/3 rounded-full bg-lime-200/[0.08] blur-2xl" />
          <div className="relative z-10 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-green-50">
                <Leaf size={14} /> {isProvider ? "Provider workspace" : "Volunteer workspace"}
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Welcome, {user.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-green-50/90 sm:text-base">
                {isProvider
                  ? "Share surplus food with your community and follow every pickup to delivery."
                  : "Find good food nearby, pick up what you can, and help it reach the people who need it."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  loadData();
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <RefreshCw size={16} /> Refresh activity
              </button>
            </div>
            <div className="hidden min-w-56 items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm md:flex">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lime-200/20 text-lime-100">
                <Leaf size={30} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-100">Your food impact</p>
                <p className="mt-1 text-2xl font-extrabold">{deliveredKg} kg</p>
                <p className="text-xs text-green-100">delivered to the community</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="FoodLoop summary" className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="group rounded-2xl border border-green-100 bg-white p-5 shadow-[0_8px_24px_rgba(23,107,70,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(23,107,70,0.1)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{isProvider ? "Your listings" : "Listings open for booking"}</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#176B46]">{foods.length}</p>
                <p className="mt-1 text-xs text-gray-500">{availableKg} kg still available</p>
              </div>
              <span className="rounded-xl bg-green-50 p-3 text-green-700 transition group-hover:bg-green-100">
                <Package size={20} />
              </span>
            </div>
          </div>
          <div className="group rounded-2xl border border-amber-100 bg-white p-5 shadow-[0_8px_24px_rgba(23,107,70,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(23,107,70,0.1)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active deliveries</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#176B46]">{activeReservations}</p>
                <p className="mt-1 text-xs text-gray-500">Reservations on the move</p>
              </div>
              <span className="rounded-xl bg-amber-50 p-3 text-amber-700">
                <Truck size={20} />
              </span>
            </div>
          </div>
          <div className="group rounded-2xl border border-emerald-100 bg-white p-5 shadow-[0_8px_24px_rgba(23,107,70,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(23,107,70,0.1)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Deliveries completed</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#176B46]">{deliveredReservations}</p>
                <p className="mt-1 text-xs text-gray-500">Food handoffs completed</p>
              </div>
              <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <CheckCircle2 size={20} />
              </span>
            </div>
          </div>
        </section>

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {notice}
          </div>
        )}

        {isProvider ? (
          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-[0_12px_36px_rgba(23,107,70,0.07)] sm:p-8">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-green-100 p-2.5 text-green-800"><Plus size={20} /></span>
                <div>
                  <h2 className="text-xl font-bold">List surplus food</h2>
                  <p className="mt-1 text-sm text-gray-500">Volunteers can reserve it for pickup.</p>
                </div>
              </div>
              <form onSubmit={createFood} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="food-name" className="mb-1.5 block text-sm font-semibold">Food name</label>
                  <input id="food-name" required maxLength={150} value={form.food_name} onChange={(event) => setForm({ ...form, food_name: event.target.value })} placeholder="e.g. Vegetable rice" className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100" />
                </div>
                <div>
                  <label htmlFor="food-image" className="mb-1.5 block text-sm font-semibold">Add food image <span className="font-normal text-gray-500">(optional)</span></label>
                  <input
                    ref={imageInput}
                    id="food-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-2 file:font-semibold file:text-green-800 hover:file:bg-green-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP · up to 5 MB{imageFile ? ` · ${imageFile.name}` : ""}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="food-category" className="mb-1.5 block text-sm font-semibold">Category</label>
                    <select id="food-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100">
                      <option value="cooked">Cooked meal</option>
                      <option value="produce">Fresh produce</option>
                      <option value="bakery">Bakery</option>
                      <option value="packaged">Packaged food</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="food-quantity" className="mb-1.5 block text-sm font-semibold">Quantity (kg)</label>
                    <input id="food-quantity" type="number" min="1" step="1" required value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100" />
                  </div>
                </div>
                <div>
                  <label htmlFor="pickup-location" className="mb-1.5 block text-sm font-semibold">Pickup address or landmark</label>
                  <input id="pickup-location" required maxLength={255} value={form.pickup_location} onChange={(event) => setForm({ ...form, pickup_location: event.target.value })} placeholder="Business name, street, or landmark" className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100" />
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Pin pickup point</p>
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      disabled={isLocating}
                      className="rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-green-800 hover:bg-green-50 disabled:opacity-60"
                    >
                      {isLocating ? "Finding location..." : "Use my current location"}
                    </button>
                  </div>
                  <Suspense
                    fallback={
                      <div className="flex h-56 items-center justify-center rounded-xl border border-green-100 bg-green-50 text-sm text-green-800">
                        Loading map...
                      </div>
                    }
                  >
                    <PickupMap
                      center={mapCenter}
                      selected={selectedPickup}
                      onSelect={selectMapLocation}
                    />
                  </Suspense>
                  <p className="mt-2 text-xs text-gray-500">
                    Click the map to choose an exact pickup point. Volunteers see the address above and can open the pinned map.
                    Your live location is only requested when you choose the button above.
                    Map tiles © OpenStreetMap contributors.
                  </p>
                  {selectedPickup && (
                    <p className="mt-1 text-xs font-medium text-green-800">
                      Pinned: {selectedPickup[0].toFixed(5)}, {selectedPickup[1].toFixed(5)}
                    </p>
                  )}
                  {locationError && (
                    <p role="alert" className="mt-2 text-sm text-red-700">{locationError}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="food-expiry" className="mb-1.5 block text-sm font-semibold">Available until</label>
                  <input id="food-expiry" type="datetime-local" required value={form.expiry_time} onChange={(event) => setForm({ ...form, expiry_time: event.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[#176B46] px-5 py-3.5 font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting ? "Publishing..." : "Publish food listing"}
                </button>
              </form>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold">Your food listings</h2>
                  <p className="mt-1 text-sm text-gray-500">Track remaining kilograms, pickup points, and reservations.</p>
                </div>
              </div>
              {isLoading ? (
                <p className="rounded-2xl border border-green-100 bg-white p-6 text-gray-600">Loading your listings...</p>
              ) : foods.length ? (
                <div className="space-y-3">
                  {foods.map((food) => (
                    <article key={food.id} className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md">
                      {food.image_url && (
                        <img
                          src={getFoodImageUrl(food.image_url)}
                          alt={food.food_name}
                          loading="lazy"
                          className="mb-4 h-44 w-full rounded-xl object-cover"
                        />
                      )}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold">{food.food_name}</h3>
                          <p className="mt-1 text-sm capitalize text-gray-500">{food.category} · {food.available_quantity} kg remaining of {food.quantity} kg</p>
                        </div>
                        <StatusBadge status={food.status} />
                      </div>
                      <p className="mt-3 flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="mt-0.5 shrink-0 text-green-700" size={16} />{food.pickup_location}
                      </p>
                      {getMapUrl(food.latitude, food.longitude) && (
                        <a
                          href={getMapUrl(food.latitude, food.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-sm font-semibold text-green-800 underline underline-offset-2"
                        >
                          Open pickup map
                        </a>
                      )}
                      <p className="mt-2 text-sm text-gray-500">Available until {formatDate(food.expiry_time)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-green-200 bg-white p-8 text-center text-gray-500">
                  No listings yet. Add your first surplus food above.
                </p>
              )}
            </section>
          </div>
        ) : (
          <section className="mt-10">
            <div className="mb-5">
              <h2 className="text-2xl font-extrabold">Food available nearby</h2>
              <p className="mt-1 text-sm text-gray-500">Reserve the kilograms you can collect. A listing stays open while stock remains.</p>
            </div>
            {isLoading ? (
              <p className="rounded-2xl border border-green-100 bg-white p-6 text-gray-600">Loading available food...</p>
            ) : foods.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {foods.map((food) => (
                  <article key={food.id} className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md">
                    {food.image_url && (
                      <img
                        src={getFoodImageUrl(food.image_url)}
                        alt={food.food_name}
                        loading="lazy"
                        className="mb-4 aspect-[16/10] w-full rounded-xl object-cover"
                      />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{food.food_name}</h3>
                        <p className="mt-1 text-sm capitalize text-gray-500">{food.category} · {food.available_quantity} kg available</p>
                      </div>
                      <span className="rounded-xl bg-green-100 p-2 text-green-800"><Package size={20} /></span>
                    </div>
                    <p className="mt-4 flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="mt-0.5 shrink-0 text-green-700" size={16} />{food.pickup_location}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">Pickup before {formatDate(food.expiry_time)}</p>
                    <button
                      type="button"
                      aria-expanded={routeFoodId === food.id}
                      aria-controls={`route-${food.id}`}
                      onClick={() => setRouteFoodId(
                        (currentId) => currentId === food.id ? null : food.id,
                      )}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-100"
                    >
                      <Navigation size={15} />
                      {routeFoodId === food.id ? "Close route" : "Map & distance"}
                    </button>
                    {routeFoodId === food.id && (
                      <div id={`route-${food.id}`}>
                        <Suspense
                          fallback={
                            <div className="mt-4 flex h-24 items-center justify-center rounded-xl bg-green-50 text-sm text-green-800">
                              Loading pickup map...
                            </div>
                          }
                        >
                          <RoutePlanner food={food} />
                        </Suspense>
                      </div>
                    )}
                    <div className="mt-5 flex gap-2">
                      <label className="sr-only" htmlFor={`quantity-${food.id}`}>Kilograms to reserve</label>
                      <input id={`quantity-${food.id}`} type="number" min="1" max={food.available_quantity} step="1" value={quantities[food.id] || 1} onChange={(event) => setQuantities({ ...quantities, [food.id]: event.target.value })} className="w-24 rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100" />
                      <button type="button" disabled={busyFood === food.id} onClick={() => reserveFood(food)} className="flex-1 rounded-xl bg-[#176B46] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60">
                        {busyFood === food.id ? "Reserving..." : "Reserve food"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-green-200 bg-white p-8 text-center text-gray-500">
                No food is available right now. Check back soon.
              </p>
            )}
          </section>
        )}

        <section className="mt-12">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-xl bg-green-100 p-2.5 text-green-800"><Truck size={20} /></span>
            <div>
              <h2 className="text-2xl font-extrabold">Delivery tracking</h2>
              <p className="mt-1 text-sm text-gray-500">
                {isProvider ? "Follow volunteer pickups and completed deliveries." : "Update each reservation as food moves to the community."}
              </p>
            </div>
          </div>
          {isLoading ? (
            <p className="rounded-2xl border border-green-100 bg-white p-6 text-gray-600">Loading delivery activity...</p>
          ) : reservations.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {reservations.map((reservation) => (
                <DeliveryCard
                  key={reservation.id}
                  reservation={reservation}
                  onUpdate={updateReservation}
                  busy={busyReservation === reservation.id}
                  showRoute={
                    !isProvider &&
                    ["reserved", "picked_up"].includes(reservation.status)
                  }
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-green-200 bg-white p-8 text-center text-gray-500">
              Reservations and delivery updates will appear here.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
