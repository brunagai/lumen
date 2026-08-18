import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#fcfbf9",
        primary: "#376179",
        secondary: "#376179",
        accent: {
          DEFAULT: "#f2934d",
          hover: "#d97e32",
          soft: "#fde8d6",
        },
        ink: "#2d2d2d",
        "primary-soft": "#e7eef2",
        "secondary-soft": "#e7eef2",
        background: "#fcfbf9",
        foreground: "#2d2d2d",
        surface: "#ffffff",
        border: "#d8d0c6",
        muted: "#4a4a4a",
        danger: "#8f2d2d",
        teal: "#376179",
        "teal-soft": "#e7eef2",
        gold: "#f2934d",
        safe: "#2f6b4f",
        "safe-bg": "#e4f0e8",
        verified: "#376179",
        "verified-bg": "#e7eef2",
        inflow: "#376179",
        "inflow-bg": "#e7eef2",
        closed: "#2f6b4f",
        "closed-bg": "#e4f0e8",
        pending: "#a85a1a",
        "pending-bg": "#fde8d6",
        outflow: "#9a4a24",
      },
    },
  },
};

export default config;
