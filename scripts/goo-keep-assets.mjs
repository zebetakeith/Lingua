import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";


const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = path.join(repoRoot, "public", "assets", "goo-keep");
const expected = new Map();
const battlefieldSource = await readFile(path.join(repoRoot, "src", "experiments", "phaser", "GooKeepBattlefield.tsx"), "utf8");

assert.ok(battlefieldSource.includes("FLAT_LEADER_STYLES"), "battlefield leaders should use the flat articulated rig");
assert.ok(!battlefieldSource.includes("const PUPPET_SPECS"), "leaders must not return to rectangular crops of complete painted characters");
assert.ok(!battlefieldSource.includes("leaderTextureKey"), "moving leader bodies must not be assembled from raster master crops");
assert.ok(battlefieldSource.includes("maxDisplacement"), "articulated unit pieces need hard movement limits so they cannot tear away");
assert.ok(battlefieldSource.includes('get("rigAction")'), "leader action poses need a deterministic visual-QA route");
assert.ok(battlefieldSource.includes('get("unitAction")'), "unit action poses need a deterministic visual-QA route");
assert.ok(battlefieldSource.includes('get("reducedMotion")'), "reduced-motion sprite poses need a deterministic visual-QA route");
assert.ok(battlefieldSource.includes("PIPPLO_HYBRID_IDLE_FRAME_COUNT"), "Pipplo should load the cohesive hybrid idle strip");
assert.ok(battlefieldSource.includes("buildHybridPipplo"), "Pipplo should animate complete authored frames rather than live limb pieces");
assert.ok(!battlefieldSource.includes("buildRasterPipplo"), "Pipplo must not return to the independent runtime limb puppet");
assert.ok(battlefieldSource.includes("hybrid-idle"), "Pipplo's shipping idle should use the palette-locked hybrid frame set");

function expectFrames(relativeRoot, animations, size) {
  for (const animation of animations) {
    for (let frame = 1; frame <= 4; frame += 1) {
      expected.set(path.join(relativeRoot, animation, `0${frame}.png`), size);
    }
  }
}

expectFrames(path.join("characters", "pipplo"), ["idle", "cast", "hurt", "cheer"], 192);
expected.set(path.join("characters", "pipplo", "master", "pipplo-master-v2.png"), 1254);
for (const [part, dimensions] of Object.entries({
  "body.png": [591, 699],
  "arm-left.png": [155, 231],
  "arm-right.png": [149, 222],
  "foot-left.png": [165, 121],
  "foot-right.png": [165, 120],
  "antenna-stem.png": [167, 141],
  "antenna-pom.png": [162, 153],
  "eye-left.png": [114, 116],
  "eye-right.png": [113, 115],
  "pupil-left.png": [78, 77],
  "pupil-right.png": [77, 77],
  "mouth.png": [179, 129],
  "cheek-small.png": [70, 70],
  "cheek-large.png": [70, 70],
})) {
  expected.set(path.join("characters", "pipplo", "rig-v2-flat", "layers", part), dimensions);
}
for (let frame = 1; frame <= 12; frame += 1) {
  expected.set(path.join("characters", "pipplo", "hybrid-idle", `${frame.toString().padStart(2, "0")}.png`), 192);
}
expected.set(path.join("characters", "generals", "clackback", "clackback-master-v1.png"), 1254);
expected.set(path.join("characters", "generals", "puffmaestro", "puffmaestro-master-v1.png"), 1254);
expected.set(path.join("characters", "generals", "thumblestump", "thumblestump-master-v1.png"), 1254);
expected.set(path.join("characters", "generals", "broodle", "broodle-master-v1.png"), 1254);
expected.set(path.join("characters", "generals", "mallow", "mallow-moon-master-v1.png"), 1254);
expectFrames(path.join("characters", "mallow"), ["idle", "cast", "hurt", "cheer"], 160);

for (const kind of ["piplet", "dartlet", "bubbleBud", "mendlet", "spitlet", "bigChonk"]) {
  expected.set(path.join("units", "friendly", kind, "seed-v1.png"), 160);
  expectFrames(path.join("units", "friendly", kind), ["attack", "walk"], 160);
}
expected.set(path.join("units", "friendly", "bigChonk", "seed-v2.png"), 160);
for (const kind of ["shellSlime", "nibbleImp", "sporeBud", "boomcap", "echoMoth", "rootLump"]) {
  expected.set(path.join("units", "enemy", kind, "seed-v1.png"), 160);
  expectFrames(path.join("units", "enemy", kind), ["attack", "walk"], 160);
}
expected.set(path.join("units", "enemy", "sporeBud", "seed-v2.png"), 160);
expected.set(path.join("units", "enemy", "echoMoth", "seed-v2.png"), 160);
expected.set(path.join("units", "enemy", "rootLump", "seed-v2.png"), 160);

async function collectPngs(directory, relative = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const childRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await collectPngs(path.join(directory, entry.name), childRelative));
    else if (entry.isFile() && entry.name.endsWith(".png")) files.push(childRelative);
  }
  return files;
}

const actual = await collectPngs(assetRoot);
assert.equal(actual.length, expected.size, "the shipping sprite set should match the audited roster");
for (const [relative, expectedSize] of expected) {
  const filename = path.join(assetRoot, relative);
  const fileStat = await stat(filename);
  assert.ok(fileStat.size > 100, `${relative} must not be empty`);
  if (relative.includes(`${path.sep}rig-v2-flat${path.sep}`) || relative.includes(`${path.sep}hybrid-idle${path.sep}`)) {
    assert.ok(fileStat.size < 20_000, `${relative} should remain flat-color art without baked texture or gradient data`);
  }
  const bytes = await readFile(filename);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${relative} must be a PNG`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const expectedDimensions = Array.isArray(expectedSize) ? expectedSize : [expectedSize, expectedSize];
  assert.deepEqual([width, height], expectedDimensions, `${relative} must keep its normalized canvas`);
}
for (const relative of actual) assert.ok(expected.has(relative), `${relative} is not represented in the shipping audit`);

process.stdout.write(`Goo Keep asset assertions passed (${actual.length} PNGs).\n`);
