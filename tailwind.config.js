/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0c0e',
        surface: '#161719',
        gold: '#dfbc7c',
      },
      fontFamily: {
        cairo: ['Cairo Variable', 'Cairo', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
