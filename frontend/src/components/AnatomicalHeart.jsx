import React, { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";

const lerp = (a, b, t) => a + (b - a) * t;

function HeartRateMonitor({ bpm }) {
  const [bpmHistory, setBpmHistory] = useState([]);
  const bpmRef = useRef(bpm);
  const maxDataPoints = 40;
  useEffect(() => {
    console.log("🩺 HeartRateMonitor received BPM:", bpm);
  }, [bpm]);

  useEffect(() => {
    bpmRef.current = bpm;
    console.log("🔄 Updated bpmRef to:", bpm);
  }, [bpm]);

  useEffect(() => {
    const recordBPM = () => {
      const currentBpm =
      bpmHistory.length > 0
        ? bpmHistory[bpmHistory.length - 1].bpm
        : bpm || 72;
      console.log("🎯 Attempting to record BPM, current value:", currentBpm);

      if (!currentBpm || typeof currentBpm !== 'number' || currentBpm <= 0) {
        console.warn("⚠️ Invalid BPM value, skipping record:", currentBpm);
        return;
      }
      
      const now = Date.now();
      console.log(`📊 Recording BPM: ${currentBpm} at ${new Date(now).toLocaleTimeString()}`);
      
      setBpmHistory(prev => {
        const newHistory = [...prev, { bpm: currentBpm, timestamp: now }];

        const tenMinutesAgo = now - (10 * 60 * 1000);
        const filtered = newHistory.filter(d => d.timestamp > tenMinutesAgo).slice(-maxDataPoints);
        console.log(`📈 History length: ${filtered.length} points`);
        return filtered;
      });
    };

    console.log("🚀 Starting heart rate monitor...");
    recordBPM();
    
    const interval = setInterval(recordBPM, 15000);
    
    return () => {
      console.log("🛑 Stopping heart rate monitor");
      clearInterval(interval);
    };
  }, []);
  const bpmValues = bpmHistory.map(d => d.bpm);
  const minBpm = bpmValues.length > 0 ? Math.min(...bpmValues) : 50;
  const maxBpm = bpmValues.length > 0 ? Math.max(...bpmValues) : 150;
  const bpmRange = maxBpm - minBpm || 50;

  const generatePath = () => {
    if (bpmHistory.length < 2) return "";
    
    const width = 180;
    const height = 50;
    const padding = 5;
    
    const points = bpmHistory.map((d, i) => {
      const x = padding + (i / Math.max(1, bpmHistory.length - 1)) * (width - 2 * padding);
      const normalizedBpm = (d.bpm - minBpm) / bpmRange;
      const y = height - padding - (normalizedBpm * (height - 2 * padding));
      return `${x},${y}`;
    });
    
    return `M ${points.join(" L ")}`;
  };

  const currentBpm = bpm || 72;

  return (
    <div
      style={{
        position: "absolute",
        top: "15px",
        right: "15px",
        width: "200px",
        background: "rgba(0, 10, 15, 0.85)",
        border: "1px solid #00ff88",
        borderRadius: "8px",
        padding: "10px",
        fontFamily: "'Courier New', monospace",
        color: "#00ff88",
        boxShadow: "0 0 15px rgba(0, 255, 136, 0.2)",
        backdropFilter: "blur(5px)",
        zIndex: 1000,
      }}
    >
      {/* Header with BPM */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "8px"
      }}>
        <div style={{ 
          fontSize: "9px", 
          fontWeight: "bold",
          letterSpacing: "0.5px",
          opacity: 0.7
        }}>
          HEART RATE
        </div>
        <div style={{ 
          fontSize: "24px", 
          fontWeight: "bold",
          lineHeight: "1",
          color: currentBpm > 100 ? "#ff4444" : currentBpm < 60 ? "#4499ff" : "#00ff88",
        }}>
          {currentBpm.toFixed(1)}
          <span style={{ fontSize: "10px", marginLeft: "3px", opacity: 0.7 }}>BPM</span>
        </div>
      </div>

      {/* Waveform Graph */}
      <div style={{ 
        position: "relative",
        height: "50px",
        background: "rgba(0, 20, 10, 0.3)",
        borderRadius: "4px",
        border: "1px solid #00ff8822",
        overflow: "hidden"
      }}>
        <svg 
          width="180" 
          height="50" 
          style={{ display: "block" }}
        >
          {/* Simple grid */}
          <defs>
            <pattern id="smallgrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#00ff8808" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width="180" height="50" fill="url(#smallgrid)" />

          {/* Waveform line for the last 10 points */}
          {bpmHistory.length > 1 && (
            <polyline
              points={bpmHistory
                .slice(-10)
                .map((d, i, arr) => {
                  const x = 5 + (i / Math.max(1, arr.length - 1)) * (180 - 10);
                  const normalizedBpm = (d.bpm - minBpm) / bpmRange;
                  const y = 50 - 5 - normalizedBpm * 40;
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#00ff88"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 5px rgba(0,255,136,0.3))" }}
            />
          )}

          {/* Fading point markers (same positions as polyline) */}
          {bpmHistory.length > 0 &&
            bpmHistory.slice(-10).map((d, i, arr) => {
              const x = 5 + (i / Math.max(1, arr.length - 1)) * (180 - 10);
              const normalizedBpm = (d.bpm - minBpm) / bpmRange;
              const y = 50 - 5 - normalizedBpm * 40;
              const alpha = 0.3 + (i / arr.length) * 0.7;
              return (
                <circle
                  key={d.timestamp}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={`rgba(0,255,136,${alpha.toFixed(2)})`}
                  style={{ filter: "drop-shadow(0 0 4px rgba(0,255,136,0.3))" }}
                />
              );
            })}


          
          {/* Current value indicator */}
          {bpmHistory.length > 0 && (
            <circle
              cx={175}
              cy={50 - 5 - ((currentBpm - minBpm) / bpmRange) * 40}
              r="2.5"
              fill="#00ff88"
              style={{
                filter: "drop-shadow(0 0 4px #00ff88)",
              }}
            />
          )}
        </svg>
        
        {/* No data message */}
        {bpmHistory.length === 0 && (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "10px",
            opacity: 0.5,
            textAlign: "center"
          }}>
            Waiting for data...
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between",
        marginTop: "6px",
        fontSize: "8px",
        opacity: 0.6
      }}>
        <div>MIN {minBpm.toFixed(1)}</div>
        <div>MAX {maxBpm.toFixed(1)}</div>
        <div>{bpmHistory.length} pts</div>
      </div>
    </div>
  );
}

function useHeartPaths() {
  const [paths, setPaths] = useState([]);
  useEffect(() => {
    fetch("/data/heart_paths.json")
      .then((res) => res.json())
      .then((data) => setPaths(data.paths || []))
      .catch((err) => console.error("Failed to load heart_paths.json:", err));
  }, []);
  return paths;
}

function useTrafficData() {
  const [trafficData, setTrafficData] = useState({});
  const [transportData, setTransportData] = useState({ busCount: 0 });
  const prevDataRef = useRef({});

  async function fetchTraffic(name, url) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) return { score: 50, speed: 10 };
      const data = await res.json();
      const score = Number(data?.score ?? 100);
      const speed = Number(data?.current_speed ?? 10);
      return { score, speed, raw: data };
    } catch (err) {
      console.error(`❌ Failed to fetch ${name} traffic`, err);
      return { score: 50, speed: 10 };
    }
  }

  async function fetchTransport() {
    try {
      const res = await fetch("http://localhost:8000/api/live-transport", { cache: "no-cache" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      const busCount = data?.raw?.filter?.((v) => v.vehicle_type === "bus")?.length ?? 0;
      setTransportData({ busCount, raw: data.raw });
    } catch (err) {
      console.warn("⚠️ Could not fetch transport data:", err);
      setTransportData({ busCount: 0 });
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
  }

  useEffect(() => {
    refreshTraffic();
    fetchTransport();
    const interval = setInterval(() => {
      refreshTraffic();
      fetchTransport();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return { trafficData, transportData };
}

function resampleCurvePoints(pts, samples = 64) {
  const vpts = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vpts, false, "centripetal");
  return curve.getSpacedPoints(samples - 1).map((v) => [v.x, v.y, v.z]);
}

function CoronaryParticlesFromJSON({ mesh, traffic = 0.5, liveTraffic = {}, transportData = {} }) {
  const origPaths = useHeartPaths();
  const [hovered, setHovered] = useState(null);
  const groupRefs = useRef([]);

  const paths = useMemo(() => {
    if (!origPaths.length) return [];
    return origPaths.map((p) => resampleCurvePoints(p, 64));
  }, [origPaths]);

  const anchors = useMemo(
    () => [
      {
        name: "Princes Street",
        pathIndex: 2,
        t: 0.5,
        density: Math.max(0, 1 - ((liveTraffic?.princes?.score ?? 100) / 100)),
        speed: Math.max(0.4, Math.min(1.8, (liveTraffic?.princes?.speed ?? 10) / 20)),
        description: "Main shopping street - peak traffic",
      },
      {
        name: "Leith Street",
        pathIndex: 4,
        t: 0.38,
        density: Math.max(0, 1 - ((liveTraffic?.leith?.score ?? 100) / 100)),
        speed: Math.max(0.4, Math.min(1.8, (liveTraffic?.leith?.speed ?? 10) / 20)),
        description: "Main route to port area",
      },
      {
        name: "Nicolson Street",
        pathIndex: 8,
        t: 0.75,
        density: Math.max(0, 1 - ((liveTraffic?.nicolson?.score ?? 100) / 100)),
        speed: Math.max(0.4, Math.min(1.8, (liveTraffic?.nicolson?.speed ?? 10) / 20)),
        description: "Busy N-S corridor",
      },
      {
        name: "Portobello",
        pathIndex: 7,
        t: 0.72,
        density: Math.max(0, 1 - ((liveTraffic?.portobello?.score ?? 100) / 100)),
        speed: Math.max(0.4, Math.min(1.8, (liveTraffic?.portobello?.speed ?? 10) / 20)),
        description: "Coastal suburb connection",
      },
      {
        name: "Lady Road",
        pathIndex: 8,
        t: 0.83,
        density: Math.max(0, 1 - ((liveTraffic?.lady?.score ?? 100) / 100)),
        speed: Math.max(0.4, Math.min(1.8, (liveTraffic?.lady?.speed ?? 10) / 20)),
        description: "Eastern suburban route",
      },
      {
        name: "Gilmerton",
        pathIndex: 1,
        t: 0.12,
        density: Math.max(0, 1 - ((liveTraffic?.gilmerton?.score ?? 100) / 100)),
        speed: Math.max(0.4, Math.min(1.8, (liveTraffic?.gilmerton?.speed ?? 10) / 20)),
        description: "Southern suburb link",
      },
      {
        name: "Edinburgh Airport",
        pathIndex: 3,
        dataKey: "airport",
        t: 0.56,
        density: Math.max(0, 1 - ((liveTraffic?.airport?.score ?? 100) / 100)),
        speed: Math.max(0.4, Math.min(1.8, (liveTraffic?.airport?.speed ?? 10) / 20)),
        description: "Airport connection",
      },
    ],
    [liveTraffic]
  );

  const anchorWorld = useMemo(() => {
    return anchors.map((a) => {
      const curve = paths[a.pathIndex]
        ? new THREE.CatmullRomCurve3(paths[a.pathIndex].map((p) => new THREE.Vector3(...p)))
        : null;
      const pos = curve ? curve.getPoint(a.t) : new THREE.Vector3();
      return { ...a, pos };
    });
  }, [paths, anchors]);

  const getInfluenceAt = (point) => {
    let totalW = 0,
      dens = 0,
      spd = 0;
    const radius = 0.2;
    anchorWorld.forEach((a) => {
      const d = point.distanceTo(a.pos);
      const w = Math.exp(-Math.pow(d / radius, 2));
      totalW += w;
      dens += w * a.density;
      spd += w * a.speed;
    });
    if (totalW < 0.01) return { density: 0.1, speed: 0.5 };
    return { density: dens / totalW, speed: spd / totalW };
  };

  const branches = useMemo(() => {
    const busCount = transportData?.busCount ?? 0;
    const avgBusCount = 150;
    const busMultiplier = Math.max(0.25, Math.min(1, busCount / avgBusCount));
    
    console.log(`🚍 Bus count: ${busCount}, particle multiplier: ${busMultiplier.toFixed(2)}x`);
    
    return paths.map((pts, i) => {
      const curve = new THREE.CatmullRomCurve3(
        pts.map((p) => new THREE.Vector3(...p)),
        false,
        "centripetal"
      );
      const samples = 5;
      let totalDensity = 0,
        totalSpeed = 0;
      for (let s = 0; s < samples; s++) {
        const t = s / (samples - 1);
        const point = curve.getPoint(t);
        const inf = getInfluenceAt(point);
        totalDensity += inf.density;
        totalSpeed += inf.speed;
      }
      const avgDensity = totalDensity / samples;
      const avgSpeed = totalSpeed / samples;
      const densityPower = Math.pow(avgDensity, 3);
      
      const baseParticleCount = Math.round(40 + 220 * densityPower);
      const particleCount = Math.round(baseParticleCount * busMultiplier);
      
      const speedMult = 0.5 + avgSpeed;
      return {
        id: `path${i}`,
        curve,
        colorStart: new THREE.Color("#ff6666"),
        colorEnd: new THREE.Color("#ff2222"),
        speed: (0.45 + Math.random() * 0.15) * speedMult,
        count: particleCount,
        dir: i % 2 === 0 ? 1 : -1,
      };
    });
  }, [paths, liveTraffic, transportData]);

  const totalParticles = useMemo(() => branches.reduce((s, b) => s + b.count, 0), [branches]);
  const positions = useMemo(() => new Float32Array(totalParticles * 3), [totalParticles]);
  const colors = useMemo(() => new Float32Array(totalParticles * 3), [totalParticles]);

  const particleData = useMemo(() => {
    const arr = [];
    let ptr = 0;
    for (const branch of branches) {
      for (let i = 0; i < branch.count; i++) {
        const t = Math.random();
        const pos = branch.curve.getPoint(t);
        const color = branch.colorStart.clone().lerp(branch.colorEnd, t);
        positions.set([pos.x, pos.y, pos.z], ptr * 3);
        colors.set([color.r, color.g, color.b], ptr * 3);
        arr.push({ branch, t, speed: branch.speed, dir: branch.dir });
        ptr++;
      }
    }
    return arr;
  }, [branches]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const posArr = geometry.attributes.position.array;
    let ptr = 0;

    for (const p of particleData) {
      p.t += (p.speed * 0.00015) * p.dir;
      if (p.t > 1) p.t -= 1;
      if (p.t < 0) p.t += 1;
      const base = p.branch.curve.getPoint(p.t);
      posArr.set([base.x, base.y, base.z], ptr * 3);
      ptr++;
    }
    geometry.attributes.position.needsUpdate = true;

    groupRefs.current.forEach((ref, i) => {
      const a = anchorWorld[i];
      if (!ref || !a) return;

      const { density, speed } = a;
      const baseSize = 1 + density * 1.8;
      const pulseAmp = 0.1 + 0.45 * density;
      const pulseSpeed = 1.2 + speed * 3.5;
      const scale = baseSize * (1 + pulseAmp * Math.sin(time * pulseSpeed + i));
      ref.scale.set(scale, scale, scale);

      let color;
      if (density > 0.7) color = "#ff2222";
      else if (density > 0.4) color = "#ff9933";
      else if (density > 0.15) color = "#ffee55";
      else color = "#aaccff";

      ref.children?.forEach?.((child) => {
        if (!child.isMesh) return;
        if (child.material) {
          child.material.color.set(color);
          if (child.material.emissive) {
            child.material.emissive.set(color);
            child.material.emissiveIntensity = 1.5 + density * 1.5;
          }
          child.material.needsUpdate = true;
        }
      });
      a.color = color;
    });
  });

  return (
    <>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.012 + 0.008 * traffic}
          vertexColors
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {anchorWorld.map((a, i) => (
        <group
          key={i}
          position={a.pos}
          ref={(el) => (groupRefs.current[i] = el)}
          onPointerOver={() => setHovered(i)}
          onPointerOut={() => setHovered(null)}
        >
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={a.color} transparent opacity={0.15} wireframe />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.018, 16, 16]} />
            <meshStandardMaterial
              color={a.color}
              emissive={a.color}
              emissiveIntensity={2.0 + a.density}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshBasicMaterial
              color={a.color}
              transparent
              opacity={0.25}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {hovered === i && (
            <Html
              distanceFactor={1}
              zIndexRange={[10, 20]}
              pointerEvents="none"
            >
              <div
                style={{
                  color: a.color,
                  background: "rgba(10, 10, 20, 0.9)",
                  padding: "40px 80px",
                  borderRadius: "20px",
                  fontSize: "42px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "'Orbitron', 'Rajdhani', 'Exo 2', sans-serif",
                  border: `1px solid ${a.color}`,
                  boxShadow: `0 0 8px ${a.color}`,
                  backdropFilter: "blur(3px)",
                  transform: "translateY(-12px)",
                  textShadow: `0 0 3px ${a.color}, 0 0 7px ${a.color}`,
                  opacity: 0,
                  animation: "tooltipFade 0.3s ease-out forwards",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                }}
              >
                {a.name}
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 400,
                    color: a.color
                      ? `${a.color}cc`
                      : "rgba(200, 200, 200, 0.7)",
                    letterSpacing: "0.04em",
                    marginTop: "6px",
                    textTransform: "none",
                    fontFamily: "'Rajdhani', sans-serif",
                  }}
                >
                  Score: {(liveTraffic?.[a.dataKey || a.name.toLowerCase().split(" ")[0]]?.score ?? "—")} &nbsp;|&nbsp;
                  Speed: {(
                    Number(liveTraffic?.[a.dataKey || a.name.toLowerCase().split(" ")[0]]?.speed ?? 0).toFixed(2)
                  )}{" "}
                  km/h
                </div>
                <style>{`
                  @keyframes tooltipFade {
                    from {
                      transform: translateY(-18px);
                      opacity: 0;
                      filter: blur(4px);
                    }
                    to {
                      transform: translateY(-12px);
                      opacity: 1;
                      filter: blur(0);
                    }
                  }
                `}</style>
              </div>
            </Html>
          )}
        </group>
      ))}
    </>
  );
}

