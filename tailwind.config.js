/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: '#1e88e5',
                'background-light': '#f9fafb',
                'background-dark': '#0f141a',
                'surface-light': '#ffffff',
                'surface-dark': '#1c2630',
            },
            fontFamily: {
                display: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
