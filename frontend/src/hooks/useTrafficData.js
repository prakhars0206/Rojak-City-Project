import { useState, useEffect } from "react";

export function useTrafficData() {
  const [trafficData, setTrafficData] = useState({});

  async function fetchTraffic(name, url) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) {
        const text = await res.text();
        console.warn(`⚠️ ${name} bad response (${res.status}):`, text);
        return { score: 50, speed: 10 };
      }

      const data = await res.json();
      console.log(`✅ ${name} raw data:`, data);
      const score = Number(data?.score ?? 100);
      const speed = Number(data?.current_speed ?? 10);
      return { score, speed, raw: data };
    } catch (err) {
      console.error(`❌ Failed to fetch ${name}`, err);
      return { score: 50, speed: 10 };
    }
  }

  async function refreshTraffic() {
    const endpoints = {
      princes: "http://127.0.0.1:8000/api/traffic/princes-street/",
      leith: "http://127.0.0.1:8000/api/traffic/leith-street/",
      nicolson: "http://127.0.0.1:8000/api/traffic/nicolson-street/",
      portobello: "http://127.0.0.1:8000/api/traffic/portobello-high-street/",
      lady: "http://127.0.0.1:8000/api/traffic/lady-road/",
      gilmerton: "http://127.0.0.1:8000/api/traffic/gilmerton-road/",
      airport: "http://127.0.0.1:8000/api/traffic/edinburgh-airport/",
    };

    const result = {};
    for (const [key, url] of Object.entries(endpoints)) {
      result[key] = await fetchTraffic(key, url);
    }

    console.log("🚦 Live traffic data received:", result);
    setTrafficData(result);
  }

  useEffect(() => {
    refreshTraffic();
    const interval = setInterval(refreshTraffic, 30_000);
    return () => clearInterval(interval);
  }, []);

  return trafficData;
}
