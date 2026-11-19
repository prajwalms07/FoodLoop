
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  Store,
  HeartHandshake,
  UserRound,
} from "lucide-react";
import { getAuthErrorMessage, registerUser } from "../services/auth";

const roles = [
  {
    id: "provider",
    title: "Food Provider",
    description: "Restaurants, hotels and canteens",
    icon: Store,
  },
  {
    id: "ngo",
    title: "NGO / Volunteer",
    description: "Organizations distributing food",
    icon: HeartHandshake,
  },
];

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "provider",
    capacity: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("Please enter your name or organization name.");
      return;
    }

    if (formData.password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const result = await registerUser({
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
      });

      navigate("/login", {
        replace: true,
        state: {
          success:
            result.message ||
            "Your account was created. Sign in to continue.",
        },
      });
    } catch (requestError) {
      setError(
        getAuthErrorMessage(
          requestError,
          "Account creation failed. Please try again.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF5] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-green-700"
        >
          <ArrowLeft size={17} />
          Back to home
        </Link>

        <div className="mb-8 mt-8 flex items-center gap-2">
          <Leaf className="text-green-700" size={29} />
          <span className="text-2xl font-extrabold">
            Food<span className="text-green-600">Loop</span>
          </span>
        </div>

        <div className="rounded-3xl border border-green-100 bg-white p-7 shadow-sm sm:p-10">

          <p className="text-sm font-bold uppercase tracking-widest text-green-700">
            Join our community
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Create your account
          </h1>

          <p className="mt-3 text-gray-500">
            Join FoodLoop and help make surplus food count.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-6">

            <div>
              <label htmlFor="register-name" className="mb-2 block text-sm font-semibold">
                Name or organization
              </label>

              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={19} />

                <input
                  id="register-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name or organization"
                  autoComplete="name"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-gray-200 py-4 pl-12 pr-4 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="mb-2 block text-sm font-semibold">
                Email address
              </label>

              <input
                id="register-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-4 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
              />
            </div>

            {formData.role === "ngo" && (
              <div>
                <label htmlFor="register-capacity" className="mb-2 block text-sm font-semibold">
                  Pickup capacity in kg (optional)
                </label>
                <input
                  id="register-capacity"
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="Maximum kilograms you can collect"
                  className="w-full rounded-xl border border-gray-200 px-4 py-4 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>
            )}

            <div>
              <label htmlFor="register-password" className="mb-2 block text-sm font-semibold">
                Password
              </label>

              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password (min. 8 characters)"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-gray-200 py-4 pl-4 pr-12 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-semibold">
                Confirm password
              </label>
              <input
                id="register-confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError("");
                }}
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-4 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
              />
            </div>

            <div>
              <label id="register-role-label" className="mb-3 block text-sm font-semibold">
                Choose your account type
              </label>

              <div
                role="group"
                aria-labelledby="register-role-label"
                className="grid gap-3 sm:grid-cols-2"
              >
                {roles.map((role) => {
                  const Icon = role.icon;
                  const selected = formData.role === role.id;

                  return (
                    <button
                      type="button"
                      key={role.id}
                      onClick={() => {
                        setFormData((current) => ({
                          ...current,
                          role: role.id,
                        }));
                        setError("");
                      }}
                      aria-pressed={selected}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-green-600 bg-green-50 ring-2 ring-green-100"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon
                          size={25}
                          className={selected ? "text-green-700" : "text-gray-500"}
                        />
                        <span
                          className={`h-4 w-4 rounded-full border-2 ${
                            selected
                              ? "border-green-600 bg-green-600 ring-2 ring-green-100"
                              : "border-gray-300"
                          }`}
                        />
                      </div>

                      <p className="mt-4 font-bold">{role.title}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {role.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#176B46] py-4 font-bold text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating account..." : "Create account"}{" "}
              {!isSubmitting && <ArrowRight className="ml-2 inline" size={18} />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-green-700 hover:text-green-900">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          © 2026 FoodLoop. Good Food. Better Future.
        </p>
      </div>
    </div>
  );
}
