import { useEffect, useRef } from "react";
import Phaser from "phaser";
import {
  CASTLE_ENEMY_AFFIX_DEFS,
  CASTLE_UNIT_DEFS,
  getCastleGuardianPower,
  getCastleRegionDef,
  type CastleFxEvent,
  type CastleGuardianPowerId,
  type CastlePowerId,
  type CastleRunState,
  type CastleSide,
  type CastleUnitKind,
  type CastleUnitState,
} from "../castleBattle";

const WORLD_HEIGHT = 300;
const GROUND_Y = 252;

const UNIT_TEXTURES: Partial<Record<CastleUnitKind, string>> = {
  piplet: "units/friendly/piplet/seed-v1.png",
  dartlet: "units/friendly/dartlet/seed-v1.png",
  bubbleBud: "units/friendly/bubbleBud/seed-v1.png",
  mendlet: "units/friendly/mendlet/seed-v1.png",
  spitlet: "units/friendly/spitlet/seed-v1.png",
  bigChonk: "units/friendly/bigChonk/seed-v2.png",
  shellSlime: "units/enemy/shellSlime/seed-v1.png",
  nibbleImp: "units/enemy/nibbleImp/seed-v1.png",
  sporeBud: "units/enemy/sporeBud/seed-v2.png",
  boomcap: "units/enemy/boomcap/seed-v1.png",
  echoMoth: "units/enemy/echoMoth/seed-v2.png",
  rootLump: "units/enemy/rootLump/seed-v2.png",
};

type LeaderForm = "pipplo" | "mallow" | "clackback" | "puffmaestro" | "thumblestump" | "broodle";

const LEADER_TEXTURES: Record<LeaderForm, string> = {
  pipplo: "characters/pipplo/master/pipplo-master-v2.png",
  mallow: "characters/generals/mallow/mallow-moon-master-v1.png",
  clackback: "characters/generals/clackback/clackback-master-v1.png",
  puffmaestro: "characters/generals/puffmaestro/puffmaestro-master-v1.png",
  thumblestump: "characters/generals/thumblestump/thumblestump-master-v1.png",
  broodle: "characters/generals/broodle/broodle-master-v1.png",
};

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PuppetPieceSpec extends CropRect {
  id: string;
  motion: "body" | "arm-left" | "arm-right" | "foot-left" | "foot-right" | "antenna" | "prop" | "crown" | "root";
}

interface PuppetSpec {
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  scale: number;
  core: CropRect;
  pieces: PuppetPieceSpec[];
}

const PUPPET_SPECS: Record<LeaderForm, PuppetSpec> = {
  pipplo: {
    width: 1_254,
    height: 1_254,
    anchorX: 627,
    anchorY: 1_042,
    scale: 0.15,
    core: { x: 318, y: 302, width: 620, height: 702 },
    pieces: [
      { id: "left-arm", motion: "arm-left", x: 226, y: 625, width: 177, height: 205 },
      { id: "right-arm", motion: "arm-right", x: 858, y: 625, width: 177, height: 205 },
      { id: "left-foot", motion: "foot-left", x: 399, y: 910, width: 175, height: 151 },
      { id: "right-foot", motion: "foot-right", x: 679, y: 910, width: 175, height: 151 },
      { id: "antenna", motion: "antenna", x: 520, y: 178, width: 326, height: 210 },
    ],
  },
  mallow: {
    width: 1_254, height: 1_254, anchorX: 638, anchorY: 1_135, scale: 0.143,
    core: { x: 429, y: 238, width: 494, height: 689 },
    pieces: [
      { id: "moon-mantle", motion: "crown", x: 352, y: 194, width: 562, height: 733 },
      { id: "moon-tassel", motion: "antenna", x: 727, y: 235, width: 176, height: 160 },
      { id: "moon-staff", motion: "prop", x: 106, y: 97, width: 333, height: 916 },
      { id: "moon-ledger", motion: "arm-right", x: 852, y: 553, width: 321, height: 302 },
      { id: "moon-hand", motion: "arm-left", x: 278, y: 586, width: 196, height: 186 },
      { id: "moon-tail-left", motion: "foot-left", x: 505, y: 854, width: 201, height: 189 },
      { id: "moon-tail-center", motion: "root", x: 616, y: 865, width: 210, height: 223 },
      { id: "moon-tail-right", motion: "foot-right", x: 748, y: 851, width: 207, height: 194 },
    ],
  },
  clackback: {
    width: 1_254, height: 1_254, anchorX: 638, anchorY: 1_011, scale: 0.14,
    core: { x: 344, y: 505, width: 566, height: 494 },
    pieces: [
      { id: "cantor-shell", motion: "crown", x: 596, y: 253, width: 557, height: 656 },
      { id: "cantor-crown", motion: "antenna", x: 397, y: 317, width: 394, height: 302 },
      { id: "cantor-baton", motion: "prop", x: 63, y: 343, width: 324, height: 550 },
      { id: "cantor-claw-left", motion: "arm-left", x: 178, y: 642, width: 306, height: 263 },
      { id: "cantor-claw-right", motion: "arm-right", x: 653, y: 647, width: 286, height: 278 },
      { id: "cantor-foot-left", motion: "foot-left", x: 375, y: 891, width: 197, height: 126 },
      { id: "cantor-foot-right", motion: "foot-right", x: 648, y: 893, width: 199, height: 126 },
    ],
  },
  puffmaestro: {
    width: 1_254, height: 1_254, anchorX: 632, anchorY: 1_139, scale: 0.137,
    core: { x: 382, y: 548, width: 492, height: 584 },
    pieces: [
      { id: "weather-cap", motion: "crown", x: 285, y: 98, width: 829, height: 650 },
      { id: "weather-fan", motion: "prop", x: 14, y: 458, width: 386, height: 533 },
      { id: "weather-arm-left", motion: "arm-left", x: 226, y: 760, width: 253, height: 239 },
      { id: "weather-arm-right", motion: "arm-right", x: 813, y: 748, width: 235, height: 233 },
      { id: "weather-charms", motion: "antenna", x: 868, y: 772, width: 357, height: 360 },
      { id: "weather-foot-left", motion: "foot-left", x: 398, y: 1_035, width: 199, height: 111 },
      { id: "weather-foot-right", motion: "foot-right", x: 699, y: 1_031, width: 184, height: 114 },
    ],
  },
  thumblestump: {
    width: 1_254, height: 1_254, anchorX: 625, anchorY: 1_174, scale: 0.137,
    core: { x: 302, y: 432, width: 650, height: 621 },
    pieces: [
      { id: "quake-crown", motion: "crown", x: 277, y: 82, width: 702, height: 453 },
      { id: "quake-charms", motion: "antenna", x: 300, y: 276, width: 174, height: 265 },
      { id: "quake-arm-left", motion: "arm-left", x: 116, y: 565, width: 365, height: 333 },
      { id: "quake-arm-right", motion: "arm-right", x: 810, y: 427, width: 331, height: 468 },
      { id: "quake-drum", motion: "prop", x: 382, y: 681, width: 339, height: 311 },
      { id: "quake-roots-left", motion: "foot-left", x: 124, y: 860, width: 523, height: 312 },
      { id: "quake-roots-right", motion: "foot-right", x: 580, y: 850, width: 552, height: 321 },
    ],
  },
  broodle: {
    width: 1_254, height: 1_254, anchorX: 628, anchorY: 1_151, scale: 0.14,
    core: { x: 279, y: 387, width: 615, height: 693 },
    pieces: [
      { id: "brood-ear-left", motion: "antenna", x: 172, y: 86, width: 360, height: 485 },
      { id: "brood-ear-right", motion: "crown", x: 607, y: 101, width: 470, height: 475 },
      { id: "brood-horns", motion: "crown", x: 475, y: 345, width: 199, height: 135 },
      { id: "brood-bell", motion: "prop", x: 96, y: 475, width: 286, height: 350 },
      { id: "brood-arm-right", motion: "arm-right", x: 634, y: 596, width: 250, height: 310 },
      { id: "brood-pouch", motion: "root", x: 298, y: 618, width: 452, height: 431 },
      { id: "brood-tail", motion: "arm-left", x: 783, y: 661, width: 405, height: 430 },
      { id: "brood-foot-left", motion: "foot-left", x: 295, y: 1_015, width: 201, height: 130 },
      { id: "brood-foot-right", motion: "foot-right", x: 635, y: 1_017, width: 195, height: 130 },
    ],
  },
};

