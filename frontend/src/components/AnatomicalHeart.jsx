// AnatomicalHeart.jsx
import React, { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";

const lerp = (a, b, t) => a + (b - a) * t;

/* -----------------------
   Load artery flow paths
----------------------- */
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

/* -----------------------
   Traffic + Transport Data Hook
----------------------- */
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

    // Smooth interpolation
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


/* -----------------------
   Helpers
----------------------- */
function resampleCurvePoints(pts, samples = 64) {
  const vpts = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(vpts, false, "centripetal");
  return curve.getSpacedPoints(samples - 1).map((v) => [v.x, v.y, v.z]);
}

/* -----------------------
   Particle system + traffic spheres
----------------------- */
function CoronaryParticlesFromJSON({ mesh, traffic = 0.5, liveTraffic = {}, transportData = {} }) {
  const origPaths = useHeartPaths();
  const [hovered, setHovered] = useState(null);
  const groupRefs = useRef([]);

  const paths = useMemo(() => {
    if (!origPaths.length) return [];
    return origPaths.map((p) => resampleCurvePoints(p, 64));
  }, [origPaths]);

  useEffect(() => {
    console.log("Live traffic data received:", liveTraffic);
    console.log("Transport data received:", transportData);
  }, [liveTraffic, transportData]);

  /* ---- Anchors (live traffic) ---- */
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
        t: 0.56,
        density: Math.max(0, 1 - ((liveTraffic?.airport?.score ?? 100) / 100)),
        speed: Math.max(0.4, Math.min(1.8, (liveTraffic?.airport?.speed ?? 10) / 20)),
        description: "Airport connection",
      },
    ],
    [liveTraffic]
  );

  /* ---- Compute world positions ---- */
  const anchorWorld = useMemo(() => {
    return anchors.map((a) => {
      const curve = paths[a.pathIndex]
        ? new THREE.CatmullRomCurve3(paths[a.pathIndex].map((p) => new THREE.Vector3(...p)))
        : null;
      const pos = curve ? curve.getPoint(a.t) : new THREE.Vector3();
      return { ...a, pos };
    });
  }, [paths, anchors]);

  /* ---- Influence field ---- */
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

  /* ---- Particle branches (with bus multiplier) ---- */
  const branches = useMemo(() => {
    // Calculate bus multiplier (more buses = more particles)
    const busCount = transportData?.busCount ?? 0;
    const avgBusCount = 50; // Expected average bus count
    const busMultiplier = Math.max(0.25, Math.min(1.8, busCount / avgBusCount));
    
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
      
      // Base particle count from density
      const baseParticleCount = Math.round(40 + 220 * densityPower);
      
      // Apply bus multiplier - more buses = more particles!
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
  }, [paths, liveTraffic, transportData]); // Added transportData to dependencies

  /* ---- Particle buffers ---- */
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

  /* ---- Animation ---- */
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

  /* ---- Rendering ---- */
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
          {/* Base rings */}
          <mesh>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={a.color} transparent opacity={0.15} wireframe />
          </mesh>
          {/* Core sphere */}
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
          {/* Glow */}
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
                {/* Title */}
                {a.name}

                {/* Subtext (Score + Speed) */}
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
                  Score: {(liveTraffic?.[a.name.toLowerCase().split(" ")[0]]?.score ?? "—")} &nbsp;|&nbsp;
                  Speed: {(
                    Number(liveTraffic?.[a.name.toLowerCase().split(" ")[0]]?.speed ?? 0).toFixed(2)
                  )}{" "}
                  km/h
                </div>

                {/* Animation style */}
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

/* -----------------------
   Heart wrapper
----------------------- */
function Heart({ metrics, trafficData, transportData }) {
  const group = useRef();
  const { scene } = useGLTF("/models/realistic_human_heart.glb");

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
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    const bpm = metrics?.bpm ?? 72;
    const freq = bpm / 60;
    const pulse = 1 + 0.02 * Math.sin(t * freq * Math.PI * 0.5);
    group.current.scale.setScalar(lerp(group.current.scale.x || 1, pulse, 0.06));
    const targetColor = new THREE.Color(metrics?.weatherColor?.slice?.(0, 7) || "#ffffff");
    wireMat.color.lerp(targetColor, 0.2);
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

/* -----------------------
   Top-level component
----------------------- */
export default function AnatomicalHeart({ metrics }) {
  const { trafficData, transportData } = useTrafficData();

  return (
    <div style={{ width: "100%", height: "720px", background: "black" }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 55 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 6, 3]} intensity={0.5} />
        <directionalLight position={[-4, -3, -2]} intensity={0.2} />
        <Suspense fallback={null}>
          <Heart metrics={metrics} trafficData={trafficData} transportData={transportData} />
        </Suspense>
        <OrbitControls enableZoom enablePan={false} minDistance={1.5} maxDistance={2.5} />
      </Canvas>
    </div>
  );
}