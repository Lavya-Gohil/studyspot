/// <reference types="nativewind/types" />

// NativeWind adds `className` to every React Native component through a
// declaration merge, and that merge only happens if this reference is in the
// compilation. Without this file the Babel plugin still works; styles render
// correctly on device, but tsc rejects every `className` in the app, which is
// why `pnpm type-check` failed on mobile while the app itself ran fine.
