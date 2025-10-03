import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          300: '#75a9d3',
          400: '#3f88ba',
          600: '#1e6fb1',
          700: '#134f82',
        }
      },
      boxShadow: {
        card: '0 10px 25px rgba(2,6,23,0.08)'
      }
    },
  },
  plugins: [],
} satisfies Config


