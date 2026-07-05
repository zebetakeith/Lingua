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

type UnitAnimation = "walk" | "attack";

const UNIT_ASSET_ROOTS: Record<CastleUnitKind, string> = {
  piplet: "units/friendly/piplet",
  dartlet: "units/friendly/dartlet",
  bubbleBud: "units/friendly/bubbleBud",
  mendlet: "units/friendly/mendlet",
  spitlet: "units/friendly/spitlet",
  bigChonk: "units/friendly/bigChonk",
  shellSlime: "units/enemy/shellSlime",
  nibbleImp: "units/enemy/nibbleImp",
  sporeBud: "units/enemy/sporeBud",
  boomcap: "units/enemy/boomcap",
  echoMoth: "units/enemy/echoMoth",
  rootLump: "units/enemy/rootLump",
};

const UNIT_ANIMATION_FRAMES = 4;
const UNIT_ATTACK_ANIMATION_SECONDS = 0.38;

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

const GENERAL_TEXTURES: Record<Exclude<LeaderForm, "pipplo">, string> = {
  mallow: "characters/generals/runtime-v1/mallow.png",
  clackback: "characters/generals/runtime-v1/clackback.png",
  puffmaestro: "characters/generals/runtime-v1/puffmaestro.png",
  thumblestump: "characters/generals/runtime-v1/thumblestump.png",
  broodle: "characters/generals/runtime-v1/broodle.png",
};

function generalTextureKey(form: Exclude<LeaderForm, "pipplo">): string {
  return `goo-general-${form}`;
}

