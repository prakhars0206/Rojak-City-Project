// useTrafficData.js
import { useState, useEffect, useRef } from "react";

const lerp = (a, b, t) => a + (b - a) * t;

export function useTrafficData() {
  const [trafficData, setTrafficData] = useState({});
  const [transportData, setTransportData] = useState({ busCount: 0, raw: [] });
  const prevDataRef = useRef({});

  async function fetchTraffic(name, url) {
    try {
      console.log(`Fetching traffic for ${name} → ${url}`);
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) {
        console.warn(`${name} returned status ${res.status}`);
        return { score: 50, speed: 10 };
      }

      const data = await res.json();
      const score = Number(data?.score ?? 100);
      const speed = Number(data?.current_speed ?? 10);
      return { score, speed, raw: data };
    } catch (err) {
      console.error(`Failed to fetch ${name} traffic`, err);
      return { score: 50, speed: 10 };
    }
  }

  async function fetchLiveTransport() {
    try {
      console.log("Fetching live transport...");
      const res = await fetch("http://localhost:8000/api/live-transport", { cache: "no-cache" });
      const data = await res.json();
      const buses = (data?.raw || []).filter((v) => v.vehicle_type === "bus");
      setTransportData({
        busCount: buses.length,
        raw: buses,
      });
    } catch (err) {
      console.error("Failed to fetch live transport", err);
      setTransportData({ busCount: 0, raw: [] });
    }
  }

  async function refreshTraffic() {
    const endpoints = {
      princes: "http://localhost:8000/api/traffic/princes-street",
      leith: "http://localhost:8000/api/traffic/leith-street",
      nicolson: "http://localhost:8000/api/traffic/nicolson-street",
      portobello: "http://localhost:8000/api/traffic/portobello-high-street",
      lady: "http://localhost:8000/api/traffic/lady-road",
      gilmerton: "http://localhost:8000/api/traffic/gilmerton-road",
      airport: "http://localhost:8000/api/traffic/edinburgh-airport",
    };

    const newData = {};
    for (const [key, url] of Object.entries(endpoints)) {
      newData[key] = await fetchTraffic(key, url);
    }

    // Blend traffic data
    const prevData = prevDataRef.current;
    const blended = {};
    for (const key of Object.keys(newData)) {
      const prev = prevData[key] || { score: 100, speed: 10 };
      blended[key] = {
        score: lerp(prev.score, newData[key].score, 0.3),
        speed: lerp(prev.speed, newData[key].speed, 0.3),
      };
    }
    prevDataRef.current = blended;
    setTrafficData(blended);

    await fetchLiveTransport();
  }

  useEffect(() => {
    refreshTraffic();
    const interval = setInterval(refreshTraffic, 30000);
    return () => clearInterval(interval);
  }, []);

  return { trafficData, transportData };
}
