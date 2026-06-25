/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#113f67',
        'sidebar-active': '#58a0c8',
        'sidebar-hover': '#1a5276',
        topbar: '#2c577e',
        card: '#749bc2',
        'card-dark': '#0f2235',
        'card-icon': 'rgba(17, 63, 103, 0.9)',
        'card-subtitle': 'rgba(212, 212, 208, 0.8)',
        accent: '#fdf5aa',
        navy: '#05103d',
        cream: '#fffacf',
        'cream-dark': '#f5e6a3',
        'login-text': '#262b3d',
        'table-row': '#3a658c',
        'table-row-alt': '#285b89',
        'table-row-text': '#d4d4d0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        sidebar: '226px',
        topbar: '111px',
      },
      borderRadius: {
        app: '10px',
      },
      boxShadow: {
        card: '-4px 4px 8px 0px rgba(0,0,0,0.25)',
        'card-lg': '-8px 7px 2px 0px #5a5c69',
      },
      backgroundImage: {
        'app-gradient': 'linear-gradient(126.64deg, #58a0c8 0.25%, #fdf5aa 70%, #fff8f8 115.5%)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
