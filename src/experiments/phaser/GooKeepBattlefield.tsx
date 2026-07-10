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
const LEADER_DEFEAT_SECONDS = 0.9;

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
const UNIT_HIT_ANIMATION_SECONDS = 0.34;

type MotionAxis = "horizontal" | "vertical" | "radial";

interface UnitMotionProfile {
  duration: number;
  spawnDuration: number;
  spawnLift: number;
  anticipationEnd: number;
  impactAt: number;
  frameBeats: readonly [number, number, number];
  axis: MotionAxis;
  travel: number;
  windup: number;
  lift: number;
  preImpactStretch: number;
  impactSquash: number;
  recoil: number;
  angle: number;
  walkRate: number;
  walkBob: number;
  walkTilt: number;
  walkStretch: number;
  idleLift: number;
  hitRecoil: number;
}

const UNIT_MOTION_PROFILES: Record<CastleUnitKind, UnitMotionProfile> = {
  piplet: { duration: 0.44, spawnDuration: 0.5, spawnLift: 15, anticipationEnd: 0.18, impactAt: 0.58, frameBeats: [0.16, 0.54, 0.76], axis: "vertical", travel: 15, windup: 5, lift: 10, preImpactStretch: 0.09, impactSquash: 0.12, recoil: 3, angle: 5, walkRate: 1.2, walkBob: 2.6, walkTilt: 2, walkStretch: 0.035, idleLift: 0, hitRecoil: 7 },
  dartlet: { duration: 0.38, spawnDuration: 0.38, spawnLift: 7, anticipationEnd: 0.14, impactAt: 0.5, frameBeats: [0.13, 0.46, 0.7], axis: "horizontal", travel: 24, windup: 8, lift: 4, preImpactStretch: 0.13, impactSquash: 0.05, recoil: 7, angle: 10, walkRate: 1.5, walkBob: 1.8, walkTilt: 4, walkStretch: 0.045, idleLift: 2, hitRecoil: 9 },
  bubbleBud: { duration: 0.54, spawnDuration: 0.62, spawnLift: 21, anticipationEnd: 0.22, impactAt: 0.62, frameBeats: [0.2, 0.58, 0.8], axis: "radial", travel: 11, windup: 5, lift: 14, preImpactStretch: 0.1, impactSquash: 0.11, recoil: 4, angle: 4, walkRate: 1.05, walkBob: 3.4, walkTilt: 2, walkStretch: 0.05, idleLift: 3, hitRecoil: 7 },
  mendlet: { duration: 0.66, spawnDuration: 0.66, spawnLift: 18, anticipationEnd: 0.25, impactAt: 0.68, frameBeats: [0.22, 0.62, 0.82], axis: "radial", travel: 4, windup: 2, lift: 12, preImpactStretch: 0.07, impactSquash: 0.05, recoil: 2, angle: 3, walkRate: 0.9, walkBob: 3, walkTilt: 1.5, walkStretch: 0.028, idleLift: 3, hitRecoil: 6 },
  spitlet: { duration: 0.5, spawnDuration: 0.46, spawnLift: 8, anticipationEnd: 0.2, impactAt: 0.56, frameBeats: [0.18, 0.52, 0.76], axis: "horizontal", travel: 8, windup: 6, lift: 4, preImpactStretch: 0.12, impactSquash: 0.07, recoil: 10, angle: 8, walkRate: 1.1, walkBob: 2, walkTilt: 2.5, walkStretch: 0.035, idleLift: 1, hitRecoil: 8 },
  bigChonk: { duration: 0.7, spawnDuration: 0.78, spawnLift: 30, anticipationEnd: 0.22, impactAt: 0.72, frameBeats: [0.2, 0.68, 0.82], axis: "vertical", travel: 18, windup: 7, lift: 25, preImpactStretch: 0.17, impactSquash: 0.19, recoil: 3, angle: 4, walkRate: 0.72, walkBob: 2.4, walkTilt: 1.5, walkStretch: 0.025, idleLift: 0, hitRecoil: 6 },
  shellSlime: { duration: 0.52, spawnDuration: 0.56, spawnLift: 8, anticipationEnd: 0.2, impactAt: 0.58, frameBeats: [0.18, 0.54, 0.78], axis: "horizontal", travel: 14, windup: 5, lift: 3, preImpactStretch: 0.08, impactSquash: 0.1, recoil: 5, angle: 7, walkRate: 0.82, walkBob: 1.6, walkTilt: 1.4, walkStretch: 0.022, idleLift: 0, hitRecoil: 6 },
  nibbleImp: { duration: 0.42, spawnDuration: 0.4, spawnLift: 11, anticipationEnd: 0.16, impactAt: 0.5, frameBeats: [0.14, 0.46, 0.7], axis: "horizontal", travel: 22, windup: 8, lift: 8, preImpactStretch: 0.13, impactSquash: 0.08, recoil: 8, angle: 12, walkRate: 1.4, walkBob: 2.5, walkTilt: 4, walkStretch: 0.04, idleLift: 0, hitRecoil: 9 },
  sporeBud: { duration: 0.58, spawnDuration: 0.64, spawnLift: 14, anticipationEnd: 0.22, impactAt: 0.62, frameBeats: [0.2, 0.58, 0.8], axis: "radial", travel: 4, windup: 3, lift: 8, preImpactStretch: 0.07, impactSquash: 0.09, recoil: 4, angle: 4, walkRate: 0.88, walkBob: 2.2, walkTilt: 1.5, walkStretch: 0.025, idleLift: 0, hitRecoil: 7 },
  boomcap: { duration: 0.64, spawnDuration: 0.7, spawnLift: 19, anticipationEnd: 0.24, impactAt: 0.66, frameBeats: [0.22, 0.62, 0.82], axis: "radial", travel: 7, windup: 4, lift: 12, preImpactStretch: 0.13, impactSquash: 0.18, recoil: 7, angle: 8, walkRate: 0.78, walkBob: 2.8, walkTilt: 2, walkStretch: 0.035, idleLift: 0, hitRecoil: 8 },
  echoMoth: { duration: 0.54, spawnDuration: 0.56, spawnLift: 25, anticipationEnd: 0.2, impactAt: 0.6, frameBeats: [0.18, 0.56, 0.8], axis: "horizontal", travel: 5, windup: 3, lift: 16, preImpactStretch: 0.09, impactSquash: 0.06, recoil: 8, angle: 5, walkRate: 1.65, walkBob: 4.2, walkTilt: 4, walkStretch: 0.025, idleLift: 10, hitRecoil: 8 },
  rootLump: { duration: 0.74, spawnDuration: 0.84, spawnLift: 13, anticipationEnd: 0.26, impactAt: 0.7, frameBeats: [0.24, 0.66, 0.82], axis: "vertical", travel: 9, windup: 6, lift: 8, preImpactStretch: 0.11, impactSquash: 0.2, recoil: 3, angle: 3, walkRate: 0.62, walkBob: 1.5, walkTilt: 1.2, walkStretch: 0.018, idleLift: 0, hitRecoil: 5 },
};

interface UnitDefeatProfile {
  duration: number;
  slide: number;
  drop: number;
  scaleX: number;
  scaleY: number;
  angle: number;
}

const UNIT_DEFEAT_PROFILES: Record<CastleUnitKind, UnitDefeatProfile> = {
  piplet: { duration: 300, slide: 4, drop: 7, scaleX: 0.48, scaleY: 0.48, angle: 8 },
  dartlet: { duration: 260, slide: 12, drop: 4, scaleX: 0.38, scaleY: 0.42, angle: 22 },
  bubbleBud: { duration: 340, slide: 4, drop: 8, scaleX: 0.55, scaleY: 0.55, angle: 10 },
  mendlet: { duration: 360, slide: 3, drop: 6, scaleX: 0.58, scaleY: 0.58, angle: 8 },
  spitlet: { duration: 300, slide: 10, drop: 5, scaleX: 0.45, scaleY: 0.45, angle: 18 },
  bigChonk: { duration: 480, slide: 7, drop: 10, scaleX: 1.02, scaleY: 0.75, angle: 10 },
  shellSlime: { duration: 420, slide: 7, drop: 8, scaleX: 0.96, scaleY: 0.8, angle: 15 },
  nibbleImp: { duration: 280, slide: 14, drop: 5, scaleX: 0.4, scaleY: 0.42, angle: 25 },
  sporeBud: { duration: 360, slide: 5, drop: 7, scaleX: 0.5, scaleY: 0.5, angle: 12 },
  boomcap: { duration: 420, slide: 2, drop: 2, scaleX: 1.35, scaleY: 1.35, angle: 6 },
  echoMoth: { duration: 380, slide: 10, drop: 15, scaleX: 0.72, scaleY: 0.72, angle: 42 },
  rootLump: { duration: 500, slide: 5, drop: 10, scaleX: 1.04, scaleY: 0.74, angle: 8 },
};

