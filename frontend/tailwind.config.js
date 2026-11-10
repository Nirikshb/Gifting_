/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      keyframes: {
        marquee: {
          from: {
            transform: "translate3d(var(--marquee-start, 0%), 0px, 0px)",
          },
          to: {
            transform: "translate3d(var(--marquee-end, -50%), 0px, 0px)",
          },
        },
      },
      animation: {
        marquee: "marquee 32s linear infinite",
        "marquee-slow": "marquee 40s linear infinite",
      },
    },
  },
};
