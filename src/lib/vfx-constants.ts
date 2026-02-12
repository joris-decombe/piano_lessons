/**
 * Constants for Dead Cells style VFX and Game Feel.
 */

export const HITSTOP_DURATION = 0.035; // seconds
export const HITSTOP_COOLDOWN = 200; // ms
export const HITSTOP_VELOCITY_THRESHOLD = 0.8;

export const PARTICLE_Z_MIN = 0;
export const PARTICLE_Z_MAX = 2.0;
export const PARTICLE_PLAY_PLANE = 1.0;

/** Scaling factor for particle physics and size based on Z depth */
export const getZScale = (z: number) => 0.5 + (z * 0.5);

/** God Ray Constants */
export const GOD_RAY_WIDTH = 120;
export const GOD_RAY_OPACITY_BASE = 0.04;
export const GOD_RAY_OPACITY_VARY = 0.02;

/** Bloom Thresholds */
export const BLOOM_BURST_THRESHOLD = 5;
