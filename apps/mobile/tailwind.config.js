/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0A0A0F',
        'bg-surface': '#141419',
        'bg-elevated': '#1C1C24',
        'bg-subtle': '#22222C',
        'accent-primary': '#7B61FF',
        'accent-hover': '#6A50EE',
        'accent-green': '#00E5A0',
        'accent-amber': '#F59E0B',
        'accent-red': '#EF4444',
        'text-primary': '#F5F4FF',
        'text-secondary': '#9B9AAD',
        'text-tertiary': '#5C5B6E',
      },
    },
  },
  plugins: [],
}