const UNIT_PUPPET_SPECS: Record<CastleUnitKind, PuppetSpec> = {
  piplet: {
    width: 160, height: 160, anchorX: 80, anchorY: 148, scale: 0.3,
    core: { x: 33, y: 54, width: 98, height: 98 },
    pieces: [
      { id: "bud", motion: "crown", x: 53, y: 24, width: 58, height: 54 },
      { id: "hand", motion: "arm-left", x: 20, y: 86, width: 56, height: 57 },
    ],
  },
  dartlet: {
    width: 160, height: 160, anchorX: 80, anchorY: 148, scale: 0.34,
    core: { x: 49, y: 67, width: 102, height: 85 },
    pieces: [
      { id: "fins", motion: "root", x: 13, y: 36, width: 80, height: 118 },
      { id: "goggles", motion: "crown", x: 62, y: 49, width: 65, height: 42 },
    ],
  },
  bubbleBud: {
    width: 160, height: 160, anchorX: 80, anchorY: 148, scale: 0.34,
    core: { x: 32, y: 34, width: 108, height: 119 },
    pieces: [
      { id: "left-bubble", motion: "arm-left", x: 17, y: 86, width: 55, height: 57 },
      { id: "right-bubble", motion: "arm-right", x: 112, y: 86, width: 47, height: 54 },
      { id: "top-bubble", motion: "antenna", x: 20, y: 22, width: 45, height: 50 },
    ],
  },
  mendlet: {
    width: 160, height: 160, anchorX: 80, anchorY: 149, scale: 0.36,
    core: { x: 34, y: 54, width: 120, height: 99 },
    pieces: [
      { id: "flower", motion: "antenna", x: 52, y: 4, width: 71, height: 72 },
      { id: "pack", motion: "arm-left", x: 0, y: 63, width: 70, height: 80 },
    ],
  },
  spitlet: {
    width: 160, height: 160, anchorX: 80, anchorY: 149, scale: 0.35,
    core: { x: 24, y: 54, width: 114, height: 99 },
    pieces: [
      { id: "snout", motion: "prop", x: 99, y: 70, width: 61, height: 64 },
      { id: "fin", motion: "crown", x: 31, y: 41, width: 73, height: 53 },
    ],
  },
  bigChonk: {
    width: 160, height: 160, anchorX: 80, anchorY: 150, scale: 0.45,
    core: { x: 24, y: 34, width: 114, height: 120 },
    pieces: [
      { id: "left-chonk-arm", motion: "arm-left", x: 9, y: 72, width: 58, height: 75 },
      { id: "right-chonk-arm", motion: "arm-right", x: 105, y: 68, width: 54, height: 78 },
    ],
  },
  shellSlime: {
    width: 160, height: 160, anchorX: 80, anchorY: 151, scale: 0.38,
    core: { x: 23, y: 79, width: 124, height: 75 },
    pieces: [
      { id: "shell", motion: "crown", x: 8, y: 10, width: 145, height: 112 },
      { id: "claw", motion: "arm-left", x: 0, y: 76, width: 61, height: 70 },
    ],
  },
  nibbleImp: {
    width: 160, height: 160, anchorX: 80, anchorY: 149, scale: 0.34,
    core: { x: 31, y: 52, width: 124, height: 101 },
    pieces: [
      { id: "tail", motion: "arm-left", x: 0, y: 45, width: 68, height: 101 },
      { id: "horns", motion: "crown", x: 72, y: 25, width: 80, height: 57 },
    ],
  },
  sporeBud: {
    width: 160, height: 160, anchorX: 80, anchorY: 150, scale: 0.38,
    core: { x: 35, y: 73, width: 111, height: 81 },
    pieces: [
      { id: "cap", motion: "crown", x: 8, y: 20, width: 145, height: 85 },
      { id: "puff", motion: "prop", x: 104, y: 100, width: 56, height: 55 },
    ],
  },
  boomcap: {
    width: 160, height: 160, anchorX: 80, anchorY: 151, scale: 0.39,
    core: { x: 29, y: 73, width: 112, height: 83 },
    pieces: [
      { id: "cap", motion: "crown", x: 3, y: 22, width: 154, height: 91 },
      { id: "curl", motion: "antenna", x: 17, y: 0, width: 66, height: 73 },
    ],
  },
  echoMoth: {
    width: 160, height: 160, anchorX: 80, anchorY: 148, scale: 0.38,
    core: { x: 63, y: 63, width: 93, height: 91 },
    pieces: [
      { id: "wings", motion: "arm-left", x: 9, y: 38, width: 99, height: 112 },
      { id: "ears", motion: "antenna", x: 74, y: 17, width: 74, height: 67 },
    ],
  },
  rootLump: {
    width: 160, height: 160, anchorX: 80, anchorY: 153, scale: 0.44,
    core: { x: 34, y: 38, width: 116, height: 116 },
    pieces: [
      { id: "roots", motion: "root", x: 0, y: 83, width: 85, height: 77 },
      { id: "branch", motion: "crown", x: 74, y: 0, width: 86, height: 91 },
    ],
  },
};

