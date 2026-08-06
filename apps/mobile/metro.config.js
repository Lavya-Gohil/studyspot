const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

/**
 * Metro, with the NativeWind transformer.
 *
 * This file's absence is why mobile looked the way it did. NativeWind v4
 * compiles global.css through Metro; without `withNativeWind` the import in
 * app/_layout.tsx resolves to nothing useful and every `className` in the app
 * is inert. That is the reason each screen carries inline hex — className was
 * never doing anything, so the styles had to go somewhere.
 *
 * It also generates nativewind-env.d.ts, the reference that makes `className`
 * type-check. That file is committed rather than left to generation, so a
 * clean checkout type-checks before Metro has ever been started.
 */
const config = getDefaultConfig(__dirname)

// The monorepo's packages live outside this app, and Metro will not follow
// symlinks out of the project root unless told where else to look.
const path = require('path')
const workspaceRoot = path.resolve(__dirname, '../..')
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
// pnpm's store means one package can resolve to several physical copies;
// without this, React can be initialised twice and hooks throw.
config.resolver.disableHierarchicalLookup = true

module.exports = withNativeWind(config, { input: './global.css' })