function clamp01(value: number): number {
  return Phaser.Math.Clamp(value, 0, 1);
}

function rangeProgress(progress: number, start: number, end: number): number {
  return clamp01((progress - start) / Math.max(0.0001, end - start));
}

function easeInCubic(value: number): number {
  const t = clamp01(value);
  return t * t * t;
}

function easeOutCubic(value: number): number {
  const t = 1 - clamp01(value);
  return 1 - t * t * t;
}

function smoothStep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function sharpPulse(progress: number, center: number, halfWidth: number): number {
  return Math.pow(clamp01(1 - Math.abs(progress - center) / halfWidth), 2);
}

function dampedSettle(progress: number, start: number, cycles = 2.5): number {
  const t = rangeProgress(progress, start, 1);
  return progress < start ? 0 : Math.sin(t * Math.PI * cycles * 2) * Math.exp(-3.8 * t);
}

function animationFrameForBeats(progress: number, beats: UnitMotionProfile["frameBeats"]): number {
  if (progress < beats[0]) return 1;
  if (progress < beats[1]) return 2;
  if (progress < beats[2]) return 3;
  return 4;
}

interface WholeSpriteMotion {
  offsetX: number;
  lift: number;
  scaleX: number;
  scaleY: number;
  angle: number;
}

function pipploMotion(animation: PipploAnimation, progress: number, clock: number, motionScale: number): WholeSpriteMotion {
  if (animation === "idle") {
    const breath = Math.sin(clock * Math.PI * 2);
    const sway = Math.sin(clock * Math.PI * 0.85 + 0.4);
    return {
      offsetX: 0,
      lift: Math.max(0, breath) * 0.75 * motionScale,
      scaleX: breath * 0.006 * motionScale,
      scaleY: -breath * 0.005 * motionScale,
      angle: sway * 0.45 * motionScale,
    };
  }

  if (animation === "summon") {
    const anticipation = progress < 0.18
      ? smoothStep(rangeProgress(progress, 0, 0.18))
      : progress < 0.34 ? 1 - easeOutCubic(rangeProgress(progress, 0.18, 0.34)) : 0;
    const launchT = rangeProgress(progress, 0.2, 0.64);
    const airborne = progress > 0.2 && progress < 0.64 ? Math.sin(launchT * Math.PI) : 0;
    const preLandingStretch = progress < 0.64 ? easeInCubic(rangeProgress(progress, 0.49, 0.64)) : 0;
    const impact = sharpPulse(progress, 0.66, 0.07);
    const settle = dampedSettle(progress, 0.66, 2.5);
    return {
      offsetX: (easeOutCubic(rangeProgress(progress, 0.2, 0.5)) - easeOutCubic(rangeProgress(progress, 0.66, 1))) * 2.5 * motionScale,
      lift: airborne * 7.5 * motionScale,
      scaleX: (anticipation * 0.075 - preLandingStretch * 0.085 + impact * 0.12 + settle * 0.022) * motionScale,
      scaleY: (-anticipation * 0.065 + preLandingStretch * 0.125 - impact * 0.105 - settle * 0.018) * motionScale,
      angle: (-anticipation * 1.8 + settle * 1.5) * motionScale,
    };
  }

  if (animation === "hit") {
    const impact = sharpPulse(progress, 0.08, 0.1);
    const recoil = progress < 0.62 ? Math.sin(rangeProgress(progress, 0.04, 0.62) * Math.PI) : 0;
    const settle = dampedSettle(progress, 0.22, 3);
    return {
      offsetX: -(impact * 5.5 + recoil * 3) * motionScale,
      lift: recoil * 1.5 * motionScale,
      scaleX: (-impact * 0.09 + recoil * 0.025 + settle * 0.016) * motionScale,
      scaleY: (impact * 0.11 - recoil * 0.02 - settle * 0.012) * motionScale,
      angle: (-impact * 5.5 - recoil * 2.8 + settle * 2.2) * motionScale,
    };
  }

  const anticipation = progress < 0.24
    ? smoothStep(rangeProgress(progress, 0, 0.24))
    : progress < 0.42 ? 1 - easeOutCubic(rangeProgress(progress, 0.24, 0.42)) : 0;
  const gulpWindup = progress < 0.58 ? easeInCubic(rangeProgress(progress, 0.28, 0.58)) : 0;
  const gulp = sharpPulse(progress, 0.6, 0.09);
  const satisfied = dampedSettle(progress, 0.62, 2.25);
  const forward = progress <= 0.62
    ? easeInCubic(rangeProgress(progress, 0.26, 0.62))
    : 1 - easeOutCubic(rangeProgress(progress, 0.62, 1));
  return {
    offsetX: (forward * 7 - anticipation * 2) * motionScale,
    lift: Math.sin(rangeProgress(progress, 0.28, 0.72) * Math.PI) * 2.2 * motionScale,
    scaleX: (-anticipation * 0.055 + gulpWindup * 0.075 + gulp * 0.14 + satisfied * 0.028) * motionScale,
    scaleY: (anticipation * 0.045 - gulpWindup * 0.055 - gulp * 0.12 - satisfied * 0.022) * motionScale,
    angle: (anticipation * 1.4 - forward * 2.1 + satisfied * 1.7) * motionScale,
  };
}

type PipploAnimation = "idle" | "summon" | "hit" | "devour" | "defeat";

const PIPPLO_ANIMATIONS: Record<PipploAnimation, { frames: number; fps: number; loop: boolean }> = {
  idle: { frames: 16, fps: 8, loop: true },
  summon: { frames: 8, fps: 8.5, loop: false },
  hit: { frames: 12, fps: 14, loop: false },
  devour: { frames: 16, fps: 11, loop: false },
  defeat: { frames: 8, fps: 8.7, loop: false },
};

function pipploTextureKey(animation: PipploAnimation): string {
  return `pipplo-whole-sprite-sheet-${animation}`;
}

const FRIENDLY_UNIT_KINDS = new Set<CastleUnitKind>(["piplet", "dartlet", "bubbleBud", "mendlet", "spitlet", "bigChonk"]);

type LeaderForm = "pipplo" | "mallow" | "clackback" | "puffmaestro" | "thumblestump" | "broodle";
type GeneralForm = Exclude<LeaderForm, "pipplo">;
type GeneralAction = "idle" | "summon" | "hit" | "special";

interface GeneralMotionProfile {
  axis: MotionAxis;
  summonDuration: number;
  hitDuration: number;
  specialDuration: number;
  specialReleaseAt: number;
  anticipationEnd: number;
  impactAt: number;
  travel: number;
  windup: number;
  lift: number;
  preImpactStretch: number;
  impactSquash: number;
  recoil: number;
  angle: number;
  idleBob: number;
  idleSquash: number;
  idleTilt: number;
  hitRecoil: number;
}