function Heart({ metrics, trafficData, transportData, onBpmChange }) {
  const group = useRef();
  const { scene } = useGLTF("/models/realistic_human_heart.glb");

  useEffect(() => {
    console.log("💓 Heart received metrics:", {
      weatherColor: metrics?.weatherColor,
      weather: metrics?.weather,
      bpm: metrics?.bpm,
      fullMetrics: metrics
    });
  }, [metrics]);

  const mergedMesh = useMemo(() => {
    if (!scene) return null;
    const geoms = [];
    let mat = null;
    scene.traverse((o) => {
      if (o.isMesh && o.geometry) {
        const g = o.geometry.clone();
        g.applyMatrix4(o.matrixWorld);
        geoms.push(g);
        if (!mat) mat = o.material;
      }
    });
    if (!geoms.length) return null;
    return new THREE.Mesh(mergeGeometries(geoms, true), mat || new THREE.MeshPhysicalMaterial());
  }, [scene]);

  if (!mergedMesh) return null;

  const wireGeometry = useMemo(() => new THREE.WireframeGeometry(mergedMesh.geometry), [mergedMesh]);
  
  const wireMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#dfb96b"),
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;

    if (group.current.currentBpm === undefined) group.current.currentBpm = metrics?.bpm ?? 72;
    if (group.current.targetBpm === undefined) group.current.targetBpm = group.current.currentBpm;
    if (group.current.lastJitterTime === undefined) group.current.lastJitterTime = t;

    let baseBpm = metrics?.bpm ?? 72;
    let currentBpm = group.current.currentBpm;
    let targetBpm = group.current.targetBpm;

    if (t - group.current.lastJitterTime > 3 + Math.random() * 3) {
      group.current.lastJitterTime = t+80;
      const jitter = (Math.random() - 0.5) * 0.3; 
      targetBpm = Math.max(50, Math.min(130, baseBpm + jitter));
      group.current.targetBpm = targetBpm;
    }

    currentBpm = lerp(currentBpm, targetBpm, 0.02);
    group.current.currentBpm = currentBpm;

    const freq = currentBpm / 60;
    const pulse = 1 + 0.02 * Math.sin(t * freq * Math.PI * 0.5);
    group.current.scale.setScalar(lerp(group.current.scale.x || 1, pulse, 0.06));

    if (wireMat) {
      const colorStr = metrics?.weatherColor || "#dfb96b";
      const targetColor = new THREE.Color(colorStr.slice(0, 7));
      wireMat.color.lerp(targetColor, 0.1);
    }

    onBpmChange?.(parseFloat(currentBpm.toFixed(2)));
  });

  return (
    <group ref={group} position={[0, -0.02, 0]}>
      <mesh geometry={mergedMesh.geometry}>
        <meshPhysicalMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={wireGeometry} material={wireMat} />
      <CoronaryParticlesFromJSON 
        mesh={mergedMesh} 
        traffic={metrics?.traffic ?? 0.5} 
        liveTraffic={trafficData}
        transportData={transportData}
      />
    </group>
  );
}

export default function AnatomicalHeart({ metrics }) {
  const { trafficData, transportData } = useTrafficData();
  const [liveBpm, setLiveBpm] = useState(metrics?.bpm ?? 72);


  useEffect(() => {
    console.log("🔍 AnatomicalHeart received metrics:", metrics);
  }, [metrics]);

  return (
    <div style={{ width: "100%", height: "720px", background: "black", position: "relative" }}>
      <HeartRateMonitor bpm={liveBpm} />
      <Canvas camera={{ position: [0, 0, 3], fov: 55 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 6, 3]} intensity={0.5} />
        <directionalLight position={[-4, -3, -2]} intensity={0.2} />
        <Suspense fallback={null}>
          <Heart 
            metrics={metrics} 
            trafficData={trafficData} 
            transportData={transportData}
            onBpmChange={setLiveBpm}
          />
        </Suspense>
        <OrbitControls enableZoom enablePan={false} minDistance={1.5} maxDistance={2.5} />
      </Canvas>

    </div>
  );
}