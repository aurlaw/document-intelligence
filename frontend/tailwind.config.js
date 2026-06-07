/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#080910",
        panel: "#0e1018",
        panel2: "#13161f",
        panel3: "#181c27",
        fg: "#e9ebf2",
        muted: "#9097a6",
        faint: "#626a79",
        line2: "#2c313d",
        hairline: "#22262f",
        accent: "#356bff",
        accentSoft: "#5b85ff",
        warn: "#e0a23c",
        danger: "#f0686a",
        "counter-normal": "#4c5362",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        sans: ['"IBM Plex Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
