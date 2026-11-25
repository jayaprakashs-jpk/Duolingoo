/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        feather: '#58CC02',
        featherDark: '#58A700',
        macaw: '#1CB0F6',
        macawDark: '#1899D6',
        cardinal: '#FF4B4B',
        cardinalDark: '#EA2B2B',
        bee: '#FFC800',
        beeDark: '#E5B400',
        fox: '#FF9600',
        beetle: '#CE82FF',
        eel: '#4B4B4B',
        wolf: '#777777',
        hare: '#AFAFAF',
        swan: '#E5E5E5',
        polar: '#F7F7F7',
        snow: '#FFFFFF',
      },
    },
  },
  plugins: [],
};
