/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./frontend/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        rome: {
          gold: "#D4AF37",
          darkGold: "#997A15",
          red: "#8B0000",
          crimson: "#DC143C",
          surface: "#12131A",
          surfaceLight: "#1C1D27",
          border: "#2A2B3A",
          accent: "#38B6FF",
          solana: "#14F195",
          ethereum: "#627EEA",
        },
      },
    },
  },
  plugins: [],
};
