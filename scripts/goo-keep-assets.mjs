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
assert.ok(battlefieldSource.includes("PIPPLO_RIG_TEXTURES"), "Pipplo should load the approved layered raster puppet");
assert.ok(battlefieldSource.includes("buildRasterPipplo"), "Pipplo should assemble authored raster layers rather than runtime geometry");
assert.ok(battlefieldSource.includes("rig-v2-flat"), "Pipplo's shipping rig should use the zero-gradient flat art set");
assert.ok(battlefieldSource.includes("FLAT_GENERAL_RIG_TEXTURES"), "enemy generals should load the authored layered raster rigs");
assert.ok(battlefieldSource.includes("buildRasterGeneral"), "enemy generals should assemble raster layers rather than runtime geometry");
assert.ok(battlefieldSource.includes("seed-flat-v1.png"), "lane units should load the palette-locked flat seeds");
assert.ok(battlefieldSource.includes("UNIT_MOTION_PROFILES"), "lane units should keep character-specific motion profiles");

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
for (const [form, parts] of Object.entries({
  mallow: {
    "hood.png": [467, 666], "body.png": [395, 648], "pom.png": [117, 141], "staff.png": [240, 832],
    "arm-left.png": [110, 234], "arm-right.png": [113, 228], "book.png": [210, 241], "eye-left.png": [64, 61],
    "mouth.png": [71, 34], "eye-right.png": [63, 61], "foot-left-outer.png": [120, 216], "foot-left-inner.png": [113, 218],
    "foot-right-inner.png": [117, 219], "foot-right-outer.png": [119, 216], "cheek-star.png": [75, 75],
  },
  clackback: {
    "staff.png": [166, 464], "body.png": [433, 423], "shell.png": [589, 532], "claw-left.png": [313, 250],
    "claw-right.png": [300, 270], "crown.png": [353, 214], "brow-left.png": [94, 69], "brow-right.png": [94, 71],
    "eye-left.png": [123, 125], "eye-right.png": [120, 125], "mouth.png": [123, 58], "scarf.png": [628, 204],
  },
  puffmaestro: {
    "cap.png": [873, 548], "body.png": [467, 509], "arm-left.png": [312, 158], "arm-right.png": [363, 171],
    "foot-left.png": [131, 86], "foot-right.png": [131, 86], "fan.png": [432, 322], "charm-cord.png": [225, 200],
    "charm-blue.png": [171, 171], "charm-coral.png": [198, 171], "eye-left.png": [47, 65], "eye-right.png": [47, 65],
    "mouth.png": [99, 96], "drop.png": [87, 146],
  },
  thumblestump: {
    "branch-left.png": [285, 291], "branch-center.png": [305, 337], "branch-right.png": [305, 280], "top-rings.png": [382, 135],
    "body.png": [580, 460], "arm-left.png": [201, 287], "arm-right.png": [265, 320], "drum.png": [320, 408],
    "staff.png": [238, 395], "root-left-outer.png": [184, 206], "root-left-inner.png": [167, 210], "root-center.png": [176, 203],
    "root-right-inner.png": [187, 210], "root-right-outer.png": [175, 161], "eye-left.png": [63, 76], "eye-right.png": [68, 76],
    "mouth.png": [178, 76],
  },
  broodle: {
    "ear-left.png": [334, 442], "ear-right.png": [342, 448], "horn-left.png": [71, 93], "horn-right.png": [71, 94],
    "body.png": [465, 565], "arm-left.png": [242, 189], "arm-right.png": [242, 189], "eye-left.png": [65, 84],
    "eye-right.png": [81, 82], "mouth.png": [170, 108], "tail.png": [313, 464], "satchel.png": [460, 390],
    "bell.png": [178, 328], "medal.png": [125, 175], "foot-left.png": [167, 116], "foot-right.png": [210, 119],
  },
})) {
  for (const [part, dimensions] of Object.entries(parts)) {
    expected.set(path.join("characters", "generals-flat", form, "layers", part), dimensions);
  }
}
expected.set(path.join("characters", "generals", "clackback", "clackback-master-v1.png"), 1254);
expected.set(path.join("characters", "generals", "puffmaestro", "puffmaestro-master-v1.png"), 1254);
expected.set(path.join("characters", "generals", "thumblestump", "thumblestump-master-v1.png"), 1254);
expected.set(path.join("characters", "generals", "broodle", "broodle-master-v1.png"), 1254);
expected.set(path.join("characters", "generals", "mallow", "mallow-moon-master-v1.png"), 1254);
expectFrames(path.join("characters", "mallow"), ["idle", "cast", "hurt", "cheer"], 160);

for (const kind of ["piplet", "dartlet", "bubbleBud", "mendlet", "spitlet", "bigChonk"]) {
  expected.set(path.join("units", "friendly", kind, "seed-v1.png"), 160);
  expected.set(path.join("units", "friendly", kind, "seed-flat-v1.png"), 160);
  expectFrames(path.join("units", "friendly", kind), ["attack", "walk"], 160);
}
expected.set(path.join("units", "friendly", "bigChonk", "seed-v2.png"), 160);
for (const kind of ["shellSlime", "nibbleImp", "sporeBud", "boomcap", "echoMoth", "rootLump"]) {
  expected.set(path.join("units", "enemy", kind, "seed-v1.png"), 160);
  expected.set(path.join("units", "enemy", kind, "seed-flat-v1.png"), 160);
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
  if (relative.includes(`${path.sep}rig-v2-flat${path.sep}`) || relative.includes(`${path.sep}generals-flat${path.sep}`) || relative.endsWith("seed-flat-v1.png")) {
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
