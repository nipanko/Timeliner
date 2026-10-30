const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle migrations are .sql files imported as strings (see babel.config.js).
config.resolver.sourceExts.push('sql');

// expo-sqlite on web ships a WebAssembly build of SQLite. The page must also be served with
// cross-origin isolation headers (public/_headers); `expo start --web` can't add them to its HTML.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
