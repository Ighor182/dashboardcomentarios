/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'linha-uni-blue': {
          DEFAULT: '#002B49',
          light: '#2D5A7A',
          lighter: '#426F8D',
        },
        'linha-uni-orange': {
          DEFAULT: '#F26D21',
          hover: '#E35F1A',
        },
        'linha-uni-gray': {
          DEFAULT: '#607D8B',
          bg: '#1A2F4B',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
