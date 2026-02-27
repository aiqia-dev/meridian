"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api";
import { Globe2, Eye, EyeOff, MapPin, Database, Webhook, Map } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login(username, password);
      localStorage.setItem("meridian_token", response.token);
      localStorage.setItem("meridian_user", response.username);
      router.push("/dashboard/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-gradient-to-b from-blue-50 via-slate-50 to-blue-100/30 p-8 lg:p-12">
        {/* Logo */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 bg-white/50 backdrop-blur-sm">
            <Globe2 className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-slate-800">Meridian</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome back
            </h1>
            <p className="text-slate-600">
              Sign in to access the geospatial admin panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-100 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium text-slate-700">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="h-12 rounded-xl bg-white/70 border-slate-200 focus:bg-white focus:border-blue-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 rounded-xl bg-white/70 border-slate-200 focus:bg-white focus:border-blue-400 transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-slate-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between text-sm text-slate-500">
          <span>AIQIA Meridian Admin</span>
          <a href="/about/" className="underline hover:text-slate-700">Documentation</a>
        </div>
      </div>

      {/* Right Side - Feature Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-200 p-8">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        </div>

        {/* Main Content Area */}
        <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden shadow-2xl">
          {/* Map Background */}
          <div className="absolute inset-0 opacity-30">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>

          {/* Floating Cards */}
          <div className="relative h-full p-6 flex flex-col justify-between">
            {/* Top Card - Geofencing Alert */}
            <div className="flex justify-end">
              <div className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl max-w-xs">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">Geofence Alert</h4>
                    <p className="text-xs text-slate-500">Vehicle entered delivery zone</p>
                    <p className="text-xs text-slate-400 mt-1">Just now</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center - Map Visualization */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative">
                {/* Animated pulse circles */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border border-blue-400/30 animate-ping" style={{ animationDuration: '3s' }} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full border border-blue-400/50 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                </div>
                <div className="relative z-10 w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Bottom Cards */}
            <div className="space-y-4">
              {/* Stats Card */}
              <div className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">Active Objects</span>
                  <span className="text-xs text-blue-600 font-semibold">Live</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">T1</div>
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">T2</div>
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">T3</div>
                    <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 text-xs font-bold border-2 border-white">+5</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-slate-900">1,247</p>
                    <p className="text-xs text-slate-500">tracked objects</p>
                  </div>
                </div>
              </div>

              {/* Features Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center">
                  <Database className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-700">Collections</p>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center">
                  <Map className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-700">Live Map</p>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-xl p-3 text-center">
                  <Webhook className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs font-medium text-slate-700">Webhooks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
