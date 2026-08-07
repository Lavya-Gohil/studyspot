import type { ExpoConfig } from 'expo/config'
import fs from 'fs'
import path from 'path'
// Expo's config loader cannot require a .ts module, so this reads the
// CommonJS palette directly rather than going through lib/theme.ts.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { theme } = require('./lib/palette.js') as typeof import('./lib/theme')

/**
 * Expo config as TypeScript rather than app.json, for two reasons.
 *
 * The background colours are the app's real background colour, taken from
 * lib/theme.ts instead of written out again — a splash screen that is a few
 * points off the first frame shows as a flash on launch, and that is exactly
 * the kind of drift a second copy of a hex value produces.
 *
 * And the file references are conditional. app.json named an icon, a splash
 * image, an adaptive icon and a google-services.json, none of which are in
 * the repo; `expo export` warned about the last one on every run. Referencing
 * them only when present means the warnings go away now and the files are
 * picked up automatically whenever they are added.
 */

const here = (p: string) => path.join(__dirname, p)
const ifPresent = <T>(relPath: string, value: T): T | undefined =>
  fs.existsSync(here(relPath)) ? value : undefined

const config: ExpoConfig = {
  name: 'StudySpot',
  slug: 'studyspot',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'studyspot',
  userInterfaceStyle: 'dark',
  backgroundColor: theme.bg.base,
  icon: ifPresent('assets/icon.png', './assets/icon.png'),
  splash: ifPresent('assets/splash.png', {
    image: './assets/splash.png',
    resizeMode: 'contain' as const,
    backgroundColor: theme.bg.base,
  }),
  android: {
    package: 'com.studyspot.app',
    adaptiveIcon: ifPresent('assets/adaptive-icon.png', {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: theme.bg.base,
    }),
    googleServicesFile: ifPresent('google-services.json', './google-services.json'),
  },
  plugins: [
    'expo-router',
    'expo-notifications',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'StudySpot uses your location to show nearby study sessions.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
}

export default config
