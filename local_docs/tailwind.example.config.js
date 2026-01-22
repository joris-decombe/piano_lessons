/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            // 1. Define the specific "Satie" Palette
            colors: {
                piano: {
                    bg: '#0F172A',      // Slate 900 (App Background)
                    white: {
                        surface: '#E2E4E9', // Cool Grey (Key Top)
                        lip: '#FFFFFF',     // Pure White (Key Front)
                        side: '#9CA3AF',    // Shadow/Separator
                        active: '#D1D5DB',  // Pressed State
                    },
                    black: {
                        surface: '#1F2937', // Charcoal (Key Top)
                        face: '#111827',    // Deep Black (Key 3D Height)
                        highlight: '#374151', // Top Edge
                    },
                    accent: {
                        DEFAULT: '#38BDF8', // Sky 400 (Falling Notes)
                        dim: '#0EA5E9',     // Sky 500 (Note Border)
                        glow: '#60A5FA',    // Active Key Glow
                    }
                }
            },
            // 2. Extend spacing for exact pixel art geometry
            spacing: {
                'key-white': '24px',
                'key-black': '14px',
                'key-dip': '6px',     // The distance a key travels down
                'octave': '168px',    // 24 * 7
            },
            // 3. Pixel-Art Specific Shadows (Solid, No Blur)
            boxShadow: {
                'pixel-white': 'inset -1px 0 0 0 #9CA3AF', // Right-side separator for white keys
                'pixel-black': '0 4px 0 0 #111827',        // Solid "3D" height for black keys
                'pixel-black-pressed': '0 0 0 0 #111827',  // Shadow disappears when pressed
            },
            // 4. Custom Keyframes for the mechanical feel
            transitionTimingFunction: {
                'piano-press': 'cubic-bezier(0, 0, 0.2, 1)',      // Instant down
                'piano-release': 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy up
            },
            // 5. Utility for disabling anti-aliasing
            backgroundImage: {
                'pixel-gradient': 'linear-gradient(to bottom, var(--tw-gradient-stops))',
            }
        },
    },
    plugins: [
        // Simple plugin to add the .pixelated utility
        function ({ addUtilities }) {
            addUtilities({
                '.image-pixelated': {
                    'image-rendering': 'pixelated',
                },
                '.image-crisp': {
                    'image-rendering': 'crisp-edges',
                }
            })
        }
    ],
}