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
}

const POOL_SIZE = 500;
const DEFAULT_GRAVITY = 80; // pixels per second^2 (downward)

export class ParticleSystem {
    particles: Particle[];
    gravity: number;

    constructor(gravity = DEFAULT_GRAVITY) {
        this.gravity = gravity;
        this.particles = Array.from({ length: POOL_SIZE }, () => ({
            x: 0, y: 0, vx: 0, vy: 0,
            life: 0, maxLife: 0,
            color: '', size: 1, active: false,
        }));
    }

    private acquire(): Particle | null {
        for (let i = 0; i < this.particles.length; i++) {
            if (!this.particles[i].active) return this.particles[i];
        }
        return null;
    }

    /** Emit a burst of particles at a position. */
    emit(opts: EmitOptions): void {
        const {
            x, y, color,
            count = 6,
            speed = 60,
            spread = Math.PI * 0.6,  // ~108 degrees upward cone
            size = 2,
            lifetime = 0.35,
        } = opts;

        const baseAngle = -Math.PI / 2; // straight up

        for (let i = 0; i < count; i++) {
            const p = this.acquire();
            if (!p) return; // pool exhausted

            const angle = baseAngle + (Math.random() - 0.5) * spread;
            const spd = speed * (0.5 + Math.random() * 0.5);

            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = lifetime * (0.7 + Math.random() * 0.3);
            p.maxLife = p.life;
            p.color = color;
            p.size = size;
            p.active = true;
        }
    }

    /** Advance all particles by dt seconds. */
    update(dt: number): void {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                continue;
            }

            p.vy += this.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
    }

    /** Draw all active particles to a canvas context. */
    draw(ctx: CanvasRenderingContext2D): void {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(
                Math.round(p.x),
                Math.round(p.y),
                p.size,
                p.size,
            );
        }
        ctx.globalAlpha = 1;
    }

    /** Number of currently active particles. */
    get activeCount(): number {
        let count = 0;
        for (let i = 0; i < this.particles.length; i++) {
            if (this.particles[i].active) count++;
        }
        return count;
    }

    /** Deactivate all particles. */
    clear(): void {
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].active = false;
        }
    }
}