const UNIT_WHOLE_SPRITE_CONFIGS: Record<CastleUnitKind, { scale: number; originY: number }> = {
  piplet: { scale: 0.3, originY: 148 / 160 },
  dartlet: { scale: 0.34, originY: 148 / 160 },
  bubbleBud: { scale: 0.34, originY: 148 / 160 },
  mendlet: { scale: 0.36, originY: 149 / 160 },
  spitlet: { scale: 0.35, originY: 149 / 160 },
  bigChonk: { scale: 0.45, originY: 150 / 160 },
  shellSlime: { scale: 0.38, originY: 151 / 160 },
  nibbleImp: { scale: 0.34, originY: 149 / 160 },
  sporeBud: { scale: 0.38, originY: 150 / 160 },
  boomcap: { scale: 0.39, originY: 151 / 160 },
  echoMoth: { scale: 0.38, originY: 148 / 160 },
  rootLump: { scale: 0.44, originY: 153 / 160 },
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

function unitTextureKey(kind: CastleUnitKind, animation: UnitAnimation, frame: number): string {
  return `goo-unit-${kind}-${animation}-${frame}`;
}

function getLeaderForm(side: CastleSide, region: number, guardianPowerId: CastleGuardianPowerId | null): LeaderForm {
  if (side === "player") return "pipplo";
  if (import.meta.env.DEV) {
    const previewForm = new URLSearchParams(window.location.search).get("leader");
    if (previewForm === "pipplo" || (previewForm && previewForm in GENERAL_TEXTURES)) return previewForm as LeaderForm;
  }
  const powerId = guardianPowerId ?? getCastleGuardianPower(region).id;
  if (powerId === "shellReprisal") return "clackback";
  if (powerId === "sporeWeather") return "puffmaestro";
  if (powerId === "rootQuake") return "thumblestump";
  if (powerId === "broodCall") return "broodle";
  return "mallow";
}


class WholeSpriteLeader {
  private readonly side: CastleSide;
  private readonly form: LeaderForm;
  private readonly root: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly homeX: number;
  private readonly visualScale: number;
  private pipploSprite?: Phaser.GameObjects.Image;
  private generalSprite?: Phaser.GameObjects.Image;
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
    const edge = Math.max(72, Math.min(104, viewportWidth * 0.095));
    this.homeX = side === "player" ? edge : viewportWidth - edge;
    this.visualScale = Phaser.Math.Clamp(viewportWidth / 620, 0.64, 1);
    this.shadow = scene.add.ellipse(this.homeX, GROUND_Y + 3, this.form === "pipplo" ? 108 : 96, 18, 0x244c4f, 0.2).setDepth(14);
    this.root = scene.add.container(this.homeX, GROUND_Y).setDepth(18);
    this.buildCharacter(scene);
    this.root.setScale((side === "enemy" ? -1 : 1) * this.visualScale, this.visualScale);
  }

  private buildWholeSpritePipplo(scene: Phaser.Scene): void {
    this.pipploSprite = scene.add.image(0, 0, pipploTextureKey("idle", 1)).setOrigin(0.5, 246 / 256).setScale(0.75).setFlipX(true);
    this.root.add(this.pipploSprite);
  }

  private buildWholeSpriteGeneral(scene: Phaser.Scene): void {
    const form = this.form as Exclude<LeaderForm, "pipplo">;
    this.generalSprite = scene.add.image(0, 0, generalTextureKey(form)).setOrigin(0.5, 309 / 320).setScale(0.5);
    this.root.add(this.generalSprite);
  }

  private buildCharacter(scene: Phaser.Scene): void {
    if (this.form === "pipplo") this.buildWholeSpritePipplo(scene);
    else this.buildWholeSpriteGeneral(scene);
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
    const wholeBob = Math.sin(this.phase * 1.12) * 2.2 * motionScale;
    const wholeSquash = Math.sin(this.phase * 1.9) * 0.014 * motionScale;
    this.root
      .setPosition(this.homeX + this.summonPulse * 3 * facing - reactionShove, GROUND_Y + wholeBob + healthDroop - this.summonPulse * 3)
      .setScale(
        facing * this.visualScale * (1 + wholeSquash + this.summonPulse * 0.03 + this.reaction * 0.018),
        this.visualScale * (1 - wholeSquash - this.summonPulse * 0.02 + this.reaction * 0.02),
      )
      .setAngle(Math.sin(this.phase * 0.5) * 0.65 * motionScale + this.reaction * 2.5 * facing);
    this.shadow
      .setPosition(this.homeX, GROUND_Y + 3)
      .setScale(this.visualScale * (1 - Math.abs(wholeBob) / 30 + this.summonPulse * 0.04), this.visualScale);
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
  private readonly artSprite: Phaser.GameObjects.Image;
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
  private hitSignal = 0;
  private textureState = "";

  constructor(scene: Phaser.Scene, unit: CastleUnitState, spawnX: number) {
    this.scene = scene;
    this.side = unit.side;
    this.kind = unit.kind;
    this.x = spawnX;
    this.y = GROUND_Y + 1;
    this.lastHp = unit.hp;
    const config = UNIT_WHOLE_SPRITE_CONFIGS[unit.kind];
    const texture = unitTextureKey(unit.kind, "walk", 1);
    this.shadow = scene.add.ellipse(0, 3, unit.kind === "rootLump" || unit.kind === "bigChonk" ? 58 : 45, 11, 0x163f46, 0.19);
    this.artRoot = scene.add.container(0, 0);
    this.artSprite = scene.add.image(0, 0, texture).setOrigin(0.5, config.originY).setScale(config.scale);
    this.artRoot.add(this.artSprite).setScale(unit.side === "enemy" ? -1 : 1, 1);
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
      this.hitSignal = 1;
    }
    this.lastHp = unit.hp;
    if (unit.attackCooldownMs > CASTLE_UNIT_DEFS[unit.kind].attackMs - 170 && this.attackSignal <= 0) {
      this.attackSignal = UNIT_ATTACK_ANIMATION_SECONDS;
    }
    this.attackSignal = Math.max(0, this.attackSignal - deltaSeconds);
    this.hitSignal = Math.max(0, this.hitSignal - deltaSeconds * 5.5);
    const attacking = this.attackSignal > 0;
    const attackProgress = attacking ? 1 - this.attackSignal / UNIT_ATTACK_ANIMATION_SECONDS : 0;
    const animation: UnitAnimation = attacking ? "attack" : "walk";
    const frame = reducedMotion
      ? attacking ? (attackProgress < 0.55 ? 2 : UNIT_ANIMATION_FRAMES) : 1
      : attacking
        ? Math.min(UNIT_ANIMATION_FRAMES, Math.floor(attackProgress * UNIT_ANIMATION_FRAMES) + 1)
        : Math.floor(this.phase * 1.25) % UNIT_ANIMATION_FRAMES + 1;
    const nextTexture = unitTextureKey(this.kind, animation, frame);
    if (nextTexture !== this.textureState) {
      this.textureState = nextTexture;
      this.artSprite.setTexture(nextTexture);
    }
    const bob = Math.sin(this.phase) * 2 * motion;
    const lunge = attacking ? Math.sin((this.attackSignal / UNIT_ATTACK_ANIMATION_SECONDS) * Math.PI) * 12 * (this.side === "player" ? 1 : -1) : 0;
    const stretch = Math.min(0.12, Math.abs(this.vx) / 650) * motion;
    this.container.setPosition(this.x + lunge, this.y + bob);
    const facing = this.side === "enemy" ? -1 : 1;
    this.artRoot
      .setScale(
        facing * (1 + stretch + (attacking ? 0.045 : 0) - this.hitSignal * 0.08),
        1 - stretch * 0.65 - (attacking ? 0.035 : 0) + this.hitSignal * 0.07,
      )
      .setAngle(Math.sin(this.phase * 0.5) * 1.5 * motion + Phaser.Math.Clamp(this.vx / 90, -5, 5) + this.hitSignal * 5 * facing);
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
  private player?: WholeSpriteLeader;
  private enemy?: WholeSpriteLeader;
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
    for (const [kind, path] of Object.entries(UNIT_ASSET_ROOTS) as Array<[CastleUnitKind, string]>) {
      for (const animation of ["walk", "attack"] satisfies UnitAnimation[]) {
        for (let frame = 1; frame <= UNIT_ANIMATION_FRAMES; frame += 1) {
          this.load.image(unitTextureKey(kind, animation, frame), `${import.meta.env.BASE_URL}assets/goo-keep/${path}/${animation}/0${frame}.png`);
        }
      }
    }
    for (const [form, path] of Object.entries(GENERAL_TEXTURES) as Array<[Exclude<LeaderForm, "pipplo">, string]>) {
      this.load.image(generalTextureKey(form), `${import.meta.env.BASE_URL}assets/goo-keep/${path}`);
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
    this.player = new WholeSpriteLeader(this, "player", this.snapshot.region, this.viewWidth);
    this.enemy = new WholeSpriteLeader(this, "enemy", this.snapshot.region, this.viewWidth, this.snapshot.battle.guardianPowerId);
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