interface BattlefieldProps {
  run: CastleRunState;
  reducedMotion?: boolean;
  pipploPulseSerial?: number;
}

function parseHex(color: string, fallback: number): number {
  const normalized = color.trim().replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return Number.isFinite(value) ? value : fallback;
}

function textureKey(kind: CastleUnitKind): string {
  return `goo-unit-${kind}`;
}

function leaderTextureKey(form: LeaderForm): string {
  return `goo-leader-${form}`;
}

function getLeaderForm(side: CastleSide, region: number, guardianPowerId: CastleGuardianPowerId | null): LeaderForm {
  if (side === "player") return "pipplo";
  const powerId = guardianPowerId ?? getCastleGuardianPower(region).id;
  if (powerId === "shellReprisal") return "clackback";
  if (powerId === "sporeWeather") return "puffmaestro";
  if (powerId === "rootQuake") return "thumblestump";
  if (powerId === "broodCall") return "broodle";
  return "mallow";
}

class PuppetBone {
  readonly node: Phaser.GameObjects.Container;
  readonly motion: PuppetPieceSpec["motion"] | "body";
  readonly baseX: number;
  readonly baseY: number;
  private x: number;
  private y: number;
  private angle = 0;
  private vx = 0;
  private vy = 0;
  private angularVelocity = 0;

  constructor(
    scene: Phaser.Scene,
    texture: string,
    frameName: string,
    rect: CropRect,
    motion: PuppetBone["motion"],
    spec: PuppetSpec,
  ) {
    const source = scene.textures.get(texture);
    if (!source.has(frameName)) source.add(frameName, 0, rect.x, rect.y, rect.width, rect.height);
    const image = scene.add.image(0, 0, texture, frameName).setScale(spec.scale);
    this.baseX = ((rect.x + rect.width * 0.5) - spec.anchorX) * spec.scale;
    this.baseY = ((rect.y + rect.height * 0.5) - spec.anchorY) * spec.scale;
    this.x = this.baseX;
    this.y = this.baseY;
    this.motion = motion;
    this.node = scene.add.container(this.x, this.y, [image]);
  }

  update(offsetX: number, offsetY: number, targetAngle: number, deltaSeconds: number, motionScale: number): void {
    const targetX = this.baseX + offsetX * motionScale;
    const targetY = this.baseY + offsetY * motionScale;
    this.vx += (targetX - this.x) * 76 * deltaSeconds;
    this.vy += (targetY - this.y) * 76 * deltaSeconds;
    this.angularVelocity += (targetAngle * motionScale - this.angle) * 68 * deltaSeconds;
    const damping = Math.pow(0.0008, deltaSeconds);
    this.vx *= damping;
    this.vy *= damping;
    this.angularVelocity *= Math.pow(0.0015, deltaSeconds);
    this.x += this.vx * deltaSeconds;
    this.y += this.vy * deltaSeconds;
    this.angle += this.angularVelocity * deltaSeconds;
    this.node.setPosition(this.x, this.y).setAngle(this.angle);
  }

  impulse(x: number, y: number, angle: number): void {
    this.vx += x;
    this.vy += y;
    this.angularVelocity += angle;
  }

  setSquash(x: number, y: number): void {
    this.node.setScale(x, y);
  }
}

class PuppetLeader {
  private readonly side: CastleSide;
  private readonly form: LeaderForm;
  private readonly root: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly core: PuppetBone;
  private readonly pieces: PuppetBone[];
  private readonly homeX: number;
  private reaction = 0;
  private summonPulse = 0;
  private phase = 0;
  private hpRatio = 1;

  constructor(scene: Phaser.Scene, side: CastleSide, region: number, viewportWidth: number, guardianPowerId: CastleGuardianPowerId | null = null) {
    this.side = side;
    this.form = getLeaderForm(side, region, guardianPowerId);
    const edge = Math.max(72, Math.min(104, viewportWidth * 0.095));
    this.homeX = side === "player" ? edge : viewportWidth - edge;
    const spec = PUPPET_SPECS[this.form];
    const texture = leaderTextureKey(this.form);
    const prefix = `leader-${this.form}`;
    this.shadow = scene.add.ellipse(this.homeX, GROUND_Y + 2, this.form === "pipplo" ? 112 : 98, 18, 0x244c4f, 0.2).setDepth(14);
    this.root = scene.add.container(this.homeX, GROUND_Y).setDepth(18);
    this.core = new PuppetBone(scene, texture, `${prefix}-core`, spec.core, "body", spec);
    this.pieces = spec.pieces.map(piece => new PuppetBone(scene, texture, `${prefix}-${piece.id}`, piece, piece.motion, spec));
    this.root.add([this.core.node, ...this.pieces.map(piece => piece.node)]);
    this.root.setScale(side === "enemy" ? -1 : 1, 1);
  }

  setHp(current: number, max: number): void {
    this.hpRatio = Phaser.Math.Clamp(current / Math.max(1, max), 0, 1);
  }

  hit(): void {
    this.reaction = 1;
    const shove = this.side === "player" ? -45 : 45;
    this.core.impulse(shove, 12, -45);
    this.pieces.forEach((piece, index) => piece.impulse(shove * (0.65 + index * 0.08), Phaser.Math.Between(-26, 18), Phaser.Math.Between(-150, 150)));
  }

