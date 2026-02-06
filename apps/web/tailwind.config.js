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
          navy: '#002D74',
          dark: '#0B1426',
          midnight: '#10192A',
          blue: '#1E3A8A',
          cyan: '#00D4FF',
          accent: '#00B4D8',
          bg: '#050B15',
          card: '#0D1829',
          'card-light': '#142236',
          border: '#1E3A5F',
          text: '#F1F5F9',
          muted: '#94A3B8',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
      backgroundImage: {
        'cro-gradient': 'linear-gradient(135deg, #002D74 0%, #0B1426 100%)',
        'cro-glow': 'radial-gradient(ellipse at top, #002D74 0%, #050B15 70%)',
      },
    },
  },
  plugins: [],
};
