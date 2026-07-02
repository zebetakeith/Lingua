import { useEffect, useRef } from "react";
import Phaser from "phaser";
import {
  CASTLE_ENEMY_AFFIX_DEFS,
  CASTLE_UNIT_DEFS,
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
const GROUND_Y = 236;

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

interface SpringPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
}

interface BattlefieldProps {
  run: CastleRunState;
  reducedMotion?: boolean;
}

function parseHex(color: string, fallback: number): number {
  const normalized = color.trim().replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return Number.isFinite(value) ? value : fallback;
}

function textureKey(kind: CastleUnitKind): string {
  return `goo-unit-${kind}`;
}

class SoftBodyLeader {
  private readonly side: CastleSide;
  private readonly form: "pipplo" | "shell" | "mire" | "root";
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly detail: Phaser.GameObjects.Graphics;
  private readonly face: Phaser.GameObjects.Container;
  private readonly leftEye: Phaser.GameObjects.Ellipse;
  private readonly rightEye: Phaser.GameObjects.Ellipse;
  private readonly mouth: Phaser.GameObjects.Arc;
  private readonly points: SpringPoint[];
  private readonly homeX: number;
  private readonly homeY: number;
  private readonly radiusX: number;
  private readonly radiusY: number;
  private readonly fill: number;
  private readonly stroke: number;
  private reaction = 0;
  private summonPulse = 0;
  private phase = 0;
  private hpRatio = 1;

  constructor(scene: Phaser.Scene, side: CastleSide, region: number, viewportWidth: number, guardianPowerId: CastleGuardianPowerId | null = null) {
    this.side = side;
    this.form = side === "player"
      ? "pipplo"
      : guardianPowerId === "shellReprisal"
        ? "shell"
        : guardianPowerId === "sporeWeather" || guardianPowerId === "moonTax"
          ? "mire"
          : guardianPowerId === "rootQuake" || guardianPowerId === "broodCall"
            ? "root"
            : region % 3 === 1 ? "shell" : region % 3 === 2 ? "mire" : "root";
    const edge = Math.max(58, Math.min(82, viewportWidth * 0.09));
    this.homeX = side === "player" ? edge : viewportWidth - edge;
    this.homeY = GROUND_Y - (this.form === "mire" ? 56 : 42);
    this.radiusX = this.form === "mire" ? 50 : this.form === "root" ? 62 : 58;
    this.radiusY = this.form === "mire" ? 72 : this.form === "root" ? 52 : 50;
    this.fill = this.form === "pipplo" ? 0x86d96f : this.form === "shell" ? 0xe58c7a : this.form === "mire" ? 0xae7bc9 : 0xb9854f;
    this.stroke = this.form === "pipplo" ? 0x276d70 : this.form === "shell" ? 0x744b63 : this.form === "mire" ? 0x68486f : 0x664733;
    this.body = scene.add.graphics().setDepth(18);
    this.detail = scene.add.graphics().setDepth(19);
    this.leftEye = scene.add.ellipse(-15, -5, 12, 17, 0xffffff).setStrokeStyle(3, this.stroke);
    this.rightEye = scene.add.ellipse(15, -5, 12, 17, 0xffffff).setStrokeStyle(3, this.stroke);
    const leftPupil = scene.add.circle(-15 + (side === "player" ? 2 : -2), -3, 3.5, 0x183f44);
    const rightPupil = scene.add.circle(15 + (side === "player" ? 2 : -2), -3, 3.5, 0x183f44);
    this.mouth = scene.add.arc(0, 14, 10, 18, 162, false, 0x000000, 0).setStrokeStyle(3, this.stroke);
    this.face = scene.add.container(this.homeX, this.homeY, [this.leftEye, this.rightEye, leftPupil, rightPupil, this.mouth]).setDepth(21);
    this.points = Array.from({ length: 8 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 8;
      return {
        x: this.homeX + Math.cos(angle) * this.radiusX,
        y: this.homeY + Math.sin(angle) * this.radiusY,
        vx: 0,
        vy: 0,
        angle,
      };
    });
  }

  setHp(current: number, max: number): void {
    this.hpRatio = Phaser.Math.Clamp(current / Math.max(1, max), 0, 1);
  }

  hit(): void {
    this.reaction = 1;
    for (const point of this.points) {
      point.vx += this.side === "player" ? -65 : 65;
      point.vy += Phaser.Math.Between(-35, 18);
    }
  }

