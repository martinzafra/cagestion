/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        azure: '#0A6A9A',
        'azure-hover': '#085A85',
        sky: '#98BBD1',
        mid: '#7EA9CB',
        linen: '#F8F5F0',
        sand: '#EDE6DA',
        ink: '#1C1C1C',
        // Palette override: every existing bg-blue-*/text-gray-*/border-gray-*
        // utility across the app picks these up automatically (see style guide
        // application plan) instead of the cold Tailwind defaults.
        gray: {
          50: '#F8F5F0',
          100: '#EDE6DA',
          200: '#E3D9C8',
          300: '#D9CFC0',
          400: '#B5ADA0',
          500: '#6E6E6E',
          600: '#6E6E6E',
          700: '#4A4A4A',
          800: '#333333',
          900: '#1C1C1C',
        },
        blue: {
          50: '#EAF4F8',
          100: '#D3E7EF',
          500: '#2E86AC',
          600: '#0A6A9A',
          700: '#085A85',
          800: '#085A85',
        },
        // Earthy brown, for apartment color-coding (calendar legend) — Tailwind
        // has no built-in brown scale.
        brown: {
          100: '#E8DDD3',
          500: '#8B5E3C',
          800: '#5C3A21',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 4px 32px rgba(10,106,154,.10)',
        'card-hover': '0 16px 56px rgba(10,106,154,.18)',
        'btn-hover': '0 10px 28px rgba(10,106,154,.35)',
      },
    },
  },
  plugins: [],
}
