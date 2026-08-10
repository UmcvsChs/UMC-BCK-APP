/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F0E5',
        surface: '#FCF9F2',
        ink: '#1C1B19',
        indigo: {
          DEFAULT: '#0F4C3A',
          light: '#186B52',
          dark: '#0A362A',
        },
        gold: {
          DEFAULT: '#C89B3C',
          light: '#DBB65E',
          dark: '#A87F2A',
        },
        market: {
          green: '#3F7A5C',
          red: '#B4432E',
        },
        hub: {
          marketplace: '#3F7A5C',
          canteen: '#C2571A',
          phones: '#2E6FA3',
          gold: '#C89B3C',
          automobile: '#6B4A8A',
          pharma: '#1E7A6E',
          boutique: '#B23A6B',
          thrift: '#5C7A99',
          textile: '#8A3FA0',
          greenenergy: '#2E8B57',
          electrical: '#D4A017',
          interior: '#A0522D',
          plastic: '#1E88A8',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
