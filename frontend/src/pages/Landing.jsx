
import {
  ArrowRight,
  Heart,
  Leaf,
  MapPin,
  Menu,
  Package,
  ShieldCheck,
  Truck,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";

const features = [
  {
    icon: Package,
    title: "List Surplus Food",
    description:
      "Restaurants and food providers can quickly list surplus meals before they go to waste.",
  },
  {
    icon: MapPin,
    title: "Connect with NGOs",
    description:
      "Find nearby NGOs and volunteers who can collect and distribute available food.",
  },
  {
    icon: Truck,
    title: "Track Every Pickup",
    description:
      "Follow reservations and pickups with a transparent, easy-to-use workflow.",
  },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout, sessionError } = useAuth();
  const roleLabel = {
    provider: "Food provider",
    ngo: "NGO / volunteer",
    admin: "Administrator",
  }[user?.role] || "Member";

  return (
    <div className="min-h-screen bg-[#F8FAF5] text-[#202B24]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-green-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2">
            <div className="rounded-xl bg-[#176B46] p-2 text-white">
              <Leaf size={23} />
            </div>
            <span className="text-2xl font-extrabold tracking-tight">
              Food<span className="text-[#36A66B]">Loop</span>
            </span>
          </a>

          <div className="hidden items-center gap-9 text-sm font-medium text-gray-600 md:flex">
            <a href="#home" className="hover:text-green-700">Home</a>
            <a href="#how-it-works" className="hover:text-green-700">How it works</a>
            <a href="#features" className="hover:text-green-700">Features</a>
            <a href="#impact" className="hover:text-green-700">Our impact</a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <span className="text-sm text-gray-600">
                  {user.name} · {roleLabel}
                </span>
                <Link
                  to="/dashboard"
                  className="rounded-lg bg-[#176B46] px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-green-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-green-50"
                >
                  Log in
                </Link>
                <Link
                  to={user ? "/dashboard" : "/register"}
                  className="rounded-lg bg-[#176B46] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
                >
                  Get started <ArrowRight className="ml-1 inline" size={16} />
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-green-100 bg-white px-6 py-5 md:hidden">
            <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#impact" onClick={() => setMenuOpen(false)}>Our impact</a>
            {user ? (
              <>
                <p className="text-sm text-gray-600">
                  {user.name} · {roleLabel}
                </p>
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-[#176B46] px-5 py-3 text-center font-semibold text-white"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="rounded-lg px-5 py-3 text-center font-semibold hover:bg-green-50"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-5 py-3 text-center font-semibold hover:bg-green-50"
                >
                  Log in
                </Link>
                <Link
                  to={user ? "/dashboard" : "/register"}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-[#176B46] px-5 py-3 text-center font-semibold text-white"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
      {sessionError && (
        <div
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-center text-sm text-amber-900"
        >
          Your saved session could not be verified: {sessionError}
        </div>
      )}

      {/* Hero */}
      <section id="home" className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
            <Leaf size={16} />
            Reducing food waste. Feeding communities.
          </div>

          <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.12] tracking-tight sm:text-6xl">
            Good food deserves
            <span className="block text-[#36A66B]">a second chance.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-gray-600">
            Every day, perfectly good food goes to waste while communities
            need it. FoodLoop connects food providers with NGOs and volunteers
            to make surplus food count.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              to="/register"
              className="rounded-xl bg-[#176B46] px-7 py-4 font-semibold text-white shadow-lg shadow-green-900/15 transition hover:-translate-y-1 hover:bg-green-800"
            >
              {user ? "Open your dashboard" : "Start making an impact"} <ArrowRight className="ml-2 inline" size={18} />
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl border border-gray-300 bg-white px-7 py-4 font-semibold transition hover:border-green-600 hover:text-green-700"
            >
              Discover how it works
            </a>
          </div>

          <div className="mt-10 flex items-center gap-3 text-sm text-gray-500">
            <div className="flex -space-x-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-green-200"><Users size={17} /></div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-lime-200"><Heart size={17} /></div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-orange-200"><Utensils size={17} /></div>
            </div>
            <span>Connecting providers, NGOs and communities</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-5 rounded-[2rem] bg-green-100/70 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-green-900/15">
            <img
              src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85"
              alt="Fresh, nutritious food ready to be shared"
              className="h-[440px] w-full object-cover sm:h-[540px]"
            />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/50 bg-white/95 p-5 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">The FoodLoop mission</p>
                  <p className="mt-1 text-xl font-bold">Food shared. Lives changed.</p>
                </div>
                <div className="rounded-xl bg-green-100 p-3 text-green-800">
                  <Heart size={26} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact strip - illustrative until connected to backend */}
      <section id="impact" className="border-y border-green-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 text-center sm:grid-cols-3">
          <div>
            <p className="text-3xl font-extrabold text-[#176B46]">Less waste</p>
            <p className="mt-2 text-sm text-gray-500">Give surplus food a purpose</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[#176B46]">More access</p>
            <p className="mt-2 text-sm text-gray-500">Connect food with people in need</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[#176B46]">Stronger communities</p>
            <p className="mt-2 text-sm text-gray-500">Make local collaboration easier</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-bold uppercase tracking-[0.18em] text-green-700">Simple process</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight">How FoodLoop works</h2>
          <p className="mt-5 leading-7 text-gray-600">
            A simple journey that turns surplus food into meaningful support.
          </p>
        </div>

        <div className="mt-14 grid gap-7 md:grid-cols-3">
          {[
            { number: "01", icon: Utensils, title: "Providers list food", text: "Restaurants and canteens publish available surplus food and pickup details." },
            { number: "02", icon: Users, title: "NGOs reserve food", text: "Nearby organizations discover listings and request the quantity they can collect." },
            { number: "03", icon: Heart, title: "Food reaches people", text: "Approved reservations move to pickup and verification, closing the loop." },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="rounded-2xl border border-green-100 bg-white p-8 transition hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-green-50 p-3 text-green-800"><Icon size={26} /></div>
                  <span className="text-3xl font-extrabold text-green-100">{step.number}</span>
                </div>
                <h3 className="mt-7 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 leading-7 text-gray-600">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#EDF5EC] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="font-bold uppercase tracking-[0.18em] text-green-700">Built for collaboration</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight">Everything in one loop.</h2>
            <p className="mt-5 leading-7 text-gray-600">
              From listing surplus food to confirming collection, FoodLoop
              brings the redistribution process together.
            </p>
          </div>

          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-2xl bg-white p-8 shadow-sm">
                  <div className="inline-flex rounded-xl bg-green-100 p-3 text-green-800">
                    <Icon size={27} />
                  </div>
                  <h3 className="mt-6 text-xl font-bold">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#176B46] px-8 py-16 text-center text-white sm:px-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <ShieldCheck className="mx-auto" size={42} />
          <h2 className="relative mt-6 text-3xl font-extrabold sm:text-4xl">Be part of the change.</h2>
          <p className="relative mx-auto mt-5 max-w-xl leading-7 text-green-100">
            Whether you have surplus food or want to help distribute it,
            there's a place for you in FoodLoop.
          </p>
          <Link
            to={user ? "/dashboard" : "/register"}
            className="relative mt-8 inline-block rounded-xl bg-white px-7 py-4 font-bold text-green-900 transition hover:bg-green-50"
          >
            {user ? "Open your dashboard" : "Join FoodLoop"} <ArrowRight className="ml-2 inline" size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-green-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-6 py-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xl font-extrabold">
            <Leaf className="text-green-700" />
            Food<span className="text-green-600">Loop</span>
          </div>
          <p className="text-sm text-gray-500">Good Food. Better Future.</p>
          <p className="text-sm text-gray-400">© 2026 FoodLoop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
