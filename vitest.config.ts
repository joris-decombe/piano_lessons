import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'node',
        include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        // Without this, `vitest bench` also picks up bench files in stray git
        // worktrees under .claude/.
        benchmark: {
            include: ['tests/performance/**/*.bench.{js,mjs,cjs,ts,mts,cts}'],
        },
    },
});