const GENERAL_MOTION_PROFILES: Record<GeneralForm, GeneralMotionProfile> = {
  clackback: { axis: "horizontal", summonDuration: 0.58, hitDuration: 0.48, specialDuration: 0.9, specialReleaseAt: 0.62, anticipationEnd: 0.22, impactAt: 0.6, travel: 9, windup: 5, lift: 3, preImpactStretch: 0.06, impactSquash: 0.08, recoil: 5, angle: 5, idleBob: 1.5, idleSquash: 0.01, idleTilt: 0.55, hitRecoil: 6 },
  puffmaestro: { axis: "radial", summonDuration: 0.76, hitDuration: 0.54, specialDuration: 1.08, specialReleaseAt: 0.68, anticipationEnd: 0.28, impactAt: 0.68, travel: 3, windup: 2, lift: 12, preImpactStretch: 0.08, impactSquash: 0.07, recoil: 2, angle: 2.5, idleBob: 2.8, idleSquash: 0.014, idleTilt: 0.7, hitRecoil: 5 },
  thumblestump: { axis: "vertical", summonDuration: 0.72, hitDuration: 0.56, specialDuration: 1.02, specialReleaseAt: 0.7, anticipationEnd: 0.28, impactAt: 0.7, travel: 5, windup: 5, lift: 6, preImpactStretch: 0.09, impactSquash: 0.15, recoil: 2, angle: 2, idleBob: 1.2, idleSquash: 0.009, idleTilt: 0.35, hitRecoil: 4 },
  broodle: { axis: "radial", summonDuration: 0.66, hitDuration: 0.5, specialDuration: 0.94, specialReleaseAt: 0.6, anticipationEnd: 0.24, impactAt: 0.62, travel: 6, windup: 4, lift: 8, preImpactStretch: 0.09, impactSquash: 0.1, recoil: 4, angle: 6, idleBob: 2.2, idleSquash: 0.013, idleTilt: 0.75, hitRecoil: 6 },
  mallow: { axis: "radial", summonDuration: 0.82, hitDuration: 0.52, specialDuration: 1.14, specialReleaseAt: 0.72, anticipationEnd: 0.3, impactAt: 0.7, travel: 2, windup: 1, lift: 14, preImpactStretch: 0.065, impactSquash: 0.055, recoil: 2, angle: 2.2, idleBob: 3.2, idleSquash: 0.012, idleTilt: 0.6, hitRecoil: 5 },
};

interface GeneralDefeatProfile {
  angle: number;
  slide: number;
  drop: number;
  widen: number;
  squash: number;
}

const GENERAL_DEFEAT_PROFILES: Record<GeneralForm, GeneralDefeatProfile> = {
  clackback: { angle: 17, slide: 10, drop: 6, widen: 0.035, squash: 0.09 },
  puffmaestro: { angle: 18, slide: 9, drop: 13, widen: 0.015, squash: 0.055 },
  thumblestump: { angle: 9, slide: 5, drop: 8, widen: 0.055, squash: 0.13 },
  broodle: { angle: 20, slide: 11, drop: 7, widen: 0.025, squash: 0.075 },
  mallow: { angle: 20, slide: 10, drop: 15, widen: 0.012, squash: 0.05 },
};

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