  summon(): void {
    this.summonPulse = 1;
    for (const point of this.points) {
      point.vx += Math.cos(point.angle) * 42;
      point.vy += Math.sin(point.angle) * 26;
    }
  }

  setVisible(visible: boolean): void {
    this.body.setVisible(visible);
    this.detail.setVisible(visible);
    this.face.setVisible(visible);
  }

  update(deltaSeconds: number, live: boolean, reducedMotion: boolean): void {
    this.phase += deltaSeconds * (live ? 2.4 : 0.8);
    this.reaction = Math.max(0, this.reaction - deltaSeconds * 2.5);
    this.summonPulse = Math.max(0, this.summonPulse - deltaSeconds * 2.8);
    const motionScale = reducedMotion ? 0.25 : 1;
    const lean = this.side === "player" ? 1 : -1;
    const healthDroop = (1 - this.hpRatio) * 8;
    for (const point of this.points) {
      const breathe = Math.sin(this.phase + point.angle * 2) * 2.6 * motionScale;
      const pulse = this.summonPulse * 8;
      const targetX = this.homeX + Math.cos(point.angle) * (this.radiusX + breathe + pulse);
      const targetY = this.homeY + healthDroop + Math.sin(point.angle) * (this.radiusY - breathe + pulse * 0.6);
      point.vx += (targetX - point.x) * 48 * deltaSeconds;
      point.vy += (targetY - point.y) * 48 * deltaSeconds;
      point.vx *= Math.pow(0.004, deltaSeconds);
      point.vy *= Math.pow(0.004, deltaSeconds);
      point.x += point.vx * deltaSeconds;
      point.y += point.vy * deltaSeconds;
    }
    const faceBob = Math.sin(this.phase * 1.25) * 2.2 * motionScale;
    this.face.setPosition(
      this.homeX + lean * (this.summonPulse * 5 - this.reaction * 7),
      this.homeY + faceBob + healthDroop,
    );
    this.face.setScale(1 + this.summonPulse * 0.08, 1 - this.summonPulse * 0.05 + this.reaction * 0.05);
    this.mouth.setRadius(this.reaction > 0.25 ? 8 : this.summonPulse > 0.2 ? 14 : 10);
    this.draw();
  }

  destroy(): void {
    this.body.destroy();
    this.detail.destroy();
    this.face.destroy(true);
  }

  private draw(): void {
    const smoothPoints = new Phaser.Curves.Spline(this.points.map(point => new Phaser.Math.Vector2(point.x, point.y))).getPoints(48);
    this.body.clear();
    this.body.fillStyle(this.fill, 1);
    this.body.lineStyle(6, this.stroke, 1);
    this.body.fillPoints(smoothPoints, true);
    this.body.strokePoints(smoothPoints, true);
    this.detail.clear();
    if (this.form === "pipplo") {
      this.detail.fillStyle(0xf7d65b, 1).fillCircle(this.homeX - 25, this.homeY - 37, 8);
      this.detail.lineStyle(4, 0xffffff, 0.8).strokeCircle(this.homeX - 25, this.homeY - 37, 10);
      this.detail.fillStyle(0x65b9a8, 0.85).fillCircle(this.homeX + 38, this.homeY + 22, 9 + this.summonPulse * 6);
    } else if (this.form === "shell") {
      this.detail.lineStyle(8, 0xf6c58e, 1).strokeCircle(this.homeX + 6, this.homeY + 3, 38);
      this.detail.lineStyle(4, this.stroke, 0.7).beginPath().moveTo(this.homeX - 23, this.homeY + 2).lineTo(this.homeX + 36, this.homeY + 2).strokePath();
      this.detail.fillStyle(0xf8d87c, 1).fillTriangle(this.homeX - 38, this.homeY - 40, this.homeX - 18, this.homeY - 54, this.homeX - 12, this.homeY - 32);
    } else if (this.form === "mire") {
      this.detail.lineStyle(11, 0x76577c, 1).lineBetween(this.homeX - 22, this.homeY + 45, this.homeX - 30, GROUND_Y);
      this.detail.lineBetween(this.homeX + 22, this.homeY + 45, this.homeX + 30, GROUND_Y);
      this.detail.fillStyle(0xe8a5ce, 1).fillEllipse(this.homeX, this.homeY - 62, 118, 45);
      this.detail.lineStyle(5, this.stroke, 1).strokeEllipse(this.homeX, this.homeY - 62, 118, 45);
      this.detail.fillStyle(0xf8d9ec, 0.8).fillCircle(this.homeX - 25, this.homeY - 66, 8);
    } else {
      this.detail.lineStyle(10, 0x7a5539, 1).beginPath().moveTo(this.homeX - 28, this.homeY - 38).lineTo(this.homeX - 50, this.homeY - 68).lineTo(this.homeX - 63, this.homeY - 55).strokePath();
      this.detail.beginPath().moveTo(this.homeX + 28, this.homeY - 38).lineTo(this.homeX + 52, this.homeY - 68).lineTo(this.homeX + 66, this.homeY - 52).strokePath();
      this.detail.fillStyle(0x8fc36e, 1).fillCircle(this.homeX - 58, this.homeY - 67, 9);
      this.detail.fillCircle(this.homeX + 58, this.homeY - 65, 11);
    }
  }
}

