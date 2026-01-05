/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#9333ea', // Purple-600
        background: {
          light: '#ffffff',
          dark: '#0f172a', // Slate-900
        },
        surface: {
          light: '#f8fafc',
          dark: '#1e293b', // Slate-800
        }
      },
    },
  },
  plugins: [],
}
