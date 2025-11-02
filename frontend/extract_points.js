// extract_points.js
// Usage: node extract_points.js public/models/realistic_human_heart.glb extracted_points.json

import fs from "fs";
import path from "path";
import * as THREE from "three";

// 🩸 patch: Node doesn't have "self" (used by GLTFLoader)
globalThis.self = globalThis;

import { GLTFLoader } from "three-stdlib";

// Custom FileLoader that reads from disk
class NodeFileLoader extends THREE.FileLoader {
  load(url, onLoad, onProgress, onError) {
    try {
      const data = fs.readFileSync(url);
      onLoad(data.buffer);
    } catch (err) {
      if (onError) onError(err);
    }
  }
}

async function loadGLB(filePath) {
  const loader = new GLTFLoader();
  loader.fileLoader = new NodeFileLoader(); // override internal loader
  return new Promise((resolve, reject) => {
    const buffer = fs.readFileSync(filePath);
    loader.parse(buffer.buffer, path.dirname(filePath), (gltf) => resolve(gltf), reject);
  });
}

async function main() {
  const file = process.argv[2];
  const outFile = process.argv[3] || "extracted_points.json";

  if (!file) {
    console.error("❌ Usage: node extract_points.js model.glb out.json");
    process.exit(1);
  }

  if (!fs.existsSync(file)) {
    console.error(`❌ File not found: ${file}`);
    process.exit(1);
  }

  console.log(`📦 Loading ${file} ...`);

  try {
    const gltf = await loadGLB(file);
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);

    const results = { meshes: [] };

    scene.traverse((o) => {
      if (o.isMesh && o.geometry) {
        const geom = o.geometry;
        const pos = geom.attributes.position.array;
        const verts = [];

        for (let i = 0; i < pos.length; i += 3) {
          const v = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]);
          v.applyMatrix4(o.matrixWorld);
          verts.push([v.x, v.y, v.z]);
        }

        const bbox = new THREE.Box3().setFromPoints(
          verts.map(([x, y, z]) => new THREE.Vector3(x, y, z))
        );

        results.meshes.push({
          name: o.name || "mesh",
          vertexCount: verts.length,
          bbox: {
            min: [bbox.min.x, bbox.min.y, bbox.min.z],
            max: [bbox.max.x, bbox.max.y, bbox.max.z],
          },
          verts,
        });
      }
    });

    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`✅ Wrote ${outFile}`);
  } catch (err) {
    console.error("❌ Error parsing GLB:", err);
  }
}

main();