class UnitRig {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly leftPart: Phaser.GameObjects.Ellipse;
  private readonly rightPart: Phaser.GameObjects.Ellipse;
  private readonly accessory: Phaser.GameObjects.Arc;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly hpBar: Phaser.GameObjects.Graphics;
  private readonly badge: Phaser.GameObjects.Text;
  private readonly side: CastleSide;
  private x: number;
  private y: number;
  private vx = 0;
  private phase = Math.random() * Math.PI * 2;
  private lastHp: number;
  private attackSignal = 0;

  constructor(scene: Phaser.Scene, unit: CastleUnitState, spawnX: number) {
    this.scene = scene;
    this.side = unit.side;
    this.x = spawnX;
    this.y = GROUND_Y - 10;
    this.lastHp = unit.hp;
    const accent = parseHex(CASTLE_UNIT_DEFS[unit.kind].accent, 0x8bcf78);
    this.shadow = scene.add.ellipse(0, 8, 52, 14, 0x163f46, 0.2);
    this.leftPart = scene.add.ellipse(-17, -17, 22, 15, accent, 0.88).setStrokeStyle(2, unit.side === "player" ? 0x285e63 : 0x71485e, 0.75);
    this.rightPart = scene.add.ellipse(17, -17, 22, 15, accent, 0.88).setStrokeStyle(2, unit.side === "player" ? 0x285e63 : 0x71485e, 0.75);
    this.accessory = scene.add.circle(0, -38, unit.kind === "bigChonk" || unit.kind === "rootLump" ? 9 : 6, accent, 0.9).setStrokeStyle(2, 0xffffff, 0.55);
    this.sprite = scene.add.image(0, -16, textureKey(unit.kind));
    const size = unit.kind === "rootLump" || unit.kind === "bigChonk" ? 72 : unit.kind === "nibbleImp" || unit.kind === "piplet" ? 43 : 56;
    this.sprite.setDisplaySize(size, size).setFlipX(unit.side === "enemy");
    this.hpBar = scene.add.graphics();
    this.badge = scene.add.text(0, -61, "", { fontFamily: "Nunito, sans-serif", fontSize: "12px", fontStyle: "bold", color: "#ffffff", stroke: "#194f53", strokeThickness: 4 }).setOrigin(0.5);
    this.container = scene.add.container(this.x, this.y, [this.shadow, this.leftPart, this.rightPart, this.accessory, this.sprite, this.hpBar, this.badge]).setDepth(12);
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
      this.scene.tweens.add({ targets: this.sprite, tint: 0xffffff, alpha: 0.35, yoyo: true, duration: 70, repeat: 1, onComplete: () => this.sprite.clearTint().setAlpha(1) });
      this.container.x += this.side === "player" ? -8 : 8;
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
    this.sprite.setScale(1 + stretch + (this.attackSignal > 0 ? 0.1 : 0), 1 - stretch * 0.65 - (this.attackSignal > 0 ? 0.08 : 0));
    this.sprite.setAngle(Math.sin(this.phase * 0.5) * 2.5 * motion + Phaser.Math.Clamp(this.vx / 75, -7, 7));
    this.leftPart.setPosition(-17 - Math.sin(this.phase * 0.82) * 3 * motion, -17 + Math.cos(this.phase * 1.1) * 3 * motion).setAngle(-18 + Math.sin(this.phase) * 14 * motion);
    this.rightPart.setPosition(17 + Math.sin(this.phase * 0.76) * 3 * motion, -17 + Math.cos(this.phase * 1.2 + 1) * 3 * motion).setAngle(18 - Math.sin(this.phase + 0.8) * 14 * motion);
    this.accessory.setPosition(Math.sin(this.phase * 0.65) * 4 * motion, -38 + Math.cos(this.phase * 0.9) * 4 * motion).setScale(1 + Math.sin(this.phase) * 0.08 * motion);
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
    this.hpBar.fillStyle(0xffffff, 0.78).fillRoundedRect(-width / 2, -55, width, 5, 2);
    this.hpBar.fillStyle(unit.side === "player" ? 0x62bd61 : 0xe96885, 1).fillRoundedRect(-width / 2, -55, width * hpRatio, 5, 2);
    if (unit.shield > 0) this.hpBar.lineStyle(2, 0x79d5ef, 0.9).strokeCircle(0, -17, 31);
    const affix = unit.affix ? CASTLE_ENEMY_AFFIX_DEFS[unit.affix] : null;
    const labels = [affix?.name.slice(0, 1) || "", unit.overfed ? "★" : "", unit.origin === "wild" ? "◌" : ""].filter(Boolean);
    this.badge.setText(labels.join(""));
  }
}

