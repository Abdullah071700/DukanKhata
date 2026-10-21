/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#1a1a2e',
          800: '#16213e',
          700: '#0f3460',
        },
        brand: {
          green: '#1db954',
          'green-dark': '#17a348',
          red: '#e63946',
          'red-light': '#fff0f1',
          blue: '#1877f2',
          'blue-light': '#e8f1fd',
          yellow: '#f5a623',
          'yellow-light': '#fff8ec',
          bg: '#f0f4f8',
        }
      },
      fontFamily: {
        head: ['"Baloo 2"', 'cursive', 'sans-serif'],
        body: ['"Noto Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
