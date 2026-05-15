// Metro + NativeWind. global.css is the Tailwind entrypoint NativeWind
// compiles into RN styles at bundle time.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