  summon(): void {
    this.summonPulse = 1;
    this.core.impulse(0, -24, 0);
    this.pieces.forEach((piece, index) => piece.impulse(index % 2 === 0 ? -24 : 24, -32, index % 2 === 0 ? -120 : 120));
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  update(deltaSeconds: number, live: boolean, reducedMotion: boolean): void {
    this.phase += deltaSeconds * (live ? 2.75 : 0.9);
    this.reaction = Math.max(0, this.reaction - deltaSeconds * 2.5);
    this.summonPulse = Math.max(0, this.summonPulse - deltaSeconds * 2.8);
    const motionScale = reducedMotion ? 0.25 : 1;
    const healthDroop = (1 - this.hpRatio) * 9;
    const bob = Math.sin(this.phase * 1.15) * 2.6 * motionScale;
    const squash = Math.sin(this.phase * 2) * 0.025 * motionScale;
    const facing = this.side === "enemy" ? -1 : 1;
    this.root
      .setPosition(this.homeX + facing * (this.summonPulse * 7 - this.reaction * 8), GROUND_Y + bob + healthDroop)
      .setScale(facing * (1 + squash + this.summonPulse * 0.05), 1 - squash - this.summonPulse * 0.035 + this.reaction * 0.04)
      .setAngle(Math.sin(this.phase * 0.55) * 1.2 * motionScale + facing * this.reaction * 5);
    this.shadow.setPosition(this.homeX, GROUND_Y + 3).setScale(1 - Math.abs(bob) / 26 + this.summonPulse * 0.1, 1);
    this.core.update(0, Math.sin(this.phase * 1.6) * 0.7, this.reaction * facing * 2.5, deltaSeconds, motionScale);
    this.core.setSquash(1 + squash * 0.8, 1 - squash * 0.55);
    for (const piece of this.pieces) {
      const wave = Math.sin(this.phase + piece.baseX * 0.035);
      switch (piece.motion) {
        case "arm-left":
          piece.update(-2 - this.summonPulse * 8, wave * 3 - this.summonPulse * 8, -8 - wave * 9 - this.summonPulse * 24, deltaSeconds, motionScale);
          break;
        case "arm-right":
          piece.update(2 + this.summonPulse * 8, -wave * 3 - this.summonPulse * 8, 8 + wave * 9 + this.summonPulse * 24, deltaSeconds, motionScale);
          break;
        case "foot-left":
          piece.update(-1.5, Math.max(0, wave) * 3, -wave * 4, deltaSeconds, motionScale);
          piece.setSquash(1 + Math.max(0, -wave) * 0.06 * motionScale, 1 - Math.max(0, -wave) * 0.06 * motionScale);
          break;
        case "foot-right":
          piece.update(1.5, Math.max(0, -wave) * 3, wave * 4, deltaSeconds, motionScale);
          piece.setSquash(1 + Math.max(0, wave) * 0.06 * motionScale, 1 - Math.max(0, wave) * 0.06 * motionScale);
          break;
        case "antenna":
          piece.update(wave * 2.5, -Math.abs(wave) * 2 - this.summonPulse * 5, wave * 7 + this.summonPulse * 8, deltaSeconds, motionScale);
          break;
        case "prop":
          piece.update(wave * 2, -Math.abs(wave) * 1.5, wave * 5 - this.summonPulse * 13, deltaSeconds, motionScale);
          break;
        case "crown":
          piece.update(wave * 1.4, -Math.abs(wave) * 3 - this.summonPulse * 4, wave * 3.5, deltaSeconds, motionScale);
          break;
        case "root":
          piece.update(wave * 2, Math.max(0, wave) * 2, wave * 2.5, deltaSeconds, motionScale);
          break;
        default:
          piece.update(0, 0, 0, deltaSeconds, motionScale);
      }
    }
  }

  destroy(): void {
    this.root.destroy(true);
    this.shadow.destroy();
  }
}

class UnitRig {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly artRoot: Phaser.GameObjects.Container;
  private readonly core: PuppetBone;
  private readonly pieces: PuppetBone[];
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly badge: Phaser.GameObjects.Text;
  private readonly side: CastleSide;
  private readonly kind: CastleUnitKind;
  private readonly barY: number;
  private x: number;
  private y: number;
  private vx = 0;
  private phase = Math.random() * Math.PI * 2;
  private lastHp: number;
  private attackSignal = 0;

  constructor(scene: Phaser.Scene, unit: CastleUnitState, spawnX: number) {
    this.scene = scene;
    this.side = unit.side;
    this.kind = unit.kind;
    this.x = spawnX;
    this.y = GROUND_Y + 1;
    this.lastHp = unit.hp;
    const spec = UNIT_PUPPET_SPECS[unit.kind];
    const texture = textureKey(unit.kind);
    const prefix = `unit-${unit.kind}`;
    this.shadow = scene.add.ellipse(0, 3, unit.kind === "rootLump" || unit.kind === "bigChonk" ? 58 : 45, 11, 0x163f46, 0.19);
    this.artRoot = scene.add.container(0, 0);
    this.core = new PuppetBone(scene, texture, `${prefix}-core`, spec.core, "body", spec);
    this.pieces = spec.pieces.map(piece => new PuppetBone(scene, texture, `${prefix}-${piece.id}`, piece, piece.motion, spec));
    this.artRoot.add([this.core.node, ...this.pieces.map(piece => piece.node)]).setScale(unit.side === "enemy" ? -1 : 1, 1);
    this.hpBar = scene.add.graphics();
    this.barY = unit.kind === "rootLump" || unit.kind === "bigChonk" ? -76 : -61;
    this.badge = scene.add.text(0, this.barY - 9, "", { fontFamily: "Nunito, sans-serif", fontSize: "9px", fontStyle: "bold", color: "#ffffff", stroke: "#194f53", strokeThickness: 3 }).setOrigin(0.5);
    this.container = scene.add.container(this.x, this.y, [this.shadow, this.artRoot, this.hpBar, this.badge]).setDepth(12);
    this.container.setScale(0.18);
    scene.tweens.add({ targets: this.container, scaleX: 1, scaleY: 1, duration: 420, ease: "Back.Out" });
  }