class GooKeepScene extends Phaser.Scene {
  private snapshot: CastleRunState;
  private readonly reducedMotion: boolean;
  private background?: Phaser.GameObjects.Graphics;
  private player?: SoftBodyLeader;
  private enemy?: SoftBodyLeader;
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

  preload(): void {
    for (const [kind, path] of Object.entries(UNIT_TEXTURES)) {
      this.load.image(textureKey(kind as CastleUnitKind), `${import.meta.env.BASE_URL}assets/goo-keep/${path}`);
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
    this.player = new SoftBodyLeader(this, "player", this.snapshot.region, this.viewWidth);
    this.enemy = new SoftBodyLeader(this, "enemy", this.snapshot.region, this.viewWidth, this.snapshot.battle.guardianPowerId);
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
    this.background.clear();
    this.background.fillGradientStyle(skyTop, skyTop, skyBottom, skyBottom, 1).fillRect(0, 0, width, WORLD_HEIGHT);
    this.background.fillStyle(parseHex(region.sun, 0xfff59a), 0.95).fillCircle(width * 0.5, 72, 42);
    this.background.fillStyle(far, 1).fillEllipse(width * 0.25, 230, width * 0.64, 160).fillEllipse(width * 0.76, 226, width * 0.7, 165);
    this.background.fillStyle(near, 1).fillEllipse(width * 0.16, 259, width * 0.53, 155).fillEllipse(width * 0.82, 257, width * 0.62, 155);
    this.background.fillStyle(ground, 1).fillRect(0, 215, width, 85);
    this.background.fillStyle(road, 1).fillEllipse(width * 0.5, 270, width * 0.84, 98);
    this.background.lineStyle(4, 0xffffff, 0.3).strokeEllipse(width * 0.5, 269, width * 0.84, 94);
    this.background.fillStyle(0x204f51, 0.14).fillEllipse(width * 0.08, 254, 130, 24).fillEllipse(width * 0.92, 254, 145, 25);
    for (let index = 0; index < 10; index += 1) {
      const x = width * (0.16 + index * 0.075);
      const y = 231 + Math.sin(index * 2.2) * 6;
      this.background.fillStyle(index % 2 === 0 ? 0xffffff : 0xf2e06d, 0.68).fillCircle(x, y, 2 + (index % 3));
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
      const particle = this.add.circle(x, y, Phaser.Math.Between(3, 7), color, 0.9).setDepth(36);
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.45;
      const distance = Phaser.Math.Between(22, 54);
      this.tweens.add({ targets: particle, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, scale: 0.1, alpha: 0, duration: this.reducedMotion ? 240 : 520, ease: "Quad.Out", onComplete: () => particle.destroy() });
    }
  }

  private leaderX(side: CastleSide): number {
    const edge = Math.max(58, Math.min(82, this.viewWidth * 0.09));
    return side === "player" ? edge : this.viewWidth - edge;
  }

  private laneX(position: number): number {
    const padding = Math.max(92, Math.min(136, this.viewWidth * 0.15));
    return Phaser.Math.Linear(padding, this.viewWidth - padding, Phaser.Math.Clamp(position / 100, 0, 1));
  }
}

export function GooKeepBattlefield({ run, reducedMotion = false }: BattlefieldProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GooKeepScene | null>(null);
  const initialRunRef = useRef(run);

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
