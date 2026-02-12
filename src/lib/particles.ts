import { getZScale } from "./vfx-constants";

/**
 * Pool-based particle system for canvas effects.
 * Particles are pixel-snapped for the retro aesthetic.
 */

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    active: boolean;
    type: 'burst' | 'debris' | 'shockwave' | 'spore';
    z: number; // 0 (far) to 2 (close). 1.0 is the play plane.
}

export interface EmitOptions {
    x: number;
    y: number;
    color: string;
    count?: number;
    speed?: number;
    spread?: number;
    size?: number;
    lifetime?: number;
    gravity?: number;
    type?: 'burst' | 'debris' | 'shockwave' | 'spore';
    z?: number;
}

const POOL_SIZE = 1200; // Increased pool for ambient spores
const DEFAULT_GRAVITY = 120; // pixels per second^2 (downward)

export class ParticleSystem {
    particles: Particle[];
    gravity: number;
    private _activeCount = 0;

    constructor(gravity = DEFAULT_GRAVITY) {
        this.gravity = gravity;
        this.particles = Array.from({ length: POOL_SIZE }, () => ({
            x: 0, y: 0, vx: 0, vy: 0,
            life: 0, maxLife: 0,
            color: '', size: 1, active: false,
            type: 'burst',
            z: 1.0
        }));
    }

    private acquire(): Particle | null {
        for (let i = 0; i < this.particles.length; i++) {
            if (!this.particles[i].active) {
                this.particles[i].active = true;
                this._activeCount++;
                return this.particles[i];
            }
        }
        return null;
    }

    /** Emit a burst of particles at a position. */
    emit(opts: EmitOptions): void {
        const {
            x, y, color,
            count = 6,
            speed = 60,
            spread = Math.PI * 0.6,
            size = 2,
            lifetime = 0.35,
            type = 'burst',
            z = 1.0
        } = opts;

        const baseAngle = type === 'debris' ? Math.PI / 2 : -Math.PI / 2;

        for (let i = 0; i < count; i++) {
            const p = this.acquire();
            if (!p) return;

            const angle = baseAngle + (Math.random() - 0.5) * spread;
            const spd = speed * (0.5 + Math.random() * 0.5);

            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = lifetime * (0.7 + Math.random() * 0.3);
            p.maxLife = p.life;
            p.color = color;
            p.size = type === 'shockwave' ? size * 4 : size;
            p.type = type;
            p.z = z;
        }
    }

    /** Advance all particles by dt seconds. */
    update(dt: number): void {
        if (this._activeCount === 0) return;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                this._activeCount--;
                continue;
            }

            // Depth affects effective physics
            // Parallax factor scaling
            const parallax = getZScale(p.z);

            if (p.type === 'burst' || p.type === 'debris') {
                p.vy += this.gravity * dt * parallax;
            } else if (p.type === 'shockwave') {
                // Shockwaves expand but don't fall
                p.size += 40 * dt * parallax;
            } else if (p.type === 'spore') {
                // Spores drift with a slight horizontal oscillation (wind)
                p.vx += Math.sin(p.life * 2) * 5 * dt;
                // Slow vertical rise
                p.vy = -15 * parallax;
            }

            p.x += p.vx * dt * parallax;
            p.y += p.vy * dt * parallax;
        }
    }

    /** Draw all active particles to a canvas context. */
    draw(ctx: CanvasRenderingContext2D): void {
        if (this._activeCount === 0) return;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // Performance Optimization: Three Pass Draw without array allocations.
        const drawPass = (minZ: number, maxZ: number) => {
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                if (!p.active || p.z < minZ || p.z >= maxZ) continue;

                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.fillStyle = p.color;
                const x = Math.round(p.x);
                const y = Math.round(p.y);
                
                const zScale = getZScale(p.z);
                const size = p.size * zScale;

                if (p.type === 'shockwave') {
                    const outerR = size / 2;
                    const thickness = 4 * (p.life / p.maxLife) * zScale;
                    const innerR = Math.max(0, outerR - thickness);
                    ctx.globalAlpha = alpha * 0.8;
                    ctx.beginPath();
                    ctx.arc(x, y, outerR, 0, Math.PI * 2);
                    ctx.arc(x, y, innerR, 0, Math.PI * 2, true);
                    ctx.fill();
                } else {
                    if (p.type === 'spore' && p.z < 0.8) {
                        ctx.globalAlpha = alpha * 0.4;
                        ctx.fillRect(x, y, Math.max(1, size), Math.max(1, size));
                    } 
                    else if (p.z > 1.2) {
                        ctx.globalAlpha = alpha * 0.2;
                        ctx.fillRect(x - Math.floor(size/2), y - Math.floor(size/2), size, size);
                        ctx.globalAlpha = alpha * 0.1;
                        ctx.fillRect(x - Math.floor(size/2) - 1, y - Math.floor(size/2) - 1, size + 2, size + 2);
                    }
                    else {
                        ctx.globalAlpha = alpha * 0.3;
                        ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
                        ctx.globalAlpha = alpha;
                        ctx.fillRect(x, y, size, size);
                    }
                }
            }
        };

        drawPass(0, 0.8);   // Back
        drawPass(0.8, 1.2); // Mid
        drawPass(1.2, 3.0); // Front

        ctx.restore();
    }

    /** Number of currently active particles. */
    get activeCount(): number {
        return this._activeCount;
    }

    /** Number of active 'burst' or 'shockwave' particles (for bloom threshold). */
    get activeBurstCount(): number {
        let count = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.active && (p.type === 'burst' || p.type === 'shockwave')) {
                count++;
            }
        }
        return count;
    }

    /** Deactivate all particles. */
    clear(): void {
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].active = false;
        }
        this._activeCount = 0;
    }
}
