/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // Hover styles only on devices with a real pointer, so taps on the phone do not leave rows highlighted.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        ivory: "#F2EFE8",
        paper: "#F8F6F1",
        ink: "#171A18",
        sage: "#6F7D68",
        taupe: "#A89E90",
        champagne: "#B9A47E",
        mist: "#E6E3DC",
        clay: "#9A6A58",
        // Chart series: deeper steps of sage and champagne, checked for colour-blind separation.
        "chart-clinic": "#56734C",
        "chart-products": "#BC9655"
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
        sans: ["Inter Variable", "Inter", "Segoe UI", "Roboto", "sans-serif"]
      }
    }
  },
  plugins: []
};
