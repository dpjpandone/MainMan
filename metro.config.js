// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 👇 Disabling Bridgeless to fix Reanimated error
config.transformer.unstable_disableRuntime = true;

module.exports = config;
