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

type PipploAnimation = "idle" | "summon" | "hit" | "devour";

const PIPPLO_ANIMATIONS: Record<PipploAnimation, { frames: number; fps: number; loop: boolean }> = {
  idle: { frames: 16, fps: 8, loop: true },
  summon: { frames: 8, fps: 8.5, loop: false },
  hit: { frames: 12, fps: 14, loop: false },
  devour: { frames: 16, fps: 11, loop: false },
};

function pipploTextureKey(animation: PipploAnimation, frame: number): string {
  return `pipplo-whole-sprite-${animation}-${frame.toString().padStart(2, "0")}`;
}

const FRIENDLY_UNIT_KINDS = new Set<CastleUnitKind>(["piplet", "dartlet", "bubbleBud", "mendlet", "spitlet", "bigChonk"]);

type LeaderForm = "pipplo" | "mallow" | "clackback" | "puffmaestro" | "thumblestump" | "broodle";

interface FlatLeaderStyle {
  bodyColor: number;
  outlineColor: number;
  accentColor: number;
  bodyWidth: number;
  bodyHeight: number;
  bodyY: number;
  faceY: number;
  eyeSpacing: number;
}

const FLAT_LEADER_STYLES: Record<LeaderForm, FlatLeaderStyle> = {
  pipplo: { bodyColor: 0xf2df28, outlineColor: 0xb49f16, accentColor: 0xf0648b, bodyWidth: 104, bodyHeight: 118, bodyY: -62, faceY: -76, eyeSpacing: 36 },
  mallow: { bodyColor: 0xb8b2e5, outlineColor: 0x6f679f, accentColor: 0xf1cf62, bodyWidth: 88, bodyHeight: 104, bodyY: -58, faceY: -65, eyeSpacing: 28 },
  clackback: { bodyColor: 0x8b78bd, outlineColor: 0x55477e, accentColor: 0xf1c65f, bodyWidth: 102, bodyHeight: 94, bodyY: -52, faceY: -59, eyeSpacing: 31 },
  puffmaestro: { bodyColor: 0xf0dfbb, outlineColor: 0x76624f, accentColor: 0xcb5f91, bodyWidth: 78, bodyHeight: 92, bodyY: -49, faceY: -54, eyeSpacing: 25 },
  thumblestump: { bodyColor: 0xa66d45, outlineColor: 0x67452f, accentColor: 0x8eb84c, bodyWidth: 100, bodyHeight: 104, bodyY: -57, faceY: -66, eyeSpacing: 30 },
  broodle: { bodyColor: 0x8c6eb2, outlineColor: 0x554171, accentColor: 0xf08986, bodyWidth: 84, bodyHeight: 98, bodyY: -53, faceY: -61, eyeSpacing: 27 },
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

function getLeaderForm(side: CastleSide, region: number, guardianPowerId: CastleGuardianPowerId | null): LeaderForm {
  if (side === "player") return "pipplo";
  if (import.meta.env.DEV) {
    const previewForm = new URLSearchParams(window.location.search).get("leader");
    if (previewForm && previewForm in FLAT_LEADER_STYLES) return previewForm as LeaderForm;
  }
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
    const maxDisplacement = this.motion === "body" ? 3.5 : this.motion === "prop" ? 6 : 5;
    const clampedX = Phaser.Math.Clamp(this.x, this.baseX - maxDisplacement, this.baseX + maxDisplacement);
    const clampedY = Phaser.Math.Clamp(this.y, this.baseY - maxDisplacement, this.baseY + maxDisplacement);
    const clampedAngle = Phaser.Math.Clamp(this.angle, -24, 24);
    if (clampedX !== this.x) this.vx = 0;
    if (clampedY !== this.y) this.vy = 0;
    if (clampedAngle !== this.angle) this.angularVelocity = 0;
    this.x = clampedX;
    this.y = clampedY;
    this.angle = clampedAngle;
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

type FlatJointRole = "arm" | "leg" | "antenna" | "ear" | "prop" | "tail" | "crown";

interface FlatJoint {
  node: Phaser.GameObjects.Container;
  role: FlatJointRole;
  side: -1 | 0 | 1;
  baseX: number;
  baseY: number;
  baseAngle: number;
  phaseOffset: number;
  angle: number;
}

class PuppetLeader {
  private readonly side: CastleSide;
  private readonly form: LeaderForm;
  private readonly style: FlatLeaderStyle;
  private readonly root: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly homeX: number;
  private readonly visualScale: number;
  private readonly joints: FlatJoint[] = [];
  private readonly eyeSockets: Phaser.GameObjects.Container[] = [];
  private readonly pupils: Array<Phaser.GameObjects.Ellipse | Phaser.GameObjects.Image> = [];
  private bodyRoot!: Phaser.GameObjects.Container;
  private faceRoot!: Phaser.GameObjects.Container;
  private mouthRoot!: Phaser.GameObjects.Container;
  private pipploSprite?: Phaser.GameObjects.Image;
  private pipploAnimation: PipploAnimation = "idle";
  private pipploClock = 0;
  private pipploFrame = -1;
  private reaction = 0;
  private summonPulse = 0;
  private eatPulse = 0;
  private phase = 0;
  private hpRatio = 1;

  constructor(scene: Phaser.Scene, side: CastleSide, region: number, viewportWidth: number, guardianPowerId: CastleGuardianPowerId | null = null) {
    this.side = side;
    this.form = getLeaderForm(side, region, guardianPowerId);
    this.style = FLAT_LEADER_STYLES[this.form];
    const edge = Math.max(72, Math.min(104, viewportWidth * 0.095));
    this.homeX = side === "player" ? edge : viewportWidth - edge;
    this.visualScale = Phaser.Math.Clamp(viewportWidth / 620, 0.64, 1);
    this.shadow = scene.add.ellipse(this.homeX, GROUND_Y + 3, this.form === "pipplo" ? 108 : 96, 18, 0x244c4f, 0.2).setDepth(14);
    this.root = scene.add.container(this.homeX, GROUND_Y).setDepth(18);
    this.buildCharacter(scene);
    this.root.setScale((side === "enemy" ? -1 : 1) * this.visualScale, this.visualScale);
  }

  private outlinedEllipse(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number, outline = this.style.outlineColor): Phaser.GameObjects.Ellipse {
    return scene.add.ellipse(x, y, width, height, color, 1).setStrokeStyle(3, outline, 0.94);
  }

  private outlinedCircle(scene: Phaser.Scene, x: number, y: number, radius: number, color: number, outline = this.style.outlineColor): Phaser.GameObjects.Arc {
    return scene.add.circle(x, y, radius, color, 1).setStrokeStyle(3, outline, 0.94);
  }

  private addJoint(scene: Phaser.Scene, role: FlatJointRole, side: -1 | 0 | 1, x: number, y: number, baseAngle = 0, phaseOffset = 0): Phaser.GameObjects.Container {
    const node = scene.add.container(x, y);
    this.root.add(node);
    this.joints.push({ node, role, side, baseX: x, baseY: y, baseAngle, phaseOffset, angle: baseAngle });
    return node;
  }

  private addOvalLimb(scene: Phaser.Scene, role: FlatJointRole, side: -1 | 1, x: number, y: number, width: number, height: number, color = this.style.bodyColor, baseAngle = 0, phaseOffset = 0): Phaser.GameObjects.Container {
    const node = this.addJoint(scene, role, side, x, y, baseAngle, phaseOffset);
    const childX = role === "leg" ? side * 3 : side * width * 0.3;
    const childY = role === "leg" ? height * 0.28 : height * 0.18;
    node.add(this.outlinedEllipse(scene, childX, childY, width, height, color));
    return node;
  }

  private buildWholeSpritePipplo(scene: Phaser.Scene): void {
    this.pipploSprite = scene.add.image(0, 0, pipploTextureKey("idle", 1)).setOrigin(0.5, 246 / 256).setScale(0.75).setFlipX(true);
    this.root.add(this.pipploSprite);
  }

  private buildCharacter(scene: Phaser.Scene): void {
    const style = this.style;

    if (this.form === "pipplo") {
      this.buildWholeSpritePipplo(scene);
      return;
    }
    if (this.form === "clackback") {
      const shell = this.addJoint(scene, "crown", 1, 19, -68, 8, 0.7);
      shell.add(this.outlinedEllipse(scene, 15, -5, 72, 84, 0xe9c79d, 0x9f6d62));
      const spiral = scene.add.graphics().lineStyle(4, 0xc78875, 0.9);
      spiral.beginPath().moveTo(11, -22).lineTo(28, -28).lineTo(40, -16).lineTo(39, 3).lineTo(23, 16).lineTo(8, 10).strokePath();
      shell.add(spiral);
      const leftClaw = this.addOvalLimb(scene, "arm", -1, -47, -61, 38, 27, style.bodyColor, -12, 0.3);
      const rightClaw = this.addOvalLimb(scene, "arm", 1, 47, -61, 38, 27, style.bodyColor, 12, 2.3);
      leftClaw.add(this.outlinedCircle(scene, -20, 4, 11, 0xa88dd5));
      rightClaw.add(this.outlinedCircle(scene, 20, 4, 11, 0xa88dd5));
      this.addOvalLimb(scene, "leg", -1, -28, -9, 30, 17, style.bodyColor, -2, 0.1);
      this.addOvalLimb(scene, "leg", 1, 28, -9, 30, 17, style.bodyColor, 2, 3.1);
      const crown = this.addJoint(scene, "crown", 0, -7, -102, -4, 1.6);
      crown.add([
        scene.add.triangle(-13, 4, 0, 22, 9, 0, 17, 22, style.accentColor).setStrokeStyle(3, 0x9c7424, 0.9),
        scene.add.triangle(9, 3, 0, 21, 9, -2, 18, 21, style.accentColor).setStrokeStyle(3, 0x9c7424, 0.9),
      ]);
      const baton = this.addJoint(scene, "prop", -1, -56, -70, -13, 2.4);
      baton.add([
        scene.add.rectangle(-15, 21, 6, 58, 0x7e513d).setStrokeStyle(2, 0x523426, 1),
        this.outlinedCircle(scene, -20, -10, 9, style.accentColor, 0x9c7424),
      ]);
    } else if (this.form === "puffmaestro") {
      this.addOvalLimb(scene, "arm", -1, -35, -61, 27, 19, 0xb7c778, -9, 0.2);
      this.addOvalLimb(scene, "arm", 1, 35, -61, 27, 19, 0xb7c778, 9, 2.4);
      this.addOvalLimb(scene, "leg", -1, -22, -8, 25, 16, style.bodyColor, -2, 0.1);
      this.addOvalLimb(scene, "leg", 1, 22, -8, 25, 16, style.bodyColor, 2, 3.2);
      const cap = this.addJoint(scene, "crown", 0, 0, -91, 0, 1.4);
      cap.add([
        this.outlinedEllipse(scene, 0, -8, 116, 56, 0x7b4b92, 0x50345f),
        this.outlinedCircle(scene, -28, -14, 9, 0xe96d7d, 0x9e3f57),
        this.outlinedCircle(scene, 9, -23, 11, 0xe96d7d, 0x9e3f57),
        this.outlinedCircle(scene, 32, -8, 7, 0xf0a16d, 0xa55c42),
      ]);
      const fan = this.addJoint(scene, "prop", -1, -42, -64, -12, 2.1);
      const fanLeaf = scene.add.graphics().fillStyle(0x7bc2aa, 1).lineStyle(3, 0x42796c, 0.95);
      fanLeaf.beginPath().moveTo(-7, 8).lineTo(-36, -8).lineTo(-31, 22).lineTo(-5, 31).closePath().fillPath().strokePath();
      fan.add([fanLeaf, scene.add.rectangle(-5, 33, 5, 30, 0x74503b).setAngle(-10)]);
      const charms = this.addJoint(scene, "antenna", 1, 40, -51, 4, 0.8);
      charms.add([
        scene.add.rectangle(8, 13, 3, 34, 0x735b47),
        this.outlinedCircle(scene, 8, 31, 6, 0x69b9ac, 0x39746e),
      ]);
    } else if (this.form === "mallow") {
      this.addOvalLimb(scene, "arm", -1, -40, -65, 29, 20, style.bodyColor, -8, 0.5);
      this.addOvalLimb(scene, "arm", 1, 40, -65, 29, 20, style.bodyColor, 8, 2.5);
      this.addOvalLimb(scene, "leg", -1, -26, -12, 31, 27, style.bodyColor, -2, 0.1);
      this.addOvalLimb(scene, "leg", 1, 26, -12, 31, 27, style.bodyColor, 2, 3.2);
      const tail = this.addJoint(scene, "tail", 0, 0, -10, 0, 1.8);
      tail.add(this.outlinedEllipse(scene, 0, 12, 30, 33, style.bodyColor));
      const tassel = this.addJoint(scene, "antenna", 1, 26, -111, 8, 1.1);
      tassel.add([scene.add.rectangle(3, -12, 5, 26, style.accentColor), this.outlinedCircle(scene, 8, -28, 7, 0xf09b85, 0xa85853)]);
      const staff = this.addJoint(scene, "prop", -1, -62, -64, -6, 2.4);
      staff.add([
        scene.add.rectangle(-13, 13, 6, 79, 0x765038).setStrokeStyle(2, 0x4c3328, 1),
        scene.add.arc(-13, -31, 13, 62, 298, false).setStrokeStyle(5, style.accentColor, 1),
      ]);
      const ledger = this.addJoint(scene, "prop", 1, 43, -57, 9, 0.5);
      ledger.add(scene.add.rectangle(15, 8, 26, 32, 0x6f5b9d).setStrokeStyle(3, 0x47396c, 1));
    } else if (this.form === "thumblestump") {
      this.addOvalLimb(scene, "arm", -1, -48, -66, 35, 23, style.bodyColor, -10, 0.3);
      this.addOvalLimb(scene, "arm", 1, 48, -66, 35, 23, style.bodyColor, 10, 2.2);
      this.addOvalLimb(scene, "leg", -1, -29, -11, 42, 20, 0x805438, -3, 0.1);
      this.addOvalLimb(scene, "leg", 1, 29, -11, 42, 20, 0x805438, 3, 3.1);
      const branches = this.addJoint(scene, "crown", 0, 0, -108, 0, 1.3);
      const branchArt = scene.add.graphics().lineStyle(9, 0x6c4931, 1);
      branchArt.beginPath().moveTo(0, 20).lineTo(-4, -26).lineTo(-25, -46).moveTo(-4, -20).lineTo(21, -39).moveTo(16, -35).lineTo(31, -57).strokePath();
      branchArt.fillStyle(0x8eb84c, 1).fillCircle(-27, -48, 10).fillCircle(23, -41, 11).fillCircle(33, -59, 8);
      branches.add(branchArt);
    } else {
      this.addOvalLimb(scene, "arm", -1, -40, -64, 29, 21, style.bodyColor, -9, 0.3);
      this.addOvalLimb(scene, "arm", 1, 40, -64, 29, 21, style.bodyColor, 9, 2.3);
      this.addOvalLimb(scene, "leg", -1, -23, -9, 27, 18, style.bodyColor, -2, 0.1);
      this.addOvalLimb(scene, "leg", 1, 23, -9, 27, 18, style.bodyColor, 2, 3.2);
      const leftEar = this.addJoint(scene, "ear", -1, -23, -99, -10, 0.2);
      const rightEar = this.addJoint(scene, "ear", 1, 23, -99, 10, 2.5);
      leftEar.add([this.outlinedEllipse(scene, -8, -31, 27, 69, style.bodyColor), scene.add.ellipse(-8, -32, 10, 43, 0xe9a1aa)]);
      rightEar.add([this.outlinedEllipse(scene, 8, -31, 27, 69, style.bodyColor), scene.add.ellipse(8, -32, 10, 43, 0xe9a1aa)]);
      const tail = this.addJoint(scene, "tail", 1, 40, -43, 15, 1.4);
      tail.add(this.outlinedEllipse(scene, 19, 2, 40, 24, style.accentColor, 0xa6545d));
      const bell = this.addJoint(scene, "prop", -1, -44, -64, -10, 2.1);
      bell.add([this.outlinedCircle(scene, -15, 13, 12, style.accentColor, 0xa6545d), scene.add.circle(-15, 23, 4, 0xf1cf62)]);
    }

    const body = this.outlinedEllipse(scene, 0, 0, style.bodyWidth, style.bodyHeight, style.bodyColor);
    this.bodyRoot = scene.add.container(0, style.bodyY, [body]);
    this.root.add(this.bodyRoot);
    this.decorateBody(scene);
    this.buildFace(scene);
  }

  private decorateBody(scene: Phaser.Scene): void {
    const style = this.style;
    if (this.form === "pipplo") {
      this.bodyRoot.add([
        scene.add.circle(31, 17, 6, style.accentColor),
        scene.add.circle(39, 1, 5, style.accentColor),
      ]);
    } else if (this.form === "mallow") {
      this.bodyRoot.add(scene.add.arc(-22, 20, 10, 70, 290, false).setStrokeStyle(4, style.accentColor, 1));
    } else if (this.form === "clackback") {
      this.bodyRoot.add([
        scene.add.circle(-31, 13, 7, 0xa690d4),
        scene.add.circle(32, 14, 7, 0xa690d4),
      ]);
    } else if (this.form === "puffmaestro") {
      this.bodyRoot.add([scene.add.circle(-22, 20, 5, 0xd9bd83), scene.add.circle(25, 13, 6, 0xb7c778)]);
    } else if (this.form === "thumblestump") {
      const rings = scene.add.graphics().lineStyle(3, 0x7a4e34, 0.72);
      rings.lineBetween(-25, -34, 22, -37).lineBetween(-32, 7, 28, 4);
      this.bodyRoot.add([
        rings,
        this.outlinedEllipse(scene, 0, 29, 48, 35, 0xd29b58, 0x765039),
      ]);
    } else if (this.form === "broodle") {
      this.bodyRoot.add([
        scene.add.ellipse(-17, 23, 24, 30, 0x72578f),
        scene.add.circle(26, 13, 6, style.accentColor),
      ]);
    }
  }

  private buildFace(scene: Phaser.Scene): void {
    const style = this.style;
    this.faceRoot = scene.add.container(0, style.faceY);
    const eyeWidth = this.form === "mallow" ? 12 : 14;
    const eyeHeight = this.form === "mallow" ? 14 : 16;
    for (const side of [-1, 1] as const) {
      const socket = scene.add.container(side * style.eyeSpacing * 0.5, 0);
      const white = this.outlinedEllipse(scene, 0, 0, eyeWidth, eyeHeight, 0xfffdf1, 0x514851);
      const pupil = scene.add.ellipse(0, 1, 6, 8, 0x2d2933);
      socket.add([white, pupil]);
      this.faceRoot.add(socket);
      this.eyeSockets.push(socket);
      this.pupils.push(pupil);
    }
    const mouthWidth = this.form === "mallow" ? 13 : 21;
    const mouthHeight = this.form === "mallow" ? 14 : 13;
    const mouth = this.outlinedEllipse(scene, 0, 18, mouthWidth, mouthHeight, 0x49303d, 0x49303d);
    const tongue = scene.add.ellipse(2, 22, mouthWidth * 0.55, mouthHeight * 0.42, 0xf1789b);
    this.mouthRoot = scene.add.container(0, 0, [mouth, tongue]);
    this.faceRoot.add(this.mouthRoot);
    if (this.form !== "mallow") {
      this.faceRoot.add([
        scene.add.circle(-style.eyeSpacing * 0.72, 12, 4, 0xee8295, 0.78),
        scene.add.circle(style.eyeSpacing * 0.72, 12, 4, 0xee8295, 0.78),
      ]);
    }
    this.root.add(this.faceRoot);
  }

  setHp(current: number, max: number): void {
    this.hpRatio = Phaser.Math.Clamp(current / Math.max(1, max), 0, 1);
  }

  hit(): void {
    this.reaction = 1;
    this.playPipploAction("hit");
  }

  summon(): void {
    this.summonPulse = 1;
    this.playPipploAction("summon");
  }

  devour(): void {
    this.eatPulse = 1;
    this.playPipploAction("devour");
  }

  private playPipploAction(animation: Exclude<PipploAnimation, "idle">): void {
    if (!this.pipploSprite) return;
    this.pipploAnimation = animation;
    this.pipploClock = 0;
    this.pipploFrame = -1;
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  update(deltaSeconds: number, live: boolean, reducedMotion: boolean): void {
    this.phase += deltaSeconds * (live ? 2.45 : 0.82);
    this.reaction = Math.max(0, this.reaction - deltaSeconds * 3.4);
    this.summonPulse = Math.max(0, this.summonPulse - deltaSeconds * 3.2);
    this.eatPulse = Math.max(0, this.eatPulse - deltaSeconds * 2.15);
    const motionScale = reducedMotion ? 0.24 : 1;
    const healthDroop = (1 - this.hpRatio) * 7;
    const bob = Math.sin(this.phase * 1.12) * 2.2 * motionScale;
    const squash = Math.sin(this.phase * 1.9) * 0.018 * motionScale;
    const facing = this.side === "enemy" ? -1 : 1;
    const reactionShove = this.reaction * 4 * facing;
    if (this.pipploSprite) {
      const config = PIPPLO_ANIMATIONS[this.pipploAnimation];
      const clockRate = this.pipploAnimation === "idle" ? (live ? 1 : 0.5) : 1;
      this.pipploClock += deltaSeconds * clockRate;
      const duration = config.frames / config.fps;
      if (!config.loop && this.pipploClock >= duration) {
        this.pipploAnimation = "idle";
        this.pipploClock = 0;
        this.pipploFrame = -1;
      }
      const activeConfig = PIPPLO_ANIMATIONS[this.pipploAnimation];
      const playbackFps = this.pipploAnimation === "idle" && reducedMotion ? 3.5 : activeConfig.fps;
      const activeDuration = activeConfig.frames / activeConfig.fps;
      const actionProgress = activeConfig.loop ? 0 : Phaser.Math.Clamp(this.pipploClock / activeDuration, 0, 1);
      const nextFrame = reducedMotion && !activeConfig.loop
        ? (actionProgress < 0.55 ? 2 : activeConfig.frames)
        : activeConfig.loop
          ? Math.floor(this.pipploClock * playbackFps) % activeConfig.frames + 1
          : Math.min(activeConfig.frames, Math.floor(this.pipploClock * playbackFps) + 1);
      if (nextFrame !== this.pipploFrame) {
        this.pipploFrame = nextFrame;
        this.pipploSprite.setTexture(pipploTextureKey(this.pipploAnimation, nextFrame));
      }

      // High-frame authored poses do the acting; these tiny 60fps transforms
      // bridge the poses so the complete sprite still feels soft and elastic.
      const idleWave = Math.sin(this.pipploClock * Math.PI * 2) * motionScale;
      const actionEnvelope = activeConfig.loop ? 0 : Math.sin(actionProgress * Math.PI) * motionScale;
      const bridgeWobble = activeConfig.loop
        ? idleWave
        : Math.sin(actionProgress * Math.PI * 5) * actionEnvelope;
      const bridgeScaleX = 1 + (activeConfig.loop ? idleWave * 0.006 : bridgeWobble * 0.012);
      const bridgeScaleY = 1 - (activeConfig.loop ? idleWave * 0.005 : bridgeWobble * 0.009);
      const bridgeLift = activeConfig.loop ? Math.max(0, idleWave) * 0.8 : actionEnvelope * 1.8;
      this.root
        .setPosition(this.homeX, GROUND_Y + healthDroop - bridgeLift)
        .setScale(
          facing * this.visualScale * bridgeScaleX,
          this.visualScale * bridgeScaleY,
        )
        .setAngle(bridgeWobble * 0.55 * facing);
      this.shadow
        .setPosition(this.homeX, GROUND_Y + 3)
        .setScale(this.visualScale * (1 - bridgeLift * 0.015), this.visualScale * (1 - bridgeLift * 0.008));
      return;
    }
    this.root
      .setPosition(this.homeX + this.summonPulse * 3 * facing - reactionShove, GROUND_Y + bob + healthDroop - this.summonPulse * 3 - this.eatPulse * 4)
      .setScale(
        facing * this.visualScale * (1 + squash + this.summonPulse * 0.025 + this.eatPulse * 0.055),
        this.visualScale * (1 - squash - this.summonPulse * 0.018 + this.reaction * 0.018 - this.eatPulse * 0.04),
      )
      .setAngle(Math.sin(this.phase * 0.5) * 0.8 * motionScale + this.reaction * 2.8 * facing);
    this.shadow.setPosition(this.homeX, GROUND_Y + 3).setScale(this.visualScale * (1 - Math.abs(bob) / 28 + this.summonPulse * 0.05), this.visualScale);
    this.bodyRoot.setScale(1 + squash * 0.8, 1 - squash * 0.6);

    const turn = Math.sin(this.phase * 0.34) * motionScale;
    const turnAmount = Math.abs(turn);
    const eyeSpread = this.style.eyeSpacing * (1 - turnAmount * 0.24);
    this.faceRoot.setPosition(turn * this.style.bodyWidth * 0.12, this.style.faceY + Math.sin(this.phase * 0.8) * 0.45 * motionScale + this.eatPulse * 2);
    this.faceRoot.setScale(1 - turnAmount * 0.08, 1);
    this.eyeSockets[0].setPosition(-eyeSpread * 0.5 + turn * 1.8, 0).setAlpha(turn > 0 ? 1 - turnAmount * 0.42 : 1);
    this.eyeSockets[1].setPosition(eyeSpread * 0.5 + turn * 1.8, 0).setAlpha(turn < 0 ? 1 - turnAmount * 0.42 : 1);
    const blinkClock = this.phase % 6.2;
    const blink = blinkClock > 5.92 ? Math.max(0.14, Math.abs(blinkClock - 6.06) / 0.14) : 1;
    const expressionScale = blink * (1 - this.reaction * 0.48);
    for (const pupil of this.pupils) pupil.setX(turn * 2.4).setY(1 + this.reaction * 1.2);
    for (const socket of this.eyeSockets) socket.setScale(1, expressionScale);
    this.mouthRoot
      .setScale(1 + this.summonPulse * 0.18 + this.eatPulse * 0.68, 1 + this.summonPulse * 0.3 + this.reaction * 0.28 + this.eatPulse * 0.82)
      .setAngle(this.reaction * 8 * facing);

    const settle = Math.min(1, deltaSeconds * (reducedMotion ? 18 : 12));
    for (const joint of this.joints) {
      const wave = Math.sin(this.phase * (joint.role === "leg" ? 1.7 : 1.05) + joint.phaseOffset);
      let amplitude = joint.role === "arm" ? 5.5 : joint.role === "leg" ? 3.2 : joint.role === "ear" ? 6.5 : joint.role === "antenna" ? 5.2 : joint.role === "prop" ? 3.5 : 2.8;
      if (joint.role === "crown") amplitude = 2.2;
      let actionAngle = 0;
      if (joint.role === "arm") actionAngle = -joint.side * this.summonPulse * 36 + joint.side * this.reaction * 9 - joint.side * this.eatPulse * 26;
      else if (joint.role === "antenna") actionAngle = this.summonPulse * 10 + this.reaction * 6 + this.eatPulse * 12;
      else if (joint.role === "ear") actionAngle = joint.side * this.summonPulse * 8 + joint.side * this.reaction * 5 + this.eatPulse * 7;
      else if (joint.role === "prop") actionAngle = -joint.side * this.summonPulse * 11 + joint.side * this.reaction * 6;
      else if (joint.role === "leg") actionAngle = joint.side * this.reaction * 4;
      const targetAngle = joint.baseAngle + wave * amplitude * motionScale + actionAngle;
      joint.angle = Phaser.Math.Linear(joint.angle, targetAngle, settle);
      const attachWobble = joint.role === "leg" ? Math.max(0, wave) * 0.7 : Math.sin(this.phase + joint.phaseOffset) * 0.45;
      joint.node
        .setPosition(joint.baseX, joint.baseY + attachWobble * motionScale - this.summonPulse * (joint.role === "arm" ? 2.8 : 0) - this.eatPulse * (joint.role === "arm" ? 1.8 : 0))
        .setAngle(joint.angle);
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
  private debugActionBeat = -1;

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
    for (const [animation, config] of Object.entries(PIPPLO_ANIMATIONS) as Array<[PipploAnimation, typeof PIPPLO_ANIMATIONS[PipploAnimation]]>) {
      for (let frame = 1; frame <= config.frames; frame += 1) {
        const filename = `${frame.toString().padStart(2, "0")}.png`;
        this.load.image(pipploTextureKey(animation, frame), `${import.meta.env.BASE_URL}assets/goo-keep/characters/pipplo/whole-sprite-v2/${animation}/${filename}`);
      }
    }
  }

  create(): void {
    this.viewWidth = Math.max(320, this.scale.width);
    this.viewHeight = Math.max(180, this.scale.height);
    this.cameras.main.setZoom(1, this.viewHeight / WORLD_HEIGHT);
    this.background = this.add.graphics().setDepth(0);
    this.rebuildLeaders();
  }

  update(time: number, delta: number): void {
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
    this.runDebugActions(time);
    const live = this.snapshot.battle.mode === "study";
    this.player.update(deltaSeconds, live, this.reducedMotion);
    this.enemy.update(deltaSeconds, live, this.reducedMotion);
    this.syncUnits(deltaSeconds, live);
    this.syncFx();
  }

  private runDebugActions(time: number): void {
    if (!import.meta.env.DEV) return;
    const action = new URLSearchParams(window.location.search).get("rigAction");
    if (action !== "hit" && action !== "summon" && action !== "eat") return;
    const beat = Math.floor(time / 1_100);
    if (beat === this.debugActionBeat) return;
    this.debugActionBeat = beat;
    if (action === "hit") {
      this.player?.hit();
      this.enemy?.hit();
    } else if (action === "summon") {
      this.player?.summon();
      this.enemy?.summon();
    } else {
      this.player?.devour();
    }
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
    if (import.meta.env.DEV) {
      const params = new URLSearchParams(window.location.search);
      const debugKind = params.get("unit");
      if (debugKind && debugKind in CASTLE_UNIT_DEFS) {
        const kind = debugKind as CastleUnitKind;
        const action = params.get("unitAction");
        const id = "sprite-qa-unit";
        for (const [existingId, rig] of this.unitRigs) {
          if (existingId === id) continue;
          rig.destroy();
          this.unitRigs.delete(existingId);
        }
        const def = CASTLE_UNIT_DEFS[kind];
        const cycleMs = this.time.now % 1_800;
        const hitFrame = action === "hit" && cycleMs >= 800 && cycleMs < 1_550;
        const attackFrame = action === "attack" && cycleMs >= 800 && cycleMs < 1_550;
        const side: CastleSide = FRIENDLY_UNIT_KINDS.has(kind) ? "player" : "enemy";
        const unit: CastleUnitState = {
          id,
          side,
          kind,
          affix: null,
          hp: Math.max(1, def.hp - (hitFrame ? 1 : 0)),
          maxHp: def.hp,
          shield: action === "shield" ? 6 : 0,
          position: 50,
          attackCooldownMs: attackFrame ? Math.max(0, def.attackMs - 80) : 0,
          slowMs: action === "slow" ? 2_000 : 0,
          damageBonus: 0,
          kills: 0,
          origin: "paid",
          overfed: action === "overfed",
        };
        let rig = this.unitRigs.get(id);
        if (!rig) {
          rig = new UnitRig(this, unit, this.leaderX(side));
          this.unitRigs.set(id, rig);
        }
        rig.update(unit, this.laneX(50), deltaSeconds, true, this.reducedMotion);
        return;
      }
    }
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
    this.player?.devour();
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
            this.player?.devour();
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
    const debugReducedMotion = import.meta.env.DEV && new URLSearchParams(window.location.search).get("reducedMotion") === "1";
    const scene = new GooKeepScene(initialRunRef.current, reducedMotion || debugReducedMotion);
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
