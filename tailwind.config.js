/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-top": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
        "slide-in-bottom": {
          "0%": { maxHeight: "auto", opacity: "0" },
          "100%": { maxHeight: "80vh", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(300px)", opacity: "1" },
        },
        "slide-up": {
          "0%": { maxHeight: "80vh", opacity: "1" },
          "100%": { maxHeight: "auto", opacity: "1" },
        },
        "collapse-down": {
          "0%": { maxHeight: "80vh", opacity: "1" },
          "100%": { maxHeight: "0", opacity: "0" },
        },
        "expand-up": {
          "0%": { maxHeight: "0", opacity: "0" },
          "100%": { maxHeight: "80vh", opacity: "1" },
        },
        "expand-down": {
          "0%": { transform: "translateY(0)", maxHeight: "80vh" },
          "100%": { transform: "translateY(0)", maxHeight: "auto" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-top": "slide-in-top 0.3s ease-out",
        "fade-in": "fade-in 1s ease-out",
        "slide-in-bottom": "slide-in-bottom 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "collapse-down": "collapse-down 0.3s ease-out",
        "expand-up": "expand-up 0.3s ease-out",
        "expand-down": "expand-down 0.3s ease-out",
      },
    },
    screens: {
      md: "768px",
      lg: "1024px",
    },
  },
  plugins: [],
};
