module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 moved the worklets transform into react-native-
    // worklets; its babel plugin MUST be listed last.
    plugins: ["react-native-worklets/plugin"],
  };
};
