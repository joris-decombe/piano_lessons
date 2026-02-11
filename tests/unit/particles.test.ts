import { describe, it, expect } from 'vitest';
import { ParticleSystem } from '../../src/lib/particles';

describe('ParticleSystem', () => {
    it('starts with zero active particles', () => {
        const ps = new ParticleSystem();
        expect(ps.activeCount).toBe(0);
    });

    it('emits the requested number of particles', () => {
        const ps = new ParticleSystem();
        ps.emit({ x: 100, y: 200, color: '#ff0000', count: 8 });
        expect(ps.activeCount).toBe(8);
    });

    it('uses default count of 6 when not specified', () => {
        const ps = new ParticleSystem();
        ps.emit({ x: 0, y: 0, color: '#00ff00' });
        expect(ps.activeCount).toBe(6);
    });

    it('particles die after their lifetime expires', () => {
        const ps = new ParticleSystem();
        ps.emit({ x: 0, y: 0, color: '#fff', count: 3, lifetime: 0.1 });
        expect(ps.activeCount).toBe(3);

        // Advance well past max lifetime
        ps.update(0.5);
        expect(ps.activeCount).toBe(0);
    });

    it('particles move according to velocity and gravity', () => {
        const ps = new ParticleSystem(0); // no gravity for predictable test
        ps.emit({ x: 50, y: 50, color: '#fff', count: 1, speed: 0, lifetime: 1 });

        const p = ps.particles.find(p => p.active)!;
        // Force a known velocity
        p.vx = 100;
        p.vy = 0;

        ps.update(0.1);
        expect(p.x).toBeCloseTo(60, 0);
    });

    it('gravity pulls particles downward', () => {
        const gravity = 200;
        const ps = new ParticleSystem(gravity);
        ps.emit({ x: 0, y: 0, color: '#fff', count: 1, speed: 0, lifetime: 2 });

        const p = ps.particles.find(p => p.active)!;
        p.vx = 0;
        p.vy = 0;

        ps.update(0.1);
        // vy should have increased by gravity * dt = 200 * 0.1 = 20
        expect(p.vy).toBeCloseTo(20, 0);
    });

    it('clear() deactivates all particles', () => {
        const ps = new ParticleSystem();
        ps.emit({ x: 0, y: 0, color: '#fff', count: 10 });
        expect(ps.activeCount).toBe(10);

        ps.clear();
        expect(ps.activeCount).toBe(0);
    });

    it('pool recycles dead particles', () => {
        const ps = new ParticleSystem();

        // Emit, let them die, emit again
        ps.emit({ x: 0, y: 0, color: '#fff', count: 5, lifetime: 0.01 });
        ps.update(0.1); // kill them
        expect(ps.activeCount).toBe(0);

        ps.emit({ x: 0, y: 0, color: '#fff', count: 5, lifetime: 1 });
        expect(ps.activeCount).toBe(5);
    });

    it('does not exceed pool size', () => {
        const ps = new ParticleSystem();
        // Try to emit way more than pool size
        for (let i = 0; i < 100; i++) {
            ps.emit({ x: 0, y: 0, color: '#fff', count: 10, lifetime: 10 });
        }
        // Should cap at pool size (800)
        expect(ps.activeCount).toBeLessThanOrEqual(800);
    });

    it('dt is clamped in practice (no explosion on large dt)', () => {
        const ps = new ParticleSystem(100);
        ps.emit({ x: 0, y: 0, color: '#fff', count: 1, speed: 50, lifetime: 5 });

        const p = ps.particles.find(p => p.active)!;

        // Simulate a large time step (like tab coming back into focus)
        ps.update(2);

        // Particle should still be at a reasonable position (not NaN or Infinity)
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
    });
});
