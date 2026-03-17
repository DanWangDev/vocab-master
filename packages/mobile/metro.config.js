const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Watch the shared package
config.watchFolders = [monorepoRoot];

// Let Metro resolve packages from both mobile and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Resolve the shared package
config.resolver.extraNodeModules = {
  "@vocab-master/shared": path.resolve(monorepoRoot, "shared"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
