// App.jsx
import React, { useState, useEffect, useRef, memo } from 'react';
import AnatomicalHeart from './components/AnatomicalHeart';
import './App.css';
import { GiCaravan, GiLightningArc, GiSunCloud, GiTrafficCone } from 'react-icons/gi';
import { WiCloud, WiDaySunny } from 'react-icons/wi';
import { FaPause, FaPlay } from 'react-icons/fa';

const MemoizedHeart = memo(AnatomicalHeart);

function App() {
  const [weatherData, setWeatherData] = useState(null);
  const [energyData, setEnergyData] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [selectedStreet, setSelectedStreet] = useState('princes-street');
  const [isPaused, setIsPaused] = useState(false);
  const wsRef = useRef(null);

  const streets = [
    { id: 'princes-street', name: 'Princes Street', key: 'princes_street_traffic' },
    { id: 'edinburgh-airport', name: 'Edinburgh Airport', key: 'edinburgh_airport_traffic' },
    { id: 'portobello-high-street', name: 'Portobello High Street', key: 'portobello_high_street_traffic' },
    { id: 'nicolson-street', name: 'Nicolson Street', key: 'nicolson_street_traffic' },
    { id: 'lady-road', name: 'Lady Road', key: 'lady_road_traffic' },
    { id: 'gilmerton-road', name: 'Gilmerton Road', key: 'gilmerton_road_traffic' },
  ];

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setConnectionStatus('connecting');
        const response = await fetch('http://localhost:8000/api/data');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.weather) setWeatherData(data.weather);
        if (data.energy) setEnergyData(data.energy);
        const currentStreet = streets.find((s) => s.id === selectedStreet);
        if (currentStreet && data[currentStreet.key]) setTrafficData(data[currentStreet.key]);

        setLastUpdate(new Date().toLocaleTimeString());
        setConnectionStatus('connected');
        setLoading(false);
        setError(null);

        try {
          const predResp = await fetch('http://localhost:8000/api/predictions');
          if (predResp.ok) {
            const predJson = await predResp.json();
            setPredictions(predJson.predictions || predJson);
          }
        } catch (err) {
          console.error('Failed to fetch predictions:', err);
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        setConnectionStatus('error');
        setError('Cannot connect to backend. Make sure the server is running.');
        setLoading(false);
      }
    };

    fetchInitialData();

    try {
      const ws = new WebSocket('ws://localhost:8000/ws');
      wsRef.current = ws;
      ws.onopen = () => setConnectionStatus('connected');
      ws.onmessage = (event) => {
        if (isPaused) return;
        try {
          const data = JSON.parse(event.data);
          if (data.weather) setWeatherData(data.weather);
          if (data.energy) setEnergyData(data.energy);
          if (data.predictions) {
            const preds = data.predictions.predictions || data.predictions;
            setPredictions(preds || []);
          }
          const currentStreet = streets.find((s) => s.id === selectedStreet);
          if (currentStreet && data[currentStreet.key]) setTrafficData(data[currentStreet.key]);
          setLastUpdate(new Date().toLocaleTimeString());
          setConnectionStatus('connected');
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error parsing ws message:', err);
        }
      };
      ws.onerror = (err) => {
        console.error('WebSocket error', err);
        setConnectionStatus('error');
        setError('WebSocket connection failed');
      };
      ws.onclose = () => setConnectionStatus('disconnected');
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setConnectionStatus('error');
    }

    return () => wsRef.current?.close();
  }, [isPaused]);

  useEffect(() => {
    const refetchTrafficData = async () => {
      if (isPaused) return;
      try {
        const response = await fetch('http://localhost:8000/api/data');
        if (response.ok) {
          const data = await response.json();
          const currentStreet = streets.find((s) => s.id === selectedStreet);
          if (currentStreet && data[currentStreet.key]) setTrafficData(data[currentStreet.key]);
        }
      } catch (err) {
        console.error('Failed to refetch traffic data:', err);
      }
    };
    if (!loading) refetchTrafficData();
  }, [selectedStreet, isPaused]);

  const togglePause = () => setIsPaused((p) => !p);

  const [selectedPredictionStreet, setSelectedPredictionStreet] = useState('princes-street');
  const selectedPredictionKey = streets.find((s) => s.id === selectedPredictionStreet)?.key;
  const selectedPrediction = predictions.find(
    (p) => p?.validation_data?.location_key === selectedPredictionKey
  );

  /* ---------- Optimized Tilt Effect (GPU-only, no lag) ---------- */
  const heartRef = useRef();
  useEffect(() => {
    const el = heartRef.current;
    if (!el) return;
    let targetX = 0,
      targetY = 0,
      currentX = 0,
      currentY = 0,
      raf;

    const update = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      el.style.transform = `rotateX(${currentY}deg) rotateY(${currentX}deg)`;
      raf = requestAnimationFrame(update);
    };
    update();

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
      const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
      targetX = dx * 10;
      targetY = -dy * 10;
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="h-screen bg-black text-white overflow-hidden flex flex-col fade-in">
      {isPaused && (
        <div className="fixed top-4 left-4 z-50 px-4 py-2 bg-yellow-900/90 border border-yellow-700 rounded-lg text-sm text-yellow-400 shadow-lg backdrop-blur-sm">
          ⏸️ Updates paused
        </div>
      )}

      <header className="border-b border-gray-800 py-2 px-4 text-center flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1"></div>
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-bold header-title neon-flicker">EDINPULSE</h1>
            <p className="text-gray-400 mt-1 text-sm">Edinburgh's Anatomical City Heart</p>
          </div>
          <div className="flex-1 flex justify-end items-center gap-4">
            <button
              onClick={togglePause}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                isPaused
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {isPaused ? (
                <>
                  <FaPlay className="text-sm" />
                  <span className="text-sm">Resume</span>
                </>
              ) : (
                <>
                  <FaPause className="text-sm" />
                  <span className="text-sm">Pause</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isPaused
                    ? 'bg-yellow-500'
                    : connectionStatus === 'connected'
                    ? 'bg-green-500 animate-pulse'
                    : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : connectionStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                }`}
              />
              <span className="text-xl text-gray-400">
                {isPaused
                  ? 'Paused'
                  : connectionStatus === 'connected'
                  ? 'Live'
                  : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : connectionStatus === 'error'
                  ? 'Error'
                  : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-2 px-4 py-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-400">
            {error}
          </div>
        )}
      </header>

      <main className="h-full flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-1/4 border-r border-gray-800 flex flex-col overflow-y-auto p-4 panel fade-in">
          <h2 className="text-lg font-bold text-gray-200 mb-3 sticky top-0 bg-black pb-2">
            Current Conditions
          </h2>
          {lastUpdate && <p className="text-xs text-gray-500 mb-3">Last update: {lastUpdate}</p>}
          <div className="flex flex-col gap-3">
            <DataFlowCard
              vessel="Edinburgh Weather"
              dataType="Current Conditions"
              loading={loading}
              value={weatherData?.temperature}
              unit="°C"
              description={weatherData?.description || 'N/A'}
              icon={
                weatherData?.description?.toLowerCase().includes('cloud') ? WiCloud : WiDaySunny
              }
              type="weather"
            />
            <DataFlowCard
              vessel="Carbon Intensity"
              dataType="Energy Status"
              loading={loading}
              value={energyData?.carbon_intensity}
              unit="gCO2/kWh"
              description={`Score: ${Math.round(energyData?.score || 0)}/100`}
              score={energyData?.score}
              icon={GiLightningArc}
              type="energy"
            />
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <label className="text-xs text-gray-400 block mb-2">Select Street:</label>
              <select
                value={selectedStreet}
                onChange={(e) => setSelectedStreet(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none"
              >
                {streets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <DataFlowCard
                vessel="Traffic Flow"
                dataType={streets.find((s) => s.id === selectedStreet)?.name || 'Traffic'}
                loading={loading}
                value={trafficData?.score}
                unit="/100"
                description={
                  trafficData?.current_speed
                    ? `${trafficData.current_speed.toFixed(2)} km/h`
                    : 'No data'
                }
                score={trafficData?.score}
                icon={GiCaravan}
                type="traffic"
              />
            </div>
          </div>
        </div>

        {/* CENTER HEART */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-gray-400 text-xs mb-2">Drag to rotate</p>
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden w-full h-full">
            <div ref={heartRef} className="heart-stage w-full h-full">
              <MemoizedHeart isPaused={isPaused} />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-1/4 border-l border-gray-800 flex flex-col overflow-y-auto p-4 panel fade-in">
          <h2 className="text-lg font-bold text-gray-200 mb-3 sticky top-0 bg-black pb-2">
            Predictions
          </h2>
          <div className="flex flex-col gap-3">
            <DataFlowCard vessel="Weather" dataType="Heart Colour" icon={GiSunCloud} />
            <DataFlowCard vessel="Energy" dataType="Pulse" icon={GiLightningArc} />
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <label className="text-xs text-gray-400 block mb-2">
                Select Street for Predictions:
              </label>
              <select
                value={selectedPredictionStreet}
                onChange={(e) => setSelectedPredictionStreet(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none"
              >
                {streets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <DataFlowCard
                vessel="Congestion Prediction"
                dataType={streets.find((s) => s.id === selectedPredictionStreet)?.name || 'Street'}
                loading={loading}
                description={
                  selectedPrediction
                    ? `${selectedPrediction.severity} — Confidence ${selectedPrediction.confidence}%`
                    : 'No active predictions'
                }
                icon={GiTrafficCone}
                value={selectedPrediction?.severity}
                score={selectedPrediction?.severity}
                unit="%"
                type="trafficPrediction"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- DataFlowCard Component ---------- */
function DataFlowCard({ vessel, icon: Icon, dataType, description, loading, value, unit, score, type }) {
  const getColorClasses = () => {
    if (loading || value === undefined)
      return { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-700' };
    if (type === 'weather') {
      const t = value;
      if (t < 5) return { bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700' };
      if (t < 15) return { bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-700' };
      if (t < 20) return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-700' };
      return { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-700' };
    }
    if (type === 'energy') {
      if (score >= 90) return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-700' };
      if (score >= 60) return { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700' };
      if (score >= 30) return { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-700' };
      return { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-700' };
    }
    if (type === 'traffic') {
      if (score >= 75) return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-700' };
      if (score >= 50) return { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-700' };
      if (score >= 25) return { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-700' };
      return { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-700' };
    }
    if (type === 'trafficPrediction') {
      if (score === 'Major')
        return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-700' };
      if (score === 'Minor')
        return { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-700' };
      return { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-700' };
    }
    return { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-700' };
  };

  const colors = getColorClasses();
  return (
    <div
      className={`border ${colors.border} ${colors.bg} rounded-lg p-3 card-animate hover:scale-[1.02] transition-transform duration-300`}
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`text-xl ${colors.text}`} />}
        <h3 className={`font-semibold ${colors.text}`}>{vessel}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-1">{dataType}</p>
      <p className={`text-lg font-bold ${colors.text}`}>
        {loading ? '...' : value !== undefined ? `${value} ${unit || ''}` : 'N/A'}
      </p>
      {description && <p className="text-sm text-gray-400">{description}</p>}
    </div>
  );
}

export default App;