  update(unit: CastleUnitState, targetX: number, deltaSeconds: number, live: boolean, reducedMotion: boolean): void {
    const motion = reducedMotion ? 0.35 : 1;
    this.vx += (targetX - this.x) * 35 * deltaSeconds;
    this.vx *= Math.pow(0.012, deltaSeconds);
    this.x += this.vx * deltaSeconds;
    this.phase += deltaSeconds * (live ? 5.2 : 1.1);
    if (unit.hp < this.lastHp) {
      this.scene.tweens.add({ targets: this.artRoot, alpha: 0.25, yoyo: true, duration: 70, repeat: 1, onComplete: () => this.artRoot.setAlpha(1) });
      this.container.x += this.side === "player" ? -8 : 8;
      this.core.impulse(this.side === "player" ? -32 : 32, 6, this.side === "player" ? -80 : 80);
      this.pieces.forEach((piece, index) => piece.impulse(index % 2 ? 22 : -22, -14, index % 2 ? 90 : -90));
    }
    this.lastHp = unit.hp;
    if (unit.attackCooldownMs > CASTLE_UNIT_DEFS[unit.kind].attackMs - 170 && this.attackSignal <= 0) {
      this.attackSignal = 0.2;
    }
    this.attackSignal = Math.max(0, this.attackSignal - deltaSeconds);
    const bob = Math.sin(this.phase) * 3 * motion;
    const lunge = this.attackSignal > 0 ? Math.sin((this.attackSignal / 0.2) * Math.PI) * 12 * (this.side === "player" ? 1 : -1) : 0;
    const stretch = Math.min(0.12, Math.abs(this.vx) / 650) * motion;
    this.container.setPosition(this.x + lunge, this.y + bob);
    const facing = this.side === "enemy" ? -1 : 1;
    this.artRoot
      .setScale(facing * (1 + stretch + (this.attackSignal > 0 ? 0.1 : 0)), 1 - stretch * 0.65 - (this.attackSignal > 0 ? 0.08 : 0))
      .setAngle(Math.sin(this.phase * 0.5) * 2.5 * motion + Phaser.Math.Clamp(this.vx / 75, -7, 7));
    this.core.update(0, Math.sin(this.phase * 1.4) * 0.7, 0, deltaSeconds, motion);
    for (const piece of this.pieces) {
      const wave = Math.sin(this.phase + piece.baseX * 0.08);
      if (piece.motion === "arm-left") piece.update(-2.5, wave * 3, -wave * 11 - this.attackSignal * 42, deltaSeconds, motion);
      else if (piece.motion === "arm-right") piece.update(2.5, -wave * 3, wave * 11 + this.attackSignal * 42, deltaSeconds, motion);
      else if (piece.motion === "antenna") piece.update(wave * 2, -Math.abs(wave) * 2, wave * 9, deltaSeconds, motion);
      else if (piece.motion === "prop") piece.update(this.attackSignal * 8, wave * 2, wave * 6 + this.attackSignal * 25, deltaSeconds, motion);
      else if (piece.motion === "crown") piece.update(wave, -Math.abs(wave) * 2.5, wave * 4, deltaSeconds, motion);
      else if (piece.motion === "root") piece.update(-Math.abs(wave) * 1.5, Math.max(0, wave) * 2, wave * 3, deltaSeconds, motion);
      else piece.update(0, 0, 0, deltaSeconds, motion);
    }
    this.shadow.setScale(1 - Math.abs(bob) / 18, 1);
    this.drawStatus(unit);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private drawStatus(unit: CastleUnitState): void {
    const width = 42;
    const hpRatio = Phaser.Math.Clamp(unit.hp / Math.max(1, unit.maxHp), 0, 1);
    this.hpBar.clear();
    this.hpBar.fillStyle(0xffffff, 0.82).fillRoundedRect(-width / 2, this.barY, width, 5, 2);
    this.hpBar.fillStyle(unit.side === "player" ? 0x62bd61 : 0xe96885, 1).fillRoundedRect(-width / 2, this.barY, width * hpRatio, 5, 2);
    if (unit.shield > 0) this.hpBar.lineStyle(2, 0x79d5ef, 0.9).strokeEllipse(0, -27, this.kind === "rootLump" || this.kind === "bigChonk" ? 70 : 57, this.kind === "rootLump" || this.kind === "bigChonk" ? 75 : 60);
    const affix = unit.affix ? CASTLE_ENEMY_AFFIX_DEFS[unit.affix] : null;
    const labels = [unit.overfed ? "★" : "", unit.origin === "wild" ? "◌" : ""].filter(Boolean);
    this.badge.setColor(affix?.accent || "#ffffff");
    this.badge.setText(labels.join(""));
  }
}

class GooKeepScene extends Phaser.Scene {
  private snapshot: CastleRunState;
  private readonly reducedMotion: boolean;
  private background?: Phaser.GameObjects.Graphics;
  private player?: PuppetLeader;
  private enemy?: PuppetLeader;
  private unitRigs = new Map<string, UnitRig>();
  private handledFxIds = new Set<number>();
  private battleKey = "";
  private viewWidth = 1_000;
  private viewHeight = WORLD_HEIGHT;
  private lastPhase: CastleRunState["phase"];

  constructor(snapshot: CastleRunState, reducedMotion: boolean) {
    super({ key: "goo-keep-battlefield" });
    this.snapshot = snapshot;
    this.reducedMotion = reducedMotion;
    this.lastPhase = snapshot.phase;
  }

  setSnapshot(snapshot: CastleRunState): void {
    this.snapshot = snapshot;
  }

  pulsePipplo(): void {
    this.player?.summon();
  }

  preload(): void {
    for (const [kind, path] of Object.entries(UNIT_TEXTURES)) {
      this.load.image(textureKey(kind as CastleUnitKind), `${import.meta.env.BASE_URL}assets/goo-keep/${path}`);
    }
    for (const [form, path] of Object.entries(LEADER_TEXTURES)) {
      this.load.image(leaderTextureKey(form as LeaderForm), `${import.meta.env.BASE_URL}assets/goo-keep/${path}`);
    }
  }

  create(): void {
    this.viewWidth = Math.max(320, this.scale.width);
    this.viewHeight = Math.max(180, this.scale.height);
    this.cameras.main.setZoom(1, this.viewHeight / WORLD_HEIGHT);
    this.background = this.add.graphics().setDepth(0);
    this.rebuildLeaders();
  }

  update(_time: number, delta: number): void {
    if (!this.background || !this.player || !this.enemy) return;
    const deltaSeconds = Phaser.Math.Clamp(delta / 1_000, 0, 0.05);
    if (Math.abs(this.viewWidth - this.scale.width) > 1) {
      this.viewWidth = Math.max(320, this.scale.width);
      this.rebuildLeaders();
    }
    if (Math.abs(this.viewHeight - this.scale.height) > 1) {
      this.viewHeight = Math.max(180, this.scale.height);
      this.cameras.main.setZoom(1, this.viewHeight / WORLD_HEIGHT);
    }
    const key = `${this.snapshot.region}:${this.snapshot.battle.battleNumber}`;
    if (key !== this.battleKey) this.rebuildLeaders();
    if (this.snapshot.phase !== this.lastPhase) {
      if (this.snapshot.phase === "reward") this.playDevourCelebration();
      this.lastPhase = this.snapshot.phase;
    }
    this.drawBackground();
    this.player.setHp(this.snapshot.battle.playerCastleHp, this.snapshot.battle.playerCastleMaxHp);
    this.enemy.setHp(this.snapshot.battle.enemyCastleHp, this.snapshot.battle.enemyCastleMaxHp);
    const live = this.snapshot.battle.mode === "study";
    this.player.update(deltaSeconds, live, this.reducedMotion);
    this.enemy.update(deltaSeconds, live, this.reducedMotion);
    this.syncUnits(deltaSeconds, live);
    this.syncFx();
  }

