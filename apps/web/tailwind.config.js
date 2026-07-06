/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cro: {
          // Updated to match cronos.com's current black + electric-sky system.
          navy: '#061121',
          dark: '#121212',
          midnight: '#0C0C10',
          blue: '#129DFF',
          cyan: '#4CDBFF',
          accent: '#66DEFF',
          bg: '#020304',
          card: '#0C0C10',
          'card-light': '#181919',
          border: 'rgb(255 255 255 / 0.12)',
          text: '#FFFFFF',
          muted: '#7D828B',
          ink: '#04212B',
          teal: '#1CF1D8',
          success: '#1CF1D8',
          warning: '#F8C15C',
          danger: '#FF5C7A',
        },
      },
      backgroundImage: {
        'cro-gradient': 'linear-gradient(135deg, #4CDBFF 0%, #66DEFF 52%, #1CF1D8 100%)',
        'cro-glow': 'radial-gradient(ellipse at top, rgba(76, 219, 255, 0.22) 0%, rgba(2, 3, 4, 0) 70%)',
      },
      boxShadow: {
        'cro-glow': '0 0 36px rgb(76 219 255 / 0.28)',
      },
    },
  },
  plugins: [],
};
