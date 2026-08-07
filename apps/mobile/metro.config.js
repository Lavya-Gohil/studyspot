const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

/**
 * Metro, with the NativeWind transformer.
 *
 * This file's absence is why mobile looked the way it did. NativeWind v4
 * compiles global.css through Metro; without `withNativeWind` the import in
 * app/_layout.tsx resolves to nothing useful and every `className` in the app
 * is inert. That is the reason each screen carries inline hex; className was
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
// Resolve the "exports" field in package.json. The workspace packages use
// subpath exports (@studyspot/utils/validation, @studyspot/api/focus) to keep
// heavy dependencies out of the web bundle, and Metro ignores "exports"
// entirely unless this is on, so those imports would resolve in TypeScript
// and then fail at bundle time.
config.resolver.unstable_enablePackageExports = true

// Hierarchical lookup stays ON, deliberately. The usual monorepo recipe
// disables it, but that recipe assumes a hoisted layout: pnpm keeps a
// package's transitive dependencies inside that package's own node_modules,
// and disabling the upward walk makes react-native unable to find `invariant`
// from its own directory.

module.exports = withNativeWind(config, { input: './global.css' })
