import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#6366f1", // Indigo 500
                secondary: "#ec4899", // Pink 500
                dark: "#0f172a", // Slate 900
                paper: "#1e293b", // Slate 800
            },
            keyframes: {
                'bounce-slight': {
                    '0%, 100%': { transform: 'translateY(-10%)' },
                    '50%': { transform: 'translateY(0)' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'progress-indeterminate': {
                    '0%': { transform: 'translateX(-100%)' },
                    '50%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(100%)' },
                }
            },
            animation: {
                'bounce-slight': 'bounce-slight 2s infinite ease-in-out',
                'fade-in': 'fade-in 0.5s ease-out forwards',
                'progress-indeterminate': 'progress-indeterminate 1.5s infinite linear',
            }
        },
    },
    plugins: [],
};
export default config;
