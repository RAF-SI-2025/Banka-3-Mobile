/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  // Manual scheme control: `dark:` variants resolve off NativeWind's
  // colorScheme (driven by the theme store), so the user can force
  // Light/Dark independent of the OS.
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