  private rebuildLeaders(): void {
    this.player?.destroy();
    this.enemy?.destroy();
    this.player = new PuppetLeader(this, "player", this.snapshot.region, this.viewWidth);
    this.enemy = new PuppetLeader(this, "enemy", this.snapshot.region, this.viewWidth, this.snapshot.battle.guardianPowerId);
    this.battleKey = `${this.snapshot.region}:${this.snapshot.battle.battleNumber}`;
    for (const rig of this.unitRigs.values()) rig.destroy();
    this.unitRigs.clear();
    this.handledFxIds.clear();
  }

  private drawBackground(): void {
    if (!this.background) return;
    const region = getCastleRegionDef(this.snapshot.region);
    const skyTop = parseHex(region.skyTop, 0x86d5dd);
    const skyBottom = parseHex(region.skyBottom, 0xdaf0c8);
    const ground = parseHex(region.ground, 0xf3d98b);
    const far = parseHex(region.hillFar, 0xa8d683);
    const near = parseHex(region.hillNear, 0x83c36d);
    const road = parseHex(region.roadTop, 0xf3d395);
    const width = this.viewWidth;
    const motif = ((this.snapshot.region - 1) % 3 + 3) % 3;
    this.background.clear();
    this.background.fillGradientStyle(skyTop, skyTop, skyBottom, skyBottom, 1).fillRect(0, 0, width, WORLD_HEIGHT);
    this.background.fillStyle(parseHex(region.sun, 0xfff59a), 0.18).fillCircle(width * 0.53, 76, 52);
    this.background.fillStyle(parseHex(region.sun, 0xfff59a), 0.95).fillCircle(width * 0.53, 76, 34);
    this.background.fillStyle(0xffffff, 0.34)
      .fillEllipse(width * 0.2, 76, 82, 24)
      .fillEllipse(width * 0.24, 70, 54, 31)
      .fillEllipse(width * 0.78, 105, 94, 25)
      .fillEllipse(width * 0.74, 99, 46, 28);
    if (motif === 2) {
      this.background.fillStyle(0x533f72, 0.28)
        .fillTriangle(0, 0, width * 0.2, 0, width * 0.08, 58)
        .fillTriangle(width * 0.73, 0, width, 0, width * 0.91, 68);
      for (let index = 0; index < 6; index += 1) {
        const glowX = width * (0.18 + index * 0.13);
        this.background.fillStyle(index % 2 ? 0xf4a8d2 : 0xffdc72, 0.2).fillCircle(glowX, 138 + (index % 3) * 13, 13);
        this.background.fillStyle(index % 2 ? 0xf4a8d2 : 0xffdc72, 0.72).fillCircle(glowX, 138 + (index % 3) * 13, 4);
      }
    }
    this.background.fillStyle(far, 1).fillEllipse(width * 0.25, 230, width * 0.64, 160).fillEllipse(width * 0.76, 226, width * 0.7, 165);
    this.background.fillStyle(near, 1).fillEllipse(width * 0.16, 259, width * 0.53, 155).fillEllipse(width * 0.82, 257, width * 0.62, 155);
    if (motif === 0) {
      for (const treeX of [width * 0.14, width * 0.86]) {
        this.background.lineStyle(8, 0x52764f, 0.55).lineBetween(treeX, 223, treeX, 158);
        this.background.fillStyle(treeX < width * 0.5 ? 0xf2a4c5 : 0x7ac8b7, 0.85)
          .fillCircle(treeX - 15, 156, 22)
          .fillCircle(treeX + 12, 151, 26)
          .fillCircle(treeX + 3, 132, 20);
      }
    } else if (motif === 1) {
      for (const treeX of [width * 0.18, width * 0.82]) {
        this.background.lineStyle(7, 0x2d7a78, 0.62).beginPath().moveTo(treeX, 225).lineTo(treeX, 152).lineTo(treeX - 24, 127).strokePath();
        this.background.lineBetween(treeX, 169, treeX + 29, 141);
        this.background.fillStyle(0x80d6cf, 0.85).fillCircle(treeX - 25, 124, 13).fillCircle(treeX + 31, 138, 16).fillCircle(treeX, 145, 12);
      }
      this.background.fillStyle(0x4f8170, 0.7).fillEllipse(width * 0.5, 144, 94, 24);
      this.background.fillStyle(0x8fd37a, 0.92).fillEllipse(width * 0.5, 137, 92, 21);
      this.background.fillStyle(0xe8d072, 0.9).fillCircle(width * 0.48, 124, 4).fillCircle(width * 0.52, 128, 5);
    } else {
      for (const mushroomX of [width * 0.13, width * 0.89]) {
        this.background.fillStyle(0xe5d6bd, 0.8).fillRoundedRect(mushroomX - 4, 184, 8, 39, 4);
        this.background.fillStyle(mushroomX < width * 0.5 ? 0xd982b8 : 0x8a72bd, 0.9).fillEllipse(mushroomX, 181, 42, 19);
      }
    }
    this.background.fillStyle(ground, 1).fillRect(0, 215, width, 85);
    this.background.fillStyle(road, 1).fillEllipse(width * 0.5, 270, width * 0.84, 98);
    this.background.lineStyle(4, 0xffffff, 0.3).strokeEllipse(width * 0.5, 269, width * 0.84, 94);
    this.background.fillStyle(0x204f51, 0.14).fillEllipse(width * 0.08, 254, 130, 24).fillEllipse(width * 0.92, 254, 145, 25);
    for (let index = 0; index < 13; index += 1) {
      const x = width * (0.11 + index * 0.065);
      const y = 231 + Math.sin(index * 2.2) * 6;
      this.background.fillStyle(index % 3 === 0 ? 0xf09cbd : index % 2 === 0 ? 0xffffff : 0xf2e06d, 0.72).fillCircle(x, y, 2 + (index % 3));
    }
  }

  private syncUnits(deltaSeconds: number, live: boolean): void {
    const activeIds = new Set(this.snapshot.battle.units.map(unit => unit.id));
    for (const [id, rig] of this.unitRigs) {
      if (!activeIds.has(id)) {
        this.tweens.add({ targets: rig, duration: 1, onComplete: () => rig.destroy() });
        this.unitRigs.delete(id);
      }
    }
    for (const unit of this.snapshot.battle.units) {
      let rig = this.unitRigs.get(unit.id);
      if (!rig) {
        rig = new UnitRig(this, unit, this.leaderX(unit.side));
        this.unitRigs.set(unit.id, rig);
        if (unit.side === "player") this.player?.summon(); else this.enemy?.summon();
      }
      rig.update(unit, this.laneX(unit.position), deltaSeconds, live, this.reducedMotion);
    }
  }

