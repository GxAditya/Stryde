// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.transformer.minifierPath = require.resolve('metro-minify-terser');

config.resolver.sourceExts.push('sql'); // Add .sql if needed for other things, but main fix below
config.resolver.assetExts.push('wasm');

module.exports = config;
