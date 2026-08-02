/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBF8F2',
        ink: '#1C1B19',
        indigo: {
          DEFAULT: '#223159',
          light: '#2E4275',
          dark: '#182342',
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
