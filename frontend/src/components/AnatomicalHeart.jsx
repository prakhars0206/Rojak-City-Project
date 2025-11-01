import React, { useRef, useMemo, Suspense, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler";

const lerp = (a, b, t) => a + (b - a) * t;

// GPU Blood inside heart
function GPUBloodInside({ mesh, traffic }) {
  const pointsRef = useRef();
  const particleCount = 2000;

  const positions = useMemo(() => {
    if (!mesh) return new Float32Array();
    const sampler = new MeshSurfaceSampler(mesh).build();
    const posArray = new Float32Array(particleCount * 3);
    const _position = new THREE.Vector3();

    const center = new THREE.Vector3();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(center);

    for (let i = 0; i < particleCount; i++) {
      sampler.sample(_position);
      const direction = center.clone().sub(_position).multiplyScalar(Math.random() * 0.5);
      _position.add(direction);

      posArray[i * 3] = _position.x;
      posArray[i * 3 + 1] = _position.y;
      posArray[i * 3 + 2] = _position.z;
    }
    return posArray;
  }, [mesh]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        traffic: { value: traffic },
      },
      vertexShader: `
        uniform float time;
        uniform float traffic;
        void main() {
          vec3 pos = position;
          float speed = 0.2 + 0.5*traffic;
          pos += vec3(
            sin(time*1.5 + position.x*10.0)*0.02*traffic,
            cos(time*1.7 + position.y*10.0)*0.02*traffic,
            sin(time*1.3 + position.z*10.0)*0.02*traffic
          );
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
          gl_PointSize = 2.0;
        }
      `,
      fragmentShader: `
        void main() {
          gl_FragColor = vec4(1.0,0.0,0.0,1.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [traffic]);

  useFrame((state) => {
    if (pointsRef.current) material.uniforms.time.value = state.clock.elapsedTime;
    material.uniforms.traffic.value = traffic;
  });

  return (
    <points ref={pointsRef} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
      </bufferGeometry>
    </points>
  );
}

// GPU Artery Sparks
function GPUArterySparks({ geometry, circulation }) {
  const pointsRef = useRef();
  const particleCount = 1000;

  const positions = useMemo(() => {
    if (!geometry) return new Float32Array();
    const sampler = new MeshSurfaceSampler({ geometry }).build();
    const posArray = new Float32Array(particleCount * 3);
    const _position = new THREE.Vector3();

    for (let i = 0; i < particleCount; i++) {
      sampler.sample(_position);
      posArray[i * 3] = _position.x;
      posArray[i * 3 + 1] = _position.y;
      posArray[i * 3 + 2] = _position.z;
    }
    return posArray;
  }, [geometry]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, circulation: { value: circulation } },
      vertexShader: `
        uniform float time;
        uniform float circulation;
        void main() {
          vec3 pos = position;
          pos += vec3(
            sin(time*3.0 + position.x*5.0)*0.01*circulation,
            cos(time*2.5 + position.y*5.0)*0.01*circulation,
            sin(time*2.7 + position.z*5.0)*0.01*circulation
          );
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
          gl_PointSize = 2.5 + 2.0*circulation;
        }
      `,
      fragmentShader: `
        uniform float circulation;
        void main() {
          gl_FragColor = vec4(1.0,0.8,0.2,0.5 + 0.5*circulation);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [circulation]);

  useFrame((state) => {
    if (pointsRef.current) material.uniforms.time.value = state.clock.elapsedTime;
    material.uniforms.circulation.value = circulation;
  });

  return (
    <points ref={pointsRef} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
      </bufferGeometry>
    </points>
  );
}

// Heart component
function Heart({ metrics }) {
  const group = useRef();
  const wireRef = useRef();
  const { scene } = useGLTF("/models/realistic_human_heart.glb");

  const mergedMesh = useMemo(() => {
    const geometries = [];
    let material;
    scene.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        const geom = obj.geometry.clone();
        geom.applyMatrix4(obj.matrixWorld);
        geometries.push(geom);
        if (!material) material = obj.material;
      }
    });
    if (!geometries.length) return null;
    const mergedGeometry = mergeGeometries(geometries, true);
    return new THREE.Mesh(mergedGeometry, material);
  }, [scene]);

  const wireframeGeometry = useMemo(() => {
    if (!mergedMesh) return null;
    return new THREE.WireframeGeometry(mergedMesh.geometry);
  }, [mergedMesh]);

  const wireMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const scaleRef = useRef(1);
  useFrame((state) => {
    if (!group.current || !wireRef.current) return;
    const t = state.clock.elapsedTime;
    const { activity = 0.3, mood = 0, circulation = 0.5 } = metrics;

    const targetPulse = 1 + 0.04 * Math.sin(t * 1.2 + activity);
    scaleRef.current = lerp(scaleRef.current, targetPulse, 0.08);
    group.current.scale.setScalar(scaleRef.current);

    const moodNorm = (mood + 1) / 2;
    const hue = lerp(0.65, 0.0, moodNorm);
    const baseColor = new THREE.Color().setHSL(hue, 0.75, 0.55);
    const glowIntensity = lerp(0.2, 1.0, circulation);
    const targetColor = baseColor.clone().multiplyScalar(glowIntensity);

    wireMaterial.color.lerp(targetColor, 0.08);
    wireMaterial.opacity = 0.1 + 0.3 * circulation;
  });

  if (!mergedMesh) return null;

  return (
    <group ref={group} position={[0, -0.1, 0]}>
      <mesh geometry={mergedMesh.geometry}>
        <meshPhysicalMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {wireframeGeometry && <lineSegments geometry={wireframeGeometry} material={wireMaterial} ref={wireRef} />}
      <GPUBloodInside mesh={mergedMesh} traffic={metrics.traffic} />
      <GPUArterySparks geometry={mergedMesh.geometry} circulation={metrics.circulation || 0.5} />
    </group>
  );
}

// Main component
export default function AnatomicalHeart() {
  const [metrics, setMetrics] = React.useState({
    activity: 0.3,
    mood: 0.2,
    traffic: 0.4,
    circulation: 0.5, // new metric for public transit
    social: 0.3,
    energy: 0.2,
  });

  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t += 0.03;
      setMetrics({
        activity: 0.3 + 0.4 * Math.sin(t * 1.2),
        mood: Math.sin(t * 0.7),
        traffic: 0.3 + 0.5 * Math.abs(Math.sin(t * 1.4)),
        circulation: 0.3 + 0.5 * Math.abs(Math.sin(t * 0.9)),
        social: 0.2 + 0.7 * Math.abs(Math.sin(t * 1.1)),
        energy: 0.1 + 0.7 * Math.abs(Math.cos(t * 0.9)),
      });
    }, 60);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    window.setHeartMetrics = (obj) => setMetrics((prev) => ({ ...prev, ...obj }));
    return () => delete window.setHeartMetrics;
  }, []);

  return (
    <div style={{ width: "100%", height: "720px", background: "black" }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 55 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 6, 3]} intensity={0.6} />
        <directionalLight position={[-4, -3, -2]} intensity={0.3} />
        <Suspense fallback={null}>
          <Heart metrics={metrics} />
        </Suspense>
        <OrbitControls enableZoom={true} enablePan={false} minDistance={1.5} maxDistance={6} />
      </Canvas>
    </div>
  );
}