  private syncFx(): void {
    for (const event of this.snapshot.battle.fxEvents) {
      if (this.handledFxIds.has(event.id)) continue;
      this.handledFxIds.add(event.id);
      this.playFx(event);
    }
    if (this.handledFxIds.size > 160) {
      const latest = Math.max(...this.handledFxIds);
      this.handledFxIds = new Set(Array.from(this.handledFxIds).filter(id => id > latest - 80));
    }
  }

  private playFx(event: CastleFxEvent): void {
    const x = this.laneX(event.position);
    const fromX = this.laneX(event.fromPosition ?? event.position);
    if ((event.kind === "hit" || event.kind === "projectile") && event.position <= 3) this.player?.hit();
    if ((event.kind === "hit" || event.kind === "projectile") && event.position >= 97) this.enemy?.hit();
    if (event.powerId) {
      this.playPowerFx(event.powerId, x, fromX);
      return;
    }
    if (event.kind === "power" && event.side === "enemy") this.playGeneralFx(event, x);
    if (event.kind === "projectile") {
      const orb = this.add.circle(fromX, GROUND_Y - 55, 8, event.side === "player" ? 0x68ead8 : 0xe392ee, 1).setDepth(30);
      this.tweens.add({ targets: orb, x, y: GROUND_Y - 48, scale: 1.5, duration: this.reducedMotion ? 160 : 380, ease: "Sine.In", onComplete: () => { this.burst(x, GROUND_Y - 48, event.side === "player" ? 0x68ead8 : 0xe392ee, 7); orb.destroy(); } });
    } else if (event.kind === "heal" || event.kind === "shield") {
      const ring = this.add.circle(x, GROUND_Y - 40, 16).setStrokeStyle(5, event.kind === "heal" ? 0x78dc83 : 0x79d5ef, 0.9).setDepth(30);
      this.tweens.add({ targets: ring, y: GROUND_Y - 86, scale: 2.1, alpha: 0, duration: 620, onComplete: () => ring.destroy() });
    } else if (event.kind === "hit" || event.kind === "pop") {
      this.burst(x, GROUND_Y - 42, event.kind === "pop" ? 0xef86ae : 0xffe66d, event.kind === "pop" ? 10 : 6);
    } else if (event.kind === "power") {
      this.burst(x, GROUND_Y - 52, event.side === "player" ? 0xffd86a : 0xd58ce6, 12);
    }
    if (event.label) {
      const label = this.add.text(x, GROUND_Y - 74, event.label, { fontFamily: "Nunito, sans-serif", fontSize: "17px", fontStyle: "bold", color: "#ffffff", stroke: "#194f53", strokeThickness: 5 }).setOrigin(0.5).setDepth(40);
      this.tweens.add({ targets: label, y: label.y - 34, alpha: 0, duration: 760, ease: "Cubic.Out", onComplete: () => label.destroy() });
    }
  }

  private playPowerFx(powerId: CastlePowerId, x: number, fromX: number): void {
    const duration = this.reducedMotion ? 220 : 620;
    if (powerId === "slingshot") {
      for (let index = 0; index < 3; index += 1) {
        const seed = this.add.circle(this.leaderX("player"), 170 + index * 6, 7 - index, 0xffd35e).setDepth(32);
        this.tweens.add({ targets: seed, x, y: 165 - index * 24, duration, delay: index * 70, ease: "Quad.Out", yoyo: true, onComplete: () => { this.burst(x, GROUND_Y - 45, 0xffd35e, 5); seed.destroy(); } });
      }
    } else if (powerId === "bubbleGate") {
      for (let index = 0; index < 5; index += 1) {
        const bubble = this.add.circle(this.leaderX("player") + Phaser.Math.Between(-35, 35), 230, 11 + index * 3).setStrokeStyle(4, 0x83e7f4, 0.8).setDepth(31);
        this.tweens.add({ targets: bubble, y: 95 + index * 10, alpha: 0, scale: 1.8, duration: duration + index * 80, onComplete: () => bubble.destroy() });
      }
    } else if (powerId === "snackCannon") {
      for (let index = 0; index < 8; index += 1) {
        const snack = this.add.rectangle(this.leaderX("player"), 165, 10, 7, index % 2 ? 0xf29a69 : 0xf4d65a).setAngle(index * 22).setDepth(32);
        this.tweens.add({ targets: snack, x: this.laneX(index * 14), y: 205 - Math.sin((index / 7) * Math.PI) * 90, angle: index * 140, duration: duration + index * 28, ease: "Sine.Out", onComplete: () => snack.destroy() });
      }
    } else if (powerId === "gooMoat") {
      for (let index = 0; index < 7; index += 1) {
        const puddle = this.add.ellipse(this.laneX(22 + index * 10), GROUND_Y + 4, 18, 7, 0x63c5a5, 0.55).setDepth(5);
        this.tweens.add({ targets: puddle, scaleX: 4.2, scaleY: 2, alpha: 0.15, duration: 800, yoyo: true, hold: 900, onComplete: () => puddle.destroy() });
      }
    } else if (powerId === "timewobble") {
      for (let index = 0; index < 4; index += 1) {
        const clock = this.add.circle(x, GROUND_Y - 50, 20 + index * 12).setStrokeStyle(5, 0xcf9be2, 0.72).setDepth(31);
        const hand = this.add.rectangle(x, GROUND_Y - 50, 3, 18 + index * 4, 0xffffff, 0.85).setOrigin(0.5, 1).setDepth(32);
        this.tweens.add({ targets: [clock, hand], angle: 270, scale: 1.5, alpha: 0, duration: duration + index * 90, onComplete: () => { clock.destroy(); hand.destroy(); } });
      }
    } else if (powerId === "tongueSnatch") {
      const tongue = this.add.graphics().setDepth(35).lineStyle(10, 0xf08ab2, 1);
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(this.leaderX("player"), 185),
        new Phaser.Math.Vector2((fromX + this.leaderX("player")) / 2, 120),
        new Phaser.Math.Vector2(fromX, GROUND_Y - 45),
      );
      tongue.strokePoints(curve.getPoints(28), false);
      this.tweens.add({ targets: tongue, alpha: 0, scaleX: 0.08, duration, ease: "Cubic.In", onComplete: () => tongue.destroy() });
    } else {
      for (let index = 0; index < 6; index += 1) {
        const spore = this.add.circle(this.leaderX("player"), 168, 8 + (index % 3) * 2, index % 2 ? 0xd991c4 : 0x8dd47a).setDepth(33);
        this.tweens.add({ targets: spore, x: this.laneX(40 + index * 9), y: 145 - Math.sin((index / 5) * Math.PI) * 95, scale: 1.7, duration: duration + index * 55, ease: "Quad.Out", yoyo: true, onComplete: () => { this.burst(spore.x, GROUND_Y - 35, 0xd991c4, 7); spore.destroy(); } });
      }
    }
  }

