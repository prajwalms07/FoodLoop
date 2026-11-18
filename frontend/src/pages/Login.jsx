
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Leaf,
  Mail,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import useAuth from "../context/useAuth";
import { getAuthErrorMessage } from "../services/auth";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
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

    setError("");
    setIsSubmitting(true);
    try {
      await signIn({
        email: formData.email.trim(),
        password: formData.password,
      });
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(
        getAuthErrorMessage(requestError, "Sign in failed. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF5]">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Left visual panel */}
        <div className="relative hidden overflow-hidden bg-[#176B46] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-40 -left-32 h-[450px] w-[450px] rounded-full bg-lime-300/10" />

          <Link to="/" className="relative flex items-center gap-2">
            <Leaf size={30} />
            <span className="text-2xl font-extrabold">
              Food<span className="text-lime-300">Loop</span>
            </span>
          </Link>

          <div className="relative max-w-lg">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
              <ShieldCheck size={16} />
              Making food redistribution easier
            </div>

            <h1 className="text-5xl font-extrabold leading-tight">
              Welcome back to a world with
              <span className="text-lime-300"> less waste.</span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-green-100">
              Connect surplus food with communities that need it.
              Every meal shared is a step towards a better future.
            </p>
          </div>

          <p className="relative text-sm text-green-100">
            Good Food. Better Future.
          </p>
        </div>

        {/* Login form */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-md">

            <Link
              to="/"
              className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-green-700"
            >
              <ArrowLeft size={17} />
              Back to home
            </Link>

            <div className="mb-8 lg:hidden">
              <Link to="/" className="flex items-center gap-2 text-2xl font-extrabold">
                <Leaf className="text-green-700" />
                Food<span className="text-green-600">Loop</span>
              </Link>
            </div>

            <p className="font-semibold uppercase tracking-widest text-green-700">
              Welcome back
            </p>

            <h2 className="mt-3 text-4xl font-extrabold tracking-tight">
              Sign in to FoodLoop
            </h2>

            <p className="mt-3 text-gray-500">
              Enter your account details to continue.
            </p>

            {location.state?.success && (
              <div
                role="status"
                className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
              >
                {location.state.success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-9 space-y-6">

              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-semibold">
                  Email address
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={19} />

                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-sm font-semibold">
                    Password
                  </label>
                </div>

                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={19} />

                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-12 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
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
                {isSubmitting ? "Signing in..." : "Sign in"}{" "}
                {!isSubmitting && <ArrowRight className="ml-2 inline" size={18} />}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link to="/register" className="font-bold text-green-700 hover:text-green-900">
                Create an account
              </Link>
            </p>

            <p className="mt-12 text-center text-xs text-gray-400">
              © 2026 FoodLoop. Good Food. Better Future.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
