/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SD Mentari Islamic School Green Screen Brand Palette
        brand: {
          light: '#F4FFFC',    // Mint cream / light clean background
          mint: '#91EAAF',     // Soft mint spring green
          lime: '#C3E956',     // Vivid lime-yellow / chartreuse accent ("hijau kekuning-kuningan")
          olive: '#4D7111',    // Deep olive / moss green accent
          forest: '#1F4B2C',   // Deep pine forest green (primary brand)
          dark: '#102919',     // Deepest forest dark (sidebar/hero base)
          darker: '#0B1E13',   // Deep dark emerald
        },
        primary: {
          50: '#F4FFFC',
          100: '#E1F8ED',
          200: '#C3E956',      // Lime-yellow accent
          300: '#91EAAF',      // Mint accent
          400: '#52B878',
          500: '#329555',
          600: '#1F4B2C',      // Main brand green
          700: '#193F24',
          800: '#13321C',
          900: '#0E2414',
          950: '#07140B',
        },
        security: {
          danger: '#dc2626',
          warning: '#f59e0b',
          success: '#1F4B2C',
          lockdown: '#991b1b',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
