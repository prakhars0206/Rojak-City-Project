// useCityData.js
import { useState, useEffect, useRef } from "react";

export function useCityData() {
  const [cityData, setCityData] = useState({
    activity: 0.3,
    mood: 0,
    traffic: 0.4,
    circulation: 0.5,
    social: 0.3,
    energy: 0.2,
    bpm: 72,
    stress: 50,
    weather: { temperature: 12, description: "Loading...", score: 50 },
    weatherColor: "#ff4444",
    energyData: { carbon_intensity: 0, dominant_fuel: "Unknown", score: 50 },
    isConnected: false,
    connectionStatus: "connecting",
    lastUpdate: null,
  });

  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
    connectWebSocket();

    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectRef.current);
    };
  }, []);

  /** -----------------------------
   * Initial fetch from backend
   * ----------------------------- */
  async function fetchInitialData() {
    try {
      const [cityResp, weatherResp, energyResp] = await Promise.all([
        fetch("http://localhost:8000/api/data").then(r => r.json()),
        fetch("http://localhost:8000/api/weather").then(r => r.json()),
        fetch("http://localhost:8000/api/energy").then(r => r.json()),
      ]);

      const weatherDesc = weatherResp?.description ?? "";
      const weatherColor = getWeatherColor(weatherDesc);

      setCityData(prev => ({
        ...prev,
        ...mapBackendToFrontend(cityResp || {}),
        weather: weatherResp || prev.weather,
        weatherColor,
        energyData: mapEnergyData(energyResp) || prev.energyData,
      }));
    } catch (err) {
      console.error("Failed to fetch initial data", err);
    }
  }

  /** -----------------------------
   * WebSocket connection for live updates
   * ----------------------------- */
  function connectWebSocket() {
    const ws = new WebSocket("ws://localhost:8000/ws");
    wsRef.current = ws;

    ws.onopen = () =>
      setCityData(prev => ({ ...prev, isConnected: true, connectionStatus: "connected" }));

        ws.onmessage = e => {
        try {
            const data = JSON.parse(e.data);
            setCityData(prev => {
            const description =
                data?.weather?.description ||
                prev.weather?.description ||
                "Unknown";

            const color = getWeatherColor(description);
            console.log("🎨 Weather update:", description, "→", color);

            return {
                ...prev,
                ...mapBackendToFrontend(data || {}),
                weather: data.weather || prev.weather,
                weatherColor: color,
                energyData: mapEnergyData(data.energy) || prev.energyData,
            };
            });
        } catch (err) {
            console.error("WebSocket parse error:", err);
        }
    };


    ws.onerror = () => setCityData(prev => ({ ...prev, isConnected: false, connectionStatus: "error" }));
    ws.onclose = () => {
      setCityData(prev => ({ ...prev, isConnected: false, connectionStatus: "disconnected" }));
      reconnectRef.current = setTimeout(connectWebSocket, 3000);
    };
  }

  /** -----------------------------
   * Map backend cityPulse data
   * ----------------------------- */
  function mapBackendToFrontend(data) {
    const cityPulse = data.city_pulse || {};
    const energy = data.energy || {};
    const trafficScore = data.princes_street_traffic?.score ?? 40;

    const mood = Number(cityPulse.mood ?? 0);
    const activity = Number(cityPulse.activity ?? 55) / 100;
    const energyScore = Number(cityPulse.energy ?? 60) / 100;
    const traffic = Number(trafficScore) / 100;
    const circulation = Number(energy.score ?? 50) / 100;
    const social = 0.3 + 0.4 * Math.abs(Math.sin(Date.now() / 8000));
    const bpm = calculateBPMFromCarbon(Number(energy.carbon_intensity ?? 0));

    return {
      activity,
      mood,
      traffic,
      circulation,
      social,
      energy: energyScore,
      bpm,
      lastUpdate: data.timestamp ?? new Date().toISOString(),
    };
  }

  /** -----------------------------
   * Map energy API to frontend
   * ----------------------------- */
  function mapEnergyData(energy = {}) {
    if (!energy) return null;
    return {
      carbon_intensity: Number(energy.carbon_intensity ?? 0),
      dominant_fuel: energy.dominant_fuel ?? "Unknown",
      score: Number(energy.score ?? 50),
      raw: energy.raw || {},
    };
  }

  /** -----------------------------
   * Convert carbon intensity to heart BPM
   * ----------------------------- */
  function calculateBPMFromCarbon(carbonIntensity) {
    if (carbonIntensity < 100) return 60 + (carbonIntensity / 100) * 5;
    if (carbonIntensity < 200) return 75 + ((carbonIntensity - 100) / 100) * 10;
    if (carbonIntensity < 300) return 85 + ((carbonIntensity - 200) / 100) * 15;
    if (carbonIntensity < 400) return 100 + ((carbonIntensity - 300) / 100) * 20;
    return 120 + Math.min((carbonIntensity - 400) / 100, 1) * 20;
  }

  /** -----------------------------
   * Weather helpers
   * ----------------------------- */
  function getWeatherColor(description = "") {
    const d = String(description).toLowerCase();

    if (d.includes("clear sky") || d.includes("mainly clear")) return "#37c6faff";
    if (d.includes("partly")) return "#ecc67a";
    if (d.includes("overcast")) return "#4a595b";
    if (d.includes("fog")) return "#7e7d7d";
    if (d.includes("rain")) return "#6c7ca4";
    if (d.includes("snow")) return "#ffffff";
    if (d.includes("thunder")) return "#6633cc";
    return "#734d4d"; // fallback colour
    }


  function getWeatherIcon(description) {
    if (description === 'Clear sky' || description === 'Mainly clear') return '☀️';
    if (description === 'Partly cloudy') return '⛅';
    if (description === 'Overcast') return '☁️';
    if (description.includes('Fog')) return '🌫️';
    if (description.includes('drizzle')) return '🌦️';
    if (description.includes('rain') && !description.includes('showers')) return '🌧️';
    if (description.includes('showers')) return '🌧️';
    if (description.includes('snow')) return '❄️';
    if (description.includes('Thunderstorm')) return '⛈️';
    return '🌡️';
  }
  

  return cityData;
}
