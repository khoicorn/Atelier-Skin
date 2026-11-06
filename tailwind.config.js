/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#F2EFE8",
        ink: "#171A18",
        sage: "#6F7D68",
        taupe: "#A89E90",
        champagne: "#B9A47E",
        mist: "#E6E3DC"
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        hairline: "0 1px 0 rgba(23,26,24,.05)"
      }
    }
  },
  plugins: []
};