  private playGeneralFx(event: CastleFxEvent, x: number): void {
    const label = event.label || "";
    if (label.includes("Shell")) {
      for (let index = 0; index < 4; index += 1) {
        const shell = this.add.arc(this.laneX(58 + index * 9), GROUND_Y - 43, 22, 190, 350, false).setStrokeStyle(7, 0x8dd8ec, 0.85).setDepth(29);
        this.tweens.add({ targets: shell, scale: 1.7, alpha: 0, duration: 680 + index * 60, onComplete: () => shell.destroy() });
      }
    } else if (label.includes("Spore")) {
      for (let index = 0; index < 14; index += 1) {
        const spore = this.add.circle(this.laneX(index * 7.5), 82 + (index % 3) * 12, 5 + (index % 4), index % 2 ? 0xd58ac4 : 0x96c976, 0.8).setDepth(31);
        this.tweens.add({ targets: spore, y: GROUND_Y - 12, x: spore.x + Phaser.Math.Between(-20, 20), alpha: 0, duration: 720 + index * 28, ease: "Sine.In", onComplete: () => spore.destroy() });
      }
    } else if (label.includes("Root")) {
      this.cameras.main.shake(this.reducedMotion ? 80 : 260, this.reducedMotion ? 0.002 : 0.008);
      const cracks = this.add.graphics().setDepth(28).lineStyle(6, 0x765039, 0.8);
      for (let index = 0; index < 7; index += 1) {
        const crackX = this.laneX(12 + index * 13);
        cracks.beginPath().moveTo(crackX, GROUND_Y + 14).lineTo(crackX + 12, GROUND_Y - 5).lineTo(crackX - 2, GROUND_Y - 18).strokePath();
      }
      this.tweens.add({ targets: cracks, alpha: 0, duration: 720, onComplete: () => cracks.destroy() });
    } else if (label.includes("Moon")) {
      const moon = this.add.circle(this.leaderX("enemy"), 72, 26, 0xe4c5f1, 0.92).setDepth(31);
      this.tweens.add({ targets: moon, x: this.leaderX("player"), y: 174, scale: 0.5, duration: 540, ease: "Cubic.In", onComplete: () => { this.burst(this.leaderX("player"), 174, 0xd88ee8, 10); moon.destroy(); } });
    } else {
      for (let index = 0; index < 5; index += 1) {
        const pulse = this.add.circle(this.leaderX("enemy"), 184, 14 + index * 8).setStrokeStyle(5, 0xe9909b, 0.75).setDepth(29);
        this.tweens.add({ targets: pulse, scale: 1.8, alpha: 0, duration: 520 + index * 75, onComplete: () => pulse.destroy() });
      }
    }
    this.burst(x, GROUND_Y - 50, 0xd58ce6, 8);
  }

  private playDevourCelebration(): void {
    const startX = this.leaderX("enemy");
    const targetX = this.leaderX("player");
    this.enemy?.hit();
    for (let index = 0; index < 16; index += 1) {
      const morsel = this.add.circle(startX + Phaser.Math.Between(-30, 30), 175 + Phaser.Math.Between(-35, 35), Phaser.Math.Between(4, 9), index % 3 === 0 ? 0xffdc72 : index % 2 === 0 ? 0x80d6a1 : 0xe78abf, 0.95).setDepth(42);
      this.tweens.add({
        targets: morsel,
        x: targetX,
        y: 175,
        scale: 0.15,
        duration: this.reducedMotion ? 260 : 620,
        delay: index * (this.reducedMotion ? 12 : 36),
        ease: "Cubic.In",
        onComplete: () => {
          if (index === 15) {
            this.enemy?.setVisible(false);
            this.player?.summon();
            this.burst(targetX, 175, 0xffdc72, 14);
          }
          morsel.destroy();
        },
      });
    }
  }

  private burst(x: number, y: number, color: number, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const size = Phaser.Math.Between(3, 7);
      const particle = index % 3 === 0
        ? this.add.star(x, y, 5, Math.max(1.5, size * 0.45), size, color, 0.92).setDepth(36)
        : this.add.ellipse(x, y, size * 1.25, size * 1.7, color, 0.9).setDepth(36).setAngle(index * 37);
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.45;
      const distance = Phaser.Math.Between(22, 54);
      this.tweens.add({ targets: particle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, angle: particle.angle + (index % 2 ? 110 : -110), scale: 0.1, alpha: 0, duration: this.reducedMotion ? 240 : 520, ease: "Quad.Out", onComplete: () => particle.destroy() });
    }
  }

  private leaderX(side: CastleSide): number {
    const edge = Math.max(72, Math.min(104, this.viewWidth * 0.095));
    return side === "player" ? edge : this.viewWidth - edge;
  }

  private laneX(position: number): number {
    const padding = Math.max(92, Math.min(136, this.viewWidth * 0.15));
    return Phaser.Math.Linear(padding, this.viewWidth - padding, Phaser.Math.Clamp(position / 100, 0, 1));
  }
}

export function GooKeepBattlefield({ run, reducedMotion = false, pipploPulseSerial = 0 }: BattlefieldProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GooKeepScene | null>(null);
  const initialRunRef = useRef(run);
  const lastPipploPulseRef = useRef(pipploPulseSerial);

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const scene = new GooKeepScene(initialRunRef.current, reducedMotion);
    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: hostRef.current,
      width: Math.max(320, hostRef.current.clientWidth),
      height: Math.max(180, hostRef.current.clientHeight),
      backgroundColor: "#9edddd",
      transparent: false,
      render: { antialias: true, pixelArt: false, roundPixels: false },
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
      scene: [scene],
      audio: { noAudio: true },
      banner: false,
    });
    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, [reducedMotion]);

  useEffect(() => {
    sceneRef.current?.setSnapshot(run);
  }, [run]);

  useEffect(() => {
    if (pipploPulseSerial !== lastPipploPulseRef.current) sceneRef.current?.pulsePipplo();
    lastPipploPulseRef.current = pipploPulseSerial;
  }, [pipploPulseSerial]);

  const friendly = run.battle.units.filter(unit => unit.side === "player").length;
  const enemies = run.battle.units.length - friendly;
  return (
    <div
      ref={hostRef}
      className="goo-keep-phaser-host"
      role="img"
      aria-label={`${getCastleRegionDef(run.region).name} live battlefield. Pipplo has ${Math.ceil(run.battle.playerCastleHp)} health. The enemy general has ${Math.ceil(run.battle.enemyCastleHp)} health. ${friendly} friendly and ${enemies} enemy minions are active.`}
    />
  );
}
