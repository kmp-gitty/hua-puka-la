/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // Land & Lava tokens are declared as CSS variables (see index.css) so
      // light/dark can flip neutrals while state hues stay identical.
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        panel: "var(--panel)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        faint: "var(--faint)",
        line: "var(--line)",
        "tile-empty": "var(--tile-empty)",
        "tile-line": "var(--tile-line)",
        "key-bg": "var(--key-bg)",
        "key-line": "var(--key-line)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        sun: "var(--sun)",
        correct: "var(--correct)",
        "correct-ink": "var(--correct-ink)",
        present: "var(--present)",
        "present-ink": "var(--present-ink)",
        wrong: "var(--wrong)",
        "wrong-ink": "var(--wrong-ink)",
        absent: "var(--absent)",
        "absent-ink": "var(--absent-ink)",
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        tile: "10px",
        key: "9px",
        hint: "12px",
        panel: "20px",
        btn: "13px",
      },
      keyframes: {
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%,60%": { transform: "translateX(-7px)" },
          "40%,80%": { transform: "translateX(7px)" },
        },
        tilebounce: {
          "0%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-14px)" },
          "60%": { transform: "translateY(0)" },
          "80%": { transform: "translateY(-4px)" },
          "100%": { transform: "translateY(0)" },
        },
        slideup: {
          from: { transform: "translateY(12px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        shake: "shake 0.42s ease",
        tilebounce: "tilebounce 0.6s ease",
        slideup: "slideup 0.28s ease",
        pop: "pop 0.12s ease",
      },
    },
  },
  plugins: [],
};
