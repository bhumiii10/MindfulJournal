const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure stable asset/plugins defaults. Avoid custom serializers/transformers unless needed.
module.exports = config;