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
          marketplace: '#35825B',
          canteen: '#824C35',
          phones: '#355B82',
          gold: '#826B35',
          automobile: '#553582',
          pharma: '#35827F',
          boutique: '#82355B',
          thrift: '#353582',
          textile: '#753582',
          greenenergy: '#4E8235',
          electrical: '#788235',
          interior: '#82353B',
          plastic: '#356F82',
          office: '#354882',
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