function generalMotion(form: GeneralForm, action: GeneralAction, progress: number, phase: number, motionScale: number): WholeSpriteMotion {
  const profile = GENERAL_MOTION_PROFILES[form];
  if (action === "idle") {
    const bob = Math.sin(phase * 1.12);
    const squash = Math.sin(phase * 1.9);
    return {
      offsetX: 0,
      lift: bob * profile.idleBob * motionScale,
      scaleX: squash * profile.idleSquash * motionScale,
      scaleY: -squash * profile.idleSquash * 0.8 * motionScale,
      angle: Math.sin(phase * 0.5) * profile.idleTilt * motionScale,
    };
  }

  if (action === "hit") {
    const impact = sharpPulse(progress, 0.09, 0.11);
    const recoil = progress < 0.7 ? Math.sin(rangeProgress(progress, 0.04, 0.7) * Math.PI) : 0;
    const settle = dampedSettle(progress, 0.22, profile.axis === "vertical" ? 1.8 : 2.5);
    return {
      offsetX: -(impact * profile.hitRecoil + recoil * profile.hitRecoil * 0.5) * motionScale,
      lift: recoil * (profile.axis === "radial" ? 2.4 : 1.2) * motionScale,
      scaleX: (-impact * 0.075 + recoil * 0.025 + settle * 0.015) * motionScale,
      scaleY: (impact * 0.085 - recoil * 0.02 - settle * 0.012) * motionScale,
      angle: (-impact * profile.angle - recoil * profile.angle * 0.5 + settle * profile.angle * 0.55) * motionScale,
    };
  }

  if (action === "special") {
    const releaseAt = profile.specialReleaseAt;
    const anticipation = progress < releaseAt
      ? smoothStep(rangeProgress(progress, 0, releaseAt))
      : 1 - easeOutCubic(rangeProgress(progress, releaseAt, 0.84));
    const preRelease = progress < releaseAt ? easeInCubic(rangeProgress(progress, Math.max(0, releaseAt - 0.2), releaseAt)) : 0;
    const release = sharpPulse(progress, releaseAt, 0.075);
    const settle = dampedSettle(progress, releaseAt, form === "thumblestump" ? 1.7 : 2.5);
    const postRelease = Math.sin(rangeProgress(progress, releaseAt, 1) * Math.PI);
    if (form === "clackback") {
      return {
        offsetX: (-anticipation * 5 + preRelease * 13 - postRelease * 4) * motionScale,
        lift: Math.sin(rangeProgress(progress, 0.22, releaseAt) * Math.PI) * 2 * motionScale,
        scaleX: (-anticipation * 0.08 + preRelease * 0.14 + release * 0.08 + settle * 0.025) * motionScale,
        scaleY: (anticipation * 0.09 - preRelease * 0.06 - release * 0.07 - settle * 0.018) * motionScale,
        angle: (-anticipation * 4 + preRelease * 6 + settle * 2.5) * motionScale,
      };
    }
    if (form === "puffmaestro") {
      return {
        offsetX: settle * 2 * motionScale,
        lift: (anticipation * 11 + Math.sin(rangeProgress(progress, 0.18, releaseAt) * Math.PI) * 5 - postRelease * 3) * motionScale,
        scaleX: (anticipation * 0.13 + preRelease * 0.05 + release * 0.1 + settle * 0.03) * motionScale,
        scaleY: (anticipation * 0.1 + preRelease * 0.04 - release * 0.12 - settle * 0.02) * motionScale,
        angle: (anticipation * -2 + settle * 3) * motionScale,
      };
    }
    if (form === "thumblestump") {
      const airborne = progress > 0.26 && progress < releaseAt
        ? Math.sin(rangeProgress(progress, 0.26, releaseAt) * Math.PI) : 0;
      return {
        offsetX: settle * 1.5 * motionScale,
        lift: airborne * 20 * motionScale,
        scaleX: (anticipation * 0.08 - preRelease * 0.16 + release * 0.2 + settle * 0.02) * motionScale,
        scaleY: (-anticipation * 0.07 + preRelease * 0.2 - release * 0.18 - settle * 0.015) * motionScale,
        angle: settle * 1.8 * motionScale,
      };
    }
    if (form === "broodle") {
      const firstDrum = sharpPulse(progress, 0.34, 0.1);
      const secondDrum = sharpPulse(progress, releaseAt, 0.09);
      return {
        offsetX: (firstDrum * -3 + secondDrum * 5 + settle * 2) * motionScale,
        lift: (firstDrum * 4 + secondDrum * 7) * motionScale,
        scaleX: (firstDrum * 0.1 + secondDrum * 0.14 + settle * 0.025) * motionScale,
        scaleY: (-firstDrum * 0.09 - secondDrum * 0.12 - settle * 0.018) * motionScale,
        angle: (-firstDrum * 6 + secondDrum * 8 + settle * 4) * motionScale,
      };
    }
    return {
      offsetX: (preRelease * 4 - postRelease * 2) * motionScale,
      lift: (Math.sin(rangeProgress(progress, 0.14, 0.86) * Math.PI) * 15 + anticipation * 3) * motionScale,
      scaleX: (anticipation * 0.07 + preRelease * 0.04 + release * 0.08 + settle * 0.02) * motionScale,
      scaleY: (anticipation * 0.05 + preRelease * 0.08 - release * 0.1 - settle * 0.015) * motionScale,
      angle: (-anticipation * 3.5 + preRelease * 5 + settle * 2) * motionScale,
    };
  }

  const anticipation = progress < profile.anticipationEnd
    ? smoothStep(rangeProgress(progress, 0, profile.anticipationEnd))
    : progress < profile.impactAt
      ? 1 - easeOutCubic(rangeProgress(progress, profile.anticipationEnd, profile.impactAt))
      : 0;
  const forward = progress <= profile.impactAt
    ? easeInCubic(rangeProgress(progress, profile.anticipationEnd, profile.impactAt))
    : 1 - easeOutCubic(rangeProgress(progress, profile.impactAt, 1));
  const preImpact = progress < profile.impactAt
    ? easeInCubic(rangeProgress(progress, Math.max(profile.anticipationEnd, profile.impactAt - 0.16), profile.impactAt))
    : 0;
  const impact = sharpPulse(progress, profile.impactAt, 0.07);
  const settle = dampedSettle(progress, profile.impactAt, profile.axis === "radial" ? 2.75 : 2);
  const jumpT = rangeProgress(progress, profile.anticipationEnd, profile.impactAt);
  const airborne = progress > profile.anticipationEnd && progress < profile.impactAt ? Math.sin(jumpT * Math.PI) : 0;
  const axisLift = profile.axis === "vertical" ? 0.55 : profile.axis === "radial" ? 1 : 0.2;

  let scaleX = 0;
  let scaleY = 0;
  if (profile.axis === "vertical") {
    scaleX = anticipation * 0.06 - preImpact * profile.preImpactStretch + impact * profile.impactSquash + settle * 0.018;
    scaleY = -anticipation * 0.05 + preImpact * profile.preImpactStretch * 1.2 - impact * profile.impactSquash + settle * -0.014;
  } else if (profile.axis === "horizontal") {
    scaleX = -anticipation * 0.045 + preImpact * profile.preImpactStretch + impact * profile.impactSquash * 0.45 + settle * 0.018;
    scaleY = anticipation * 0.04 - preImpact * profile.preImpactStretch * 0.45 - impact * profile.impactSquash * 0.35 + settle * -0.012;
  } else {
    scaleX = anticipation * profile.preImpactStretch * 0.55 + preImpact * 0.025 + impact * profile.impactSquash + settle * 0.02;
    scaleY = anticipation * profile.preImpactStretch * 0.55 + preImpact * 0.025 - impact * profile.impactSquash * 0.8 + settle * -0.015;
  }
  return {
    offsetX: (forward * profile.travel - anticipation * profile.windup - Math.sin(rangeProgress(progress, profile.impactAt, 1) * Math.PI) * profile.recoil) * motionScale,
    lift: airborne * profile.lift * axisLift * motionScale,
    scaleX: scaleX * motionScale,
    scaleY: scaleY * motionScale,
    angle: (-anticipation * profile.angle + forward * profile.angle * 0.25 + settle * profile.angle * 0.55) * motionScale,
  };
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

function unitTextureKey(kind: CastleUnitKind, animation: UnitAnimation): string {
  return `goo-unit-sheet-${kind}-${animation}`;
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
  private generalAction: GeneralAction = "idle";
  private generalActionClock = 0;
  private defeated = false;
  private defeatClock = 0;
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
    this.pipploSprite = scene.add.image(0, 0, pipploTextureKey("idle"), 0).setOrigin(0.5, 246 / 256).setScale(0.75).setFlipX(true);
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
    this.playGeneralAction("hit");
    this.playPipploAction("hit");
  }

  summon(): void {
    this.playGeneralAction("summon");
    this.playPipploAction("summon");
  }

  special(): number {
    if (!this.generalSprite) return 0;
    const profile = GENERAL_MOTION_PROFILES[this.form as GeneralForm];
    this.playGeneralAction("special");
    return profile.specialDuration * profile.specialReleaseAt * 1_000;
  }

  devour(): void {
    this.playPipploAction("devour");
  }

  defeat(): void {
    this.defeated = true;
    this.defeatClock = 0;
    if (this.pipploSprite) {
      this.pipploAnimation = "defeat";
      this.pipploClock = 0;
      this.pipploFrame = -1;
    }
  }

  private playGeneralAction(action: Exclude<GeneralAction, "idle">): void {
    if (!this.generalSprite) return;
    this.generalAction = action;
    this.generalActionClock = 0;
  }

  private playPipploAction(animation: Exclude<PipploAnimation, "idle">): void {
    if (!this.pipploSprite) return;
    this.pipploAnimation = animation;
    this.pipploClock = 0;
    this.pipploFrame = -1;
  }

  previewAction(action: "hit" | "summon" | "eat" | "defeat" | "special", progress: number): void {
    const clamped = Phaser.Math.Clamp(progress, 0, 0.995);
    if (action === "defeat") {
      this.defeat();
      this.defeatClock = LEADER_DEFEAT_SECONDS * clamped;
      return;
    }
    if (this.pipploSprite) {
      if (action === "special") return;
      const animation: Exclude<PipploAnimation, "idle"> = action === "eat" ? "devour" : action;
      this.pipploAnimation = animation;
      this.pipploClock = (PIPPLO_ANIMATIONS[animation].frames / PIPPLO_ANIMATIONS[animation].fps) * clamped;
      this.pipploFrame = -1;
      return;
    }
    if (action === "eat") return;
    const form = this.form as GeneralForm;
    const profile = GENERAL_MOTION_PROFILES[form];
    this.generalAction = action;
    const duration = action === "summon" ? profile.summonDuration
      : action === "special" ? profile.specialDuration : profile.hitDuration;
    this.generalActionClock = duration * clamped;
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  update(deltaSeconds: number, live: boolean, reducedMotion: boolean): void {
    this.phase += deltaSeconds * (live ? 2.45 : 0.82);
    const motionScale = reducedMotion ? 0.24 : 1;
    const healthDroop = (1 - this.hpRatio) * 7;
    const facing = this.side === "enemy" ? -1 : 1;
    if (this.defeated) {
      this.defeatClock = Math.min(LEADER_DEFEAT_SECONDS, this.defeatClock + deltaSeconds);
      const progress = this.defeatClock / LEADER_DEFEAT_SECONDS;
      const brace = progress < 0.16 ? smoothStep(rangeProgress(progress, 0, 0.16)) : 0;
      const collapse = easeOutCubic(rangeProgress(progress, 0.14, 0.78));
      const settle = dampedSettle(progress, 0.68, 2);
      const reducedScale = reducedMotion ? 0.42 : 1;
      const authoredPipploDefeat = !!this.pipploSprite;
      const generalDefeat = authoredPipploDefeat ? null : GENERAL_DEFEAT_PROFILES[this.form as GeneralForm];
      if (this.pipploSprite) {
        const defeatFrame = reducedMotion
          ? (progress < 0.5 ? 2 : PIPPLO_ANIMATIONS.defeat.frames)
          : Math.min(PIPPLO_ANIMATIONS.defeat.frames, Math.floor(progress * PIPPLO_ANIMATIONS.defeat.frames) + 1);
        if (defeatFrame !== this.pipploFrame) {
          this.pipploFrame = defeatFrame;
          this.pipploSprite.setTexture(pipploTextureKey("defeat"), defeatFrame - 1);
        }
      }
      const proceduralStrength = authoredPipploDefeat ? 0 : reducedScale;
      this.root
        .setPosition(
          this.homeX - facing * collapse * (generalDefeat?.slide || 0) * proceduralStrength,
          GROUND_Y + healthDroop + collapse * (generalDefeat?.drop || 0) * proceduralStrength,
        )
        .setScale(
          facing * this.visualScale * (1 - brace * 0.04 * proceduralStrength + collapse * (generalDefeat?.widen || 0) * proceduralStrength + settle * 0.01),
          this.visualScale * (1 + brace * 0.05 * proceduralStrength - collapse * (generalDefeat?.squash || 0) * proceduralStrength - settle * 0.008),
        )
        .setAngle(facing * (-brace * 1.5 * proceduralStrength - collapse * (generalDefeat?.angle || 0) * proceduralStrength + settle * 1.2));
      const shadowWiden = authoredPipploDefeat ? 0.08 : ((generalDefeat?.widen || 0) * 1.8 + 0.04) * proceduralStrength;
      const shadowSquash = authoredPipploDefeat ? 0.18 : ((generalDefeat?.squash || 0) * 0.8 + 0.06) * proceduralStrength;
      this.shadow
        .setPosition(this.homeX, GROUND_Y + 3)
        .setScale(this.visualScale * (1 + collapse * shadowWiden), this.visualScale * (1 - collapse * shadowSquash))
        .setAlpha(1 - collapse * 0.16);
      return;
    }
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
        this.pipploSprite.setTexture(pipploTextureKey(this.pipploAnimation), nextFrame - 1);
      }

      // Each action gets its own anticipation, impact, and recovery curve.
      // The complete authored sprite still moves as one object between frames.
      const motion = pipploMotion(this.pipploAnimation, actionProgress, this.pipploClock, motionScale);
      this.root
        .setPosition(this.homeX + motion.offsetX * facing, GROUND_Y + healthDroop - motion.lift)
        .setScale(
          facing * this.visualScale * (1 + motion.scaleX),
          this.visualScale * (1 + motion.scaleY),
        )
        .setAngle(motion.angle * facing);
      this.shadow
        .setPosition(this.homeX, GROUND_Y + 3)
        .setScale(this.visualScale * (1 - motion.lift * 0.018 + Math.max(0, motion.scaleX) * 0.2), this.visualScale * (1 - motion.lift * 0.01))
        .setAlpha(1 - Math.min(0.32, motion.lift * 0.025));
      return;
    }

    const form = this.form as GeneralForm;
    const profile = GENERAL_MOTION_PROFILES[form];
    if (this.generalAction !== "idle") {
      this.generalActionClock += deltaSeconds;
      const duration = this.generalAction === "summon" ? profile.summonDuration
        : this.generalAction === "special" ? profile.specialDuration : profile.hitDuration;
      if (this.generalActionClock >= duration) {
        this.generalAction = "idle";
        this.generalActionClock = 0;
      }
    }
    const actionDuration = this.generalAction === "summon" ? profile.summonDuration
      : this.generalAction === "special" ? profile.specialDuration : profile.hitDuration;
    const actionProgress = this.generalAction === "idle" ? 0 : Phaser.Math.Clamp(this.generalActionClock / actionDuration, 0, 1);
    const motion = generalMotion(form, this.generalAction, actionProgress, this.phase, motionScale);
    this.root
      .setPosition(this.homeX + motion.offsetX * facing, GROUND_Y + healthDroop - motion.lift)
      .setScale(
        facing * this.visualScale * (1 + motion.scaleX),
        this.visualScale * (1 + motion.scaleY),
      )
      .setAngle(motion.angle * facing);
    this.shadow
      .setPosition(this.homeX, GROUND_Y + 3)
      .setScale(this.visualScale * (1 - Math.abs(motion.lift) / 34 + Math.max(0, motion.scaleX) * 0.2), this.visualScale * (1 - Math.abs(motion.lift) / 48))
      .setAlpha(1 - Math.min(0.3, Math.max(0, motion.lift) * 0.018));
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
  private readonly profile: UnitMotionProfile;
  private readonly barY: number;
  private x: number;
  private y: number;
  private vx = 0;
  private phase = Math.random() * Math.PI * 2;
  private lastHp: number;
  private attackSignal = 0;
  private hitSignal = 0;
  private spawnSignal: number;
  private defeatPreview: number | null = null;
  private textureState = "";
  private retired = false;

  constructor(scene: Phaser.Scene, unit: CastleUnitState, spawnX: number) {
    this.scene = scene;
    this.side = unit.side;
    this.kind = unit.kind;
    this.profile = UNIT_MOTION_PROFILES[unit.kind];
    this.spawnSignal = this.profile.spawnDuration;
    this.x = spawnX;
    this.y = GROUND_Y + 1;
    this.lastHp = unit.hp;
    const config = UNIT_WHOLE_SPRITE_CONFIGS[unit.kind];
    const texture = unitTextureKey(unit.kind, "walk");
    this.shadow = scene.add.ellipse(0, 3, unit.kind === "rootLump" || unit.kind === "bigChonk" ? 58 : 45, 11, 0x163f46, 0.19);
    this.artRoot = scene.add.container(0, 0);
    this.artSprite = scene.add.image(0, 0, texture, 0).setOrigin(0.5, config.originY).setScale(config.scale);
    this.artRoot.add(this.artSprite).setScale(unit.side === "enemy" ? -1 : 1, 1);
    this.hpBar = scene.add.graphics();
    this.barY = unit.kind === "rootLump" || unit.kind === "bigChonk" ? -76 : -61;
    this.badge = scene.add.text(0, this.barY - 9, "", { fontFamily: "Nunito, sans-serif", fontSize: "9px", fontStyle: "bold", color: "#ffffff", stroke: "#194f53", strokeThickness: 3 }).setOrigin(0.5);
    this.container = scene.add.container(this.x, this.y, [this.shadow, this.artRoot, this.hpBar, this.badge]).setDepth(12);
    this.container.setAlpha(0);
  }

  update(unit: CastleUnitState, targetX: number, deltaSeconds: number, live: boolean, reducedMotion: boolean): void {
    if (this.retired) return;
    const motion = reducedMotion ? 0.35 : 1;
    const profile = this.profile;
    this.vx += (targetX - this.x) * 35 * deltaSeconds;
    this.vx *= Math.pow(0.012, deltaSeconds);
    this.x += this.vx * deltaSeconds;
    this.phase += deltaSeconds * (live ? 5.2 : 1.1);

    if (unit.hp < this.lastHp) {
      this.scene.tweens.add({ targets: this.artRoot, alpha: 0.25, yoyo: true, duration: 70, repeat: 1, onComplete: () => this.artRoot.setAlpha(1) });
      this.hitSignal = UNIT_HIT_ANIMATION_SECONDS;
    }
    this.lastHp = unit.hp;
    if (unit.attackCooldownMs > CASTLE_UNIT_DEFS[unit.kind].attackMs - 170 && this.attackSignal <= 0) {
      this.attackSignal = profile.duration;
    }
    this.attackSignal = Math.max(0, this.attackSignal - deltaSeconds);
    this.hitSignal = Math.max(0, this.hitSignal - deltaSeconds);
    this.spawnSignal = Math.max(0, this.spawnSignal - deltaSeconds);

    const attacking = this.attackSignal > 0;
    const attackProgress = attacking ? 1 - this.attackSignal / profile.duration : 0;
    const animation: UnitAnimation = attacking ? "attack" : "walk";
    const frame = reducedMotion
      ? attacking ? (attackProgress < profile.impactAt ? 2 : UNIT_ANIMATION_FRAMES) : 1
      : attacking
        ? animationFrameForBeats(attackProgress, profile.frameBeats)
        : Math.floor(this.phase * profile.walkRate) % UNIT_ANIMATION_FRAMES + 1;
    const nextTexture = `${animation}:${frame}`;
    if (nextTexture !== this.textureState) {
      this.textureState = nextTexture;
      this.artSprite.setTexture(unitTextureKey(this.kind, animation), frame - 1);
    }

    const walkPhase = this.phase * profile.walkRate;
    const bob = Math.sin(walkPhase) * profile.walkBob * motion;
    const walkSquash = Math.sin(walkPhase * 2) * profile.walkStretch * motion;
    const movementStretch = Math.min(0.1, Math.abs(this.vx) / 700) * motion;
    const facing = this.side === "enemy" ? -1 : 1;

    const spawning = this.spawnSignal > 0;
    const spawnProgress = spawning ? 1 - this.spawnSignal / profile.spawnDuration : 1;
    const spawnRelease = easeOutCubic(rangeProgress(spawnProgress, 0.04, 0.58));
    const spawnArcProgress = rangeProgress(spawnProgress, 0.12, 0.7);
    const spawnArc = spawnProgress > 0.12 && spawnProgress < 0.7 ? Math.sin(spawnArcProgress * Math.PI) : 0;
    const spawnPreImpact = spawnProgress < 0.7 ? easeInCubic(rangeProgress(spawnProgress, 0.53, 0.7)) : 0;
    const spawnImpact = sharpPulse(spawnProgress, 0.71, 0.08);
    const spawnSettle = dampedSettle(spawnProgress, 0.7, profile.axis === "radial" ? 2.75 : 2.1);
    const spawnStartScale = reducedMotion ? 0.7 : profile.axis === "radial" ? 0.12 : 0.24;
    let spawnScaleX = spawnStartScale + (1 - spawnStartScale) * spawnRelease;
    let spawnScaleY = spawnStartScale + (1 - spawnStartScale) * spawnRelease;
    let spawnAngle = 0;
    if (spawning && !reducedMotion) {
      if (profile.axis === "vertical") {
        spawnScaleX += spawnPreImpact * -0.12 + spawnImpact * 0.17 + spawnSettle * 0.022;
        spawnScaleY += spawnPreImpact * 0.17 - spawnImpact * 0.15 - spawnSettle * 0.018;
        spawnAngle = facing * (spawnSettle * profile.angle * 0.45);
      } else if (profile.axis === "horizontal") {
        spawnScaleX += spawnPreImpact * 0.15 + spawnImpact * 0.08 + spawnSettle * 0.02;
        spawnScaleY += spawnPreImpact * -0.08 - spawnImpact * 0.07 - spawnSettle * 0.014;
        spawnAngle = facing * (-5 * (1 - spawnRelease) + spawnSettle * profile.angle * 0.65);
      } else {
        const inflate = Math.sin(rangeProgress(spawnProgress, 0.04, 0.58) * Math.PI) * 0.12;
        spawnScaleX += inflate + spawnImpact * 0.13 + spawnSettle * 0.025;
        spawnScaleY += inflate - spawnImpact * 0.11 - spawnSettle * 0.018;
        spawnAngle = facing * spawnSettle * profile.angle * 0.4;
      }
    }
    const spawnLiftFactor = profile.axis === "horizontal" ? 0.42 : profile.axis === "radial" ? 0.82 : 1;
    const spawnAirborne = spawning ? spawnArc * profile.spawnLift * spawnLiftFactor * motion : 0;
    const spawnOffset = spawning
      ? -facing * (1 - spawnRelease) * (profile.axis === "horizontal" ? 12 : 5) * motion
      : 0;
    const spawnAlpha = spawning ? smoothStep(rangeProgress(spawnProgress, 0, reducedMotion ? 0.18 : 0.1)) : 1;

    let lunge = 0;
    let airborne = 0;
    let attackScaleX = 0;
    let attackScaleY = 0;
    let attackAngle = 0;
    if (attacking) {
      const anticipation = attackProgress < profile.anticipationEnd
        ? smoothStep(rangeProgress(attackProgress, 0, profile.anticipationEnd))
        : attackProgress < profile.impactAt
          ? 1 - easeOutCubic(rangeProgress(attackProgress, profile.anticipationEnd, profile.impactAt))
          : 0;
      const forward = attackProgress <= profile.impactAt
        ? easeInCubic(rangeProgress(attackProgress, profile.anticipationEnd, profile.impactAt))
        : 1 - easeOutCubic(rangeProgress(attackProgress, profile.impactAt, 1));
      const preImpactStart = Math.max(profile.anticipationEnd, profile.impactAt - 0.16);
      const preImpact = attackProgress < profile.impactAt
        ? easeInCubic(rangeProgress(attackProgress, preImpactStart, profile.impactAt))
        : 0;
      const impact = sharpPulse(attackProgress, profile.impactAt, 0.065);
      const postImpact = rangeProgress(attackProgress, profile.impactAt, 1);
      const recoil = attackProgress >= profile.impactAt ? Math.sin(postImpact * Math.PI) * profile.recoil : 0;
      const settle = dampedSettle(attackProgress, profile.impactAt, profile.axis === "radial" ? 3 : 2.25);
      const jumpProgress = rangeProgress(attackProgress, profile.anticipationEnd, profile.impactAt);
      const liftFactor = attackProgress > profile.anticipationEnd && attackProgress < profile.impactAt
        ? Math.sin(jumpProgress * Math.PI)
        : 0;
      const axisLift = profile.axis === "vertical" ? 1 : profile.axis === "radial" ? 0.65 : 0.28;

      lunge = facing * (forward * profile.travel - anticipation * profile.windup - recoil);
      airborne = liftFactor * profile.lift * axisLift * motion;

      if (profile.axis === "vertical") {
        attackScaleX = anticipation * 0.08 - preImpact * profile.preImpactStretch + impact * profile.impactSquash + settle * 0.025;
        attackScaleY = -anticipation * 0.08 + preImpact * profile.preImpactStretch * 1.25 - impact * profile.impactSquash * 1.08 - settle * 0.02;
      } else if (profile.axis === "horizontal") {
        attackScaleX = -anticipation * 0.06 + preImpact * profile.preImpactStretch * 1.2 + impact * profile.impactSquash * 0.45 + settle * 0.02;
        attackScaleY = anticipation * 0.06 - preImpact * profile.preImpactStretch * 0.5 - impact * profile.impactSquash * 0.4 - settle * 0.015;
      } else {
        const charge = anticipation * profile.preImpactStretch * 0.7;
        attackScaleX = charge + preImpact * profile.preImpactStretch * 0.35 + impact * profile.impactSquash + settle * 0.025;
        attackScaleY = charge + preImpact * profile.preImpactStretch * 0.35 - impact * profile.impactSquash * 0.85 - settle * 0.02;
      }
      attackAngle = facing * (-anticipation * profile.angle + forward * profile.angle * 0.32 + settle * profile.angle * 0.55) * motion;
    }

    const hitActive = this.hitSignal > 0;
    const hitProgress = hitActive ? 1 - this.hitSignal / UNIT_HIT_ANIMATION_SECONDS : 0;
    const hitImpact = hitActive ? sharpPulse(hitProgress, 0.1, 0.12) : 0;
    const hitRecovery = hitActive ? Math.sin(hitProgress * Math.PI) * Math.exp(-1.25 * hitProgress) : 0;
    const hitOffset = -facing * (hitImpact * profile.hitRecoil + hitRecovery * profile.hitRecoil * 0.45) * motion;
    const hitScaleX = -hitImpact * 0.11 + hitRecovery * 0.035;
    const hitScaleY = hitImpact * 0.09 - hitRecovery * 0.025;
    const hitAngle = -facing * (hitImpact * 7 + hitRecovery * 4) * motion;

    this.container
      .setPosition(this.x + lunge + hitOffset + spawnOffset, this.y + bob - profile.idleLift - airborne - spawnAirborne)
      .setAlpha(spawnAlpha);
    this.artRoot
      .setScale(
        facing * spawnScaleX * (1 + movementStretch + walkSquash + attackScaleX + hitScaleX),
        spawnScaleY * (1 - movementStretch * 0.65 - walkSquash * 0.7 + attackScaleY + hitScaleY),
      )
      .setAngle(
        Math.sin(walkPhase * 0.5) * profile.walkTilt * motion
        + Phaser.Math.Clamp(this.vx / 90, -5, 5)
        + attackAngle
        + hitAngle
        + spawnAngle,
      );

    const totalAirborne = airborne + spawnAirborne;
    const liftRatio = Math.max(
      profile.lift > 0 ? airborne / profile.lift : 0,
      profile.spawnLift > 0 ? spawnAirborne / profile.spawnLift : 0,
    );
    this.shadow
      .setY(3 - bob + profile.idleLift + totalAirborne)
      .setScale(1 - Math.abs(bob) / 22 - liftRatio * 0.18 + Math.max(0, attackScaleX) * 0.25, 1 - liftRatio * 0.1)
      .setAlpha(spawnAlpha * (1 - liftRatio * 0.38));
    this.drawStatus(unit);
    const showStatus = !spawning || spawnProgress > 0.76;
    this.hpBar.setVisible(showStatus);
    this.badge.setVisible(showStatus);
    if (this.defeatPreview !== null) {
      const defeat = UNIT_DEFEAT_PROFILES[this.kind];
      const progress = easeOutCubic(this.defeatPreview);
      const targetScaleX = reducedMotion ? 0.86 : defeat.scaleX;
      const targetScaleY = reducedMotion ? 0.86 : defeat.scaleY;
      const defeatStrength = reducedMotion ? 0.35 : 1;
      this.container
        .setPosition(
          this.x + facing * defeat.slide * progress * defeatStrength,
          this.y + defeat.drop * progress * (reducedMotion ? 0.45 : 1),
        )
        .setAlpha(1 - progress * 0.38);
      this.artRoot
        .setScale(
          facing * Phaser.Math.Linear(1, targetScaleX, progress),
          Phaser.Math.Linear(1, targetScaleY, progress),
        )
        .setAngle(facing * defeat.angle * progress * defeatStrength);
      this.shadow
        .setPosition(0, 3)
        .setScale(Phaser.Math.Linear(1, this.kind === "boomcap" ? 1.3 : 0.35, progress), Phaser.Math.Linear(1, 0.45, progress))
        .setAlpha(1 - progress * 0.7);
      this.hpBar.setVisible(false);
      this.badge.setVisible(false);
    }
  }

  retire(reducedMotion: boolean): void {
    if (this.retired) return;
    this.retired = true;
    this.hpBar.setVisible(false);
    this.badge.setVisible(false);
    const facing = this.side === "enemy" ? -1 : 1;
    const profile = UNIT_DEFEAT_PROFILES[this.kind];
    const duration = reducedMotion ? 160 : profile.duration;
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + facing * profile.slide * (reducedMotion ? 0.3 : 1),
      y: this.y + profile.drop * (reducedMotion ? 0.45 : 1),
      alpha: 0,
      duration,
      ease: "Cubic.In",
    });
    this.scene.tweens.add({
      targets: this.artRoot,
      scaleX: facing * (reducedMotion ? 0.86 : profile.scaleX),
      scaleY: reducedMotion ? 0.86 : profile.scaleY,
      angle: facing * profile.angle * (reducedMotion ? 0.35 : 1),
      duration,
      ease: this.kind === "boomcap" ? "Back.Out" : "Cubic.In",
      onComplete: () => this.destroy(),
    });
    this.scene.tweens.add({ targets: this.shadow, scaleX: this.kind === "boomcap" ? 1.3 : 0.35, scaleY: 0.45, alpha: 0, duration });
  }

  previewAction(action: "attack" | "hit" | "spawn" | "defeat", progress: number): void {
    const clamped = Phaser.Math.Clamp(progress, 0, 0.999);
    if (action === "attack") this.attackSignal = this.profile.duration * (1 - clamped);
    else if (action === "hit") this.hitSignal = UNIT_HIT_ANIMATION_SECONDS * (1 - clamped);
    else if (action === "spawn") this.spawnSignal = this.profile.spawnDuration * (1 - clamped);
    else this.defeatPreview = clamped;
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
  private debugFxBeat = -1;

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
    for (const kind of Object.keys(UNIT_ASSET_ROOTS) as CastleUnitKind[]) {
      for (const animation of ["walk", "attack"] satisfies UnitAnimation[]) {
        this.load.spritesheet(
          unitTextureKey(kind, animation),
          `${import.meta.env.BASE_URL}assets/goo-keep/runtime-sheets/units/${kind}-${animation}.png`,
          { frameWidth: 160, frameHeight: 160 },
        );
      }
    }
    for (const [form, path] of Object.entries(GENERAL_TEXTURES) as Array<[Exclude<LeaderForm, "pipplo">, string]>) {
      this.load.image(generalTextureKey(form), `${import.meta.env.BASE_URL}assets/goo-keep/${path}`);
    }
    for (const [animation, config] of Object.entries(PIPPLO_ANIMATIONS) as Array<[PipploAnimation, typeof PIPPLO_ANIMATIONS[PipploAnimation]]>) {
      this.load.spritesheet(
        pipploTextureKey(animation),
        `${import.meta.env.BASE_URL}assets/goo-keep/runtime-sheets/pipplo/${animation}.png`,
        { frameWidth: 256, frameHeight: 256, endFrame: config.frames - 1 },
      );
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
      if (this.snapshot.phase === "lost") this.player.defeat();
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
    this.runDebugFx(time);
    this.syncFx();
  }

  private runDebugFx(time: number): void {
    if (!import.meta.env.DEV) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("fxAction");
    if (action !== "projectile" && action !== "heal" && action !== "shield") return;
    const requestedKind = params.get("unit");
    const fallbackKind: CastleUnitKind = action === "heal" ? "mendlet" : action === "shield" ? "bubbleBud" : "spitlet";
    const kind = requestedKind && requestedKind in CASTLE_UNIT_DEFS ? requestedKind as CastleUnitKind : fallbackKind;
    const side: CastleSide = FRIENDLY_UNIT_KINDS.has(kind) ? "player" : "enemy";
    const beat = Math.floor(time / 1_050);
    if (beat === this.debugFxBeat) return;
    this.debugFxBeat = beat;
    const sourcePosition = 50;
    const targetPosition = side === "player" ? 78 : 22;
    const source: CastleUnitState = {
      id: "sprite-qa-fx-source",
      side,
      kind,
      affix: null,
      hp: 10,
      maxHp: 10,
      shield: 0,
      position: sourcePosition,
      attackCooldownMs: CASTLE_UNIT_DEFS[kind].attackMs,
      slowMs: 0,
      damageBonus: 0,
      kills: 0,
      origin: side === "player" ? "paid" : "enemy",
      overfed: false,
    };
    const event: CastleFxEvent = {
      id: -beat,
      kind: action,
      side,
      position: targetPosition,
      fromPosition: sourcePosition,
      ttlMs: 1_000,
    };
    const x = this.laneX(targetPosition);
    const fromX = this.laneX(sourcePosition);
    if (action === "projectile") this.playUnitProjectile(event, source, x, fromX);
    else this.playUnitSupportFx(event, source, x, fromX);
  }

  private runDebugActions(time: number): void {
    if (!import.meta.env.DEV) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("rigAction");
    if (action !== "hit" && action !== "summon" && action !== "eat" && action !== "defeat" && action !== "special") return;
    const progressParam = params.get("rigActionProgress");
    const requestedProgress = progressParam === null ? Number.NaN : Number(progressParam);
    if (Number.isFinite(requestedProgress)) {
      const progress = Phaser.Math.Clamp(requestedProgress, 0, 0.995);
      this.player?.previewAction(action, progress);
      this.enemy?.previewAction(action, progress);
      return;
    }
    const beat = Math.floor(time / 1_100);
    if (beat === this.debugActionBeat) return;
    this.debugActionBeat = beat;
    if (action === "hit") {
      this.player?.hit();
      this.enemy?.hit();
    } else if (action === "summon") {
      this.player?.summon();
      this.enemy?.summon();
    } else if (action === "defeat") {
      this.player?.defeat();
      this.enemy?.defeat();
    } else if (action === "special") {
      this.enemy?.special();
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
        const progressParam = params.get("unitActionProgress");
        const requestedProgress = progressParam === null ? Number.NaN : Number(progressParam);
        const fixedProgress = Number.isFinite(requestedProgress) ? Phaser.Math.Clamp(requestedProgress, 0, 0.999) : null;
        const id = "sprite-qa-unit";
        for (const [existingId, rig] of this.unitRigs) {
          if (existingId === id) continue;
          rig.destroy();
          this.unitRigs.delete(existingId);
        }
        const def = CASTLE_UNIT_DEFS[kind];
        const cycleMs = this.time.now % 1_800;
        const hitFrame = fixedProgress === null && action === "hit" && cycleMs >= 800 && cycleMs < 1_550;
        const attackFrame = fixedProgress === null && action === "attack" && cycleMs >= 800 && cycleMs < 1_550;
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
        if (fixedProgress !== null && (action === "attack" || action === "hit" || action === "spawn" || action === "defeat")) rig.previewAction(action, fixedProgress);
        rig.update(unit, this.laneX(50), deltaSeconds, true, this.reducedMotion);
        return;
      }
    }
    const activeIds = new Set(this.snapshot.battle.units.map(unit => unit.id));
    for (const [id, rig] of this.unitRigs) {
      if (!activeIds.has(id)) {
        rig.retire(this.reducedMotion);
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
      let visualDelay = this.getUnitFxDelay(event);
      if (this.isGeneralSignatureFx(event)) {
        const releaseDelay = this.enemy?.special() || 0;
        visualDelay = Math.max(visualDelay, Math.round(releaseDelay * (this.reducedMotion ? 0.38 : 1)));
      }
      if (visualDelay > 0) this.time.delayedCall(visualDelay, () => this.playFx(event));
      else this.playFx(event);
    }
    if (this.handledFxIds.size > 160) {
      const latest = Math.max(...this.handledFxIds);
      this.handledFxIds = new Set(Array.from(this.handledFxIds).filter(id => id > latest - 80));
    }
  }

  private isGeneralSignatureFx(event: CastleFxEvent): boolean {
    if (event.side !== "enemy" || !event.label) return false;
    return ["Shell", "Spore", "Root", "Brood", "Moon"].some(token => event.label?.includes(token));
  }

  private findUnitFxSource(event: CastleFxEvent): CastleUnitState | undefined {
    const sourcePosition = event.fromPosition;
    if (sourcePosition !== undefined) {
      const source = this.snapshot.battle.units
        .filter(unit => unit.side === event.side && unit.hp > 0)
        .sort((a, b) => Math.abs(a.position - sourcePosition) - Math.abs(b.position - sourcePosition))[0];
      if (source && Math.abs(source.position - sourcePosition) <= 8) return source;
    }
    if (event.kind !== "hit") return undefined;
    return this.snapshot.battle.units
      .filter(unit => (
        unit.side === event.side
        && unit.hp > 0
        && unit.attackCooldownMs > CASTLE_UNIT_DEFS[unit.kind].attackMs * 0.55
        && Math.abs(unit.position - event.position) <= 12
      ))
      .sort((a, b) => Math.abs(a.position - event.position) - Math.abs(b.position - event.position))[0];
  }

  private getUnitFxDelay(event: CastleFxEvent): number {
    if (event.kind !== "hit" && event.kind !== "heal" && event.kind !== "shield") return 0;
    const source = this.findUnitFxSource(event);
    if (!source) return 0;
    const profile = UNIT_MOTION_PROFILES[source.kind];
    const motionScale = this.reducedMotion ? 0.38 : 1;
    const actionBeat = event.kind === "hit" ? profile.impactAt : profile.frameBeats[1];
    return Math.round(profile.duration * actionBeat * 1_000 * motionScale);
  }

  private playFx(event: CastleFxEvent): void {
    const x = this.laneX(event.position);
    const fromX = this.laneX(event.fromPosition ?? event.position);
    const source = this.findUnitFxSource(event);
    const hitLeader = () => {
      if (event.position <= 3) this.player?.hit();
      if (event.position >= 97) this.enemy?.hit();
    };
    if (event.kind === "hit") hitLeader();
    if (event.powerId) {
      this.playPowerFx(event.powerId, x, fromX);
      return;
    }
    if (event.kind === "power" && event.side === "enemy") this.playGeneralFx(event, x);
    let labelDelay = 0;
    if (event.kind === "projectile") {
      labelDelay = this.playUnitProjectile(event, source, x, fromX);
      if (event.position <= 3 || event.position >= 97) this.time.delayedCall(labelDelay, hitLeader);
    } else if (event.kind === "heal" || event.kind === "shield") {
      labelDelay = this.playUnitSupportFx(event, source, x, fromX);
    } else if (event.kind === "hit" || event.kind === "pop") {
      this.burst(x, GROUND_Y - 42, event.kind === "pop" ? 0xef86ae : 0xffe66d, event.kind === "pop" ? 10 : 6);
    } else if (event.kind === "power") {
      this.burst(x, GROUND_Y - 52, event.side === "player" ? 0xffd86a : 0xd58ce6, 12);
    }
    if (event.label) {
      const showLabel = () => {
        const label = this.add.text(x, GROUND_Y - 74, event.label || "", { fontFamily: "Nunito, sans-serif", fontSize: "17px", fontStyle: "bold", color: "#ffffff", stroke: "#194f53", strokeThickness: 5 }).setOrigin(0.5).setDepth(40);
        this.tweens.add({ targets: label, y: label.y - 34, alpha: 0, duration: 760, ease: "Cubic.Out", onComplete: () => label.destroy() });
      };
      if (labelDelay > 0) this.time.delayedCall(labelDelay, showLabel);
      else showLabel();
    }
  }

  private playUnitProjectile(event: CastleFxEvent, source: CastleUnitState | undefined, x: number, fromX: number): number {
    const duration = this.reducedMotion ? 170 : 390;
    const friendly = event.side === "player";
    const color = source?.kind === "sporeBud" ? 0xd77bb7
      : source?.kind === "echoMoth" ? 0x8175d5
        : source?.kind === "spitlet" ? 0xa785e5
          : friendly ? 0x68ead8 : 0xe392ee;
    let projectile: Phaser.GameObjects.GameObject;
    if (source?.kind === "sporeBud") {
      const spores = [
        this.add.circle(-7, 2, 6, 0xd77bb7, 0.9),
        this.add.circle(1, -5, 8, 0x96c976, 0.92),
        this.add.circle(8, 3, 5, 0xe9a8d2, 0.9),
      ];
      projectile = this.add.container(fromX, GROUND_Y - 55, spores).setDepth(30);
    } else if (source?.kind === "echoMoth") {
      const waves = [10, 16, 22].map(radius => this.add.arc(0, 0, radius, 225, 495, false).setStrokeStyle(3, 0xa99fe8, 0.86));
      projectile = this.add.container(fromX, GROUND_Y - 55, waves).setDepth(30);
    } else if (source?.kind === "spitlet") {
      projectile = this.add.ellipse(fromX, GROUND_Y - 55, 18, 10, color, 0.96).setAngle(friendly ? -12 : 12).setDepth(30);
    } else {
      projectile = this.add.circle(fromX, GROUND_Y - 55, 8, color, 1).setDepth(30);
    }
    this.tweens.add({
      targets: projectile,
      x,
      y: GROUND_Y - 48,
      scale: source?.kind === "echoMoth" ? 1.35 : 1.5,
      angle: source?.kind === "sporeBud" ? (friendly ? 110 : -110) : 0,
      duration,
      ease: source?.kind === "sporeBud" ? "Sine.InOut" : "Cubic.In",
      onComplete: () => {
        this.burst(x, GROUND_Y - 48, color, source?.kind === "sporeBud" ? 10 : 7);
        projectile.destroy();
      },
    });
    return duration;
  }

  private playUnitSupportFx(event: CastleFxEvent, source: CastleUnitState | undefined, x: number, fromX: number): number {
    const color = event.kind === "heal" ? 0x78dc83 : 0x79d5ef;
    const travelDuration = source ? (this.reducedMotion ? 150 : 360) : 0;
    const finish = () => {
      const ring = this.add.circle(x, GROUND_Y - 40, 16).setStrokeStyle(5, color, 0.9).setDepth(30);
      this.tweens.add({ targets: ring, y: GROUND_Y - 86, scale: 2.1, alpha: 0, duration: this.reducedMotion ? 280 : 620, onComplete: () => ring.destroy() });
      this.burst(x, GROUND_Y - 42, color, event.kind === "heal" ? 6 : 8);
    };
    if (!source) {
      finish();
      return 0;
    }
    const count = this.reducedMotion ? 1 : event.kind === "heal" ? 3 : 1;
    for (let index = 0; index < count; index += 1) {
      const particle = event.kind === "heal"
        ? this.add.ellipse(fromX, GROUND_Y - 50, 8, 12, color, 0.95).setDepth(31)
        : this.add.circle(fromX, GROUND_Y - 50, 13).setStrokeStyle(4, color, 0.9).setDepth(31);
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(fromX, GROUND_Y - 50),
        new Phaser.Math.Vector2((fromX + x) / 2, GROUND_Y - 100 - index * 8),
        new Phaser.Math.Vector2(x, GROUND_Y - 44),
      );
      const travel = { progress: 0 };
      this.tweens.add({
        targets: travel,
        progress: 1,
        duration: travelDuration,
        delay: index * 45,
        ease: "Sine.InOut",
        onUpdate: () => {
          const point = curve.getPoint(travel.progress);
          particle.setPosition(point.x, point.y).setScale(0.72 + travel.progress * 0.45);
        },
        onComplete: () => particle.destroy(),
      });
    }
    const arrival = travelDuration + (count - 1) * 45;
    this.time.delayedCall(arrival, finish);
    return arrival;
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
    this.enemy?.defeat();
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
