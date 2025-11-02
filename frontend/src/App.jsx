// App.jsx
import React from "react";
import AnatomicalHeart from "./components/AnatomicalHeart";
import { useCityData } from "./hooks/useCityData";
import "./App.css";

/* -----------------------
   Helper Components
----------------------- */
function ConnectionStatus({ status }) {
  const config = {
    connected: { color: '#00ff88', text: 'LIVE', pulse: true },
    connecting: { color: '#ffaa00', text: 'CONNECTING...', pulse: true },
    disconnected: { color: '#ff4444', text: 'OFFLINE', pulse: false },
    error: { color: '#ff4444', text: 'ERROR', pulse: false }
  };
  const { color, text, pulse } = config[status] || config.disconnected;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${pulse ? "animate-pulse" : ""}`} style={{ backgroundColor: color }} />
      <span className="text-sm font-mono" style={{ color }}>{text}</span>
    </div>
  );
}

function MetricCard({ label, value, unit, color, icon, subtitle, isLive }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-400 text-xs">{label}</div>
        {isLive && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-500">LIVE</span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
        {unit && <span className="text-gray-500 text-sm">{unit}</span>}
      </div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}:</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

function DataSource({ name, status, description, color }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: color }} />
      <div>
        <div className="font-bold">{name}</div>
        <div className="text-xs text-gray-500">{description}</div>
        <div className="text-xs mt-1" style={{ color }}>
          {status === "active" ? "● Active" : "Coming Soon"}
        </div>
      </div>
    </div>
  );
}

/* -----------------------
   Helper Functions
----------------------- */
function getMoodText(mood) {
  if (mood > 0.5) return "Very Positive";
  if (mood > 0) return "Positive";
  if (mood > -0.5) return "Neutral";
  return "Negative";
}

function getMoodColor(mood) {
  if (mood > 0) return "#00ff88";
  if (mood > -0.5) return "#ffaa00";
  return "#ff4444";
}

/* -----------------------
   Main App
----------------------- */
export default function App() {
  const cityData = useCityData();

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-red-500">PULSE</h1>
            <p className="text-gray-400 mt-2">Edinburgh's Living Heart</p>
          </div>
          <ConnectionStatus status={cityData.connectionStatus} />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="CITY PULSE"
            value={cityData.bpm}
            unit="BPM"
            color="#00ff88"
            icon="💓"
            isLive={cityData.isConnected}
          />
          <MetricCard
            label="ACTIVITY"
            value={Math.round(cityData.activity * 100)}
            unit="%"
            color="#ffaa00"
            icon="⚡"
          />
          <MetricCard
            label="WEATHER"
            value={Math.round(cityData.weather.temperature)}
            unit="°C"
            color="#00ddff"
            icon="🌤️"
            subtitle={cityData.weather.description}
          />
          <MetricCard
            label="ENERGY"
            value={Math.round(cityData.energyData.carbon_intensity)}
            unit="gCO₂"
            color={cityData.energyData.score > 60 ? "#00ff88" : "#ff4444"}
            icon="⚡"
            subtitle={cityData.energyData.dominant_fuel}
          />
        </div>

        {/* Live Anatomical Heart */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Live Anatomical Heart</h2>
              <p className="text-gray-400 text-sm mt-1">
                Real-time Edinburgh data visualization • Drag to rotate
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-400">
                {cityData.bpm} <span className="text-sm text-gray-500">BPM</span>
              </div>
              <div className="text-xs text-gray-500">
                Activity: {Math.round(cityData.activity * 100)}%
              </div>
            </div>
          </div>
          <AnatomicalHeart metrics={cityData} />
        </div>
      </main>
    </div>
  );
}
