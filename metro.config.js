// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// If you previously customized resolver/sourceExts/assetExts/transformer,
// re-apply them here on top of `config`.

module.exports = config;