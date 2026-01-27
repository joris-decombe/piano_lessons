/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                piano: {
                    bg: '#0F172A',      // Slate 900
                    white: {
                        surface: '#E2E4E9', // Cool Grey 200
                        pressed: '#D1D5DB', // Gray 300
                        shadow: '#9CA3AF',  // Gray 400 (Separator)
                    },
                    black: {
                        surface: '#1F2937', // Gray 800 (Top)
                        face: '#111827',    // Gray 900 (Side/Front)
                        accent: '#374151',  // Gray 700 (Highlight)
                        void: '#000000',    // Pure Black (Pocket)
                    },
                    felt: '#9F1239',      // Rose 800
                    reflection: 'rgba(255, 255, 255, 0.1)', // Subtle vertical banding
                }
            },
            spacing: {
                'key-w': '24px',
                'key-h': '150px',       // White Key Length
                'frame-d': '154px',     // Cheek Block / Frame Depth
                'black-w': '14px',
                'black-h': '96px',      // Black Key Surface Length
                'black-z': '12px',      // Black Key 3D Thickness
                'octave': '168px',
            },
            borderWidth: {
                '12': '12px',           // For Black Key Idle state
            },
            zIndex: {
                'slip': '0',        // Key Slip (Bottom)
                'cavity': '5',      // Well floor
                'key': '10',        // White Keys
                'cheek': '20',      // Cheek Blocks
                'black': '30',      // Black Keys
                'felt': '35',       // Red Felt Line
                'nameboard': '40',  // Top Cover
            },
            boxShadow: {
                // Puts a 1px separator line on the RIGHT inside edge of the key
                'key-separator': 'inset -1px 0 0 0 #9CA3AF',
            },
            transitionProperty: {
                'press': 'transform, border-width, background-color', // Animate all 3 for the "Sinking" effect
            },
            transitionTimingFunction: {
                'press': 'cubic-bezier(0, 0, 0.2, 1)',      // Instant Down
                'release': 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy Up
            }
        },
    },
    plugins: [],
}