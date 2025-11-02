// extract_points.js
// Usage: node extract_points.js path/to/realistic_human_heart.glb out.json
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// Minimal three + GLTFLoader usage in Node via jsdom
const dom = new JSDOM(`<!doctype html><html><body></body></html>`);
global.window = dom.window;
global.document = dom.window.document;
global.THREE = require("three");
require("three/examples/jsm/loaders/GLTFLoader"); // ensures loader installed

const { GLTFLoader } = require("three/examples/jsm/loaders/GLTFLoader");

async function loadGLB(file) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      file,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err)
    );
  });
}

(async () => {
  const file = process.argv[2];
  const outFile = process.argv[3] || "extracted_points.json";
  if (!file) {
    console.error("Usage: node extract_points.js model.glb out.json");
    process.exit(1);
  }
  try {
    const gltf = await loadGLB(file);
    const scene = gltf.scene;
    const results = { meshes: [] };
    scene.updateMatrixWorld(true);

    scene.traverse((o) => {
      if (o.isMesh && o.geometry) {
        const geom = o.geometry;
        // ensure world transform applied to vertices
        const pos = geom.attributes.position.array;
        const verts = [];
        for (let i = 0; i < pos.length; i += 3) {
          const v = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]);
          v.applyMatrix4(o.matrixWorld);
          verts.push([v.x, v.y, v.z]);
        }
        // compute bbox for this mesh
        const bbox = new THREE.Box3().setFromArray(verts.flat());
        results.meshes.push({
          name: o.name || "mesh",
          vertexCount: verts.length,
          verts,
          bbox: {
            min: [bbox.min.x, bbox.min.y, bbox.min.z],
            max: [bbox.max.x, bbox.max.y, bbox.max.z],
          },
        });
      }
    });

    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log("Wrote", outFile);
  } catch (e) {
    console.error("Error:", e);
  }
})();
