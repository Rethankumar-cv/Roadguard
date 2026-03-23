/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
        'bg-card': '#1e293b',
        'accent-green': '#22c55e',
        'accent-blue': '#0ea5e9',
        'accent-warn': '#f59e0b',
        'accent-red': '#ef4444',
        'accent-purple': '#a855f7',
      },
      backgroundImage: {
        'glass-card': 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.6))',
      },
      boxShadow: {
        'neon-green': '0 0 12px rgba(34,197,94,0.4)',
        'neon-blue': '0 0 12px rgba(14,165,233,0.4)',
        'neon-red': '0 0 12px rgba(239,68,68,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-row': 'slideInRow 0.4s ease forwards',
        'fade-in-up': 'fadeInUp 0.5s ease forwards',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        slideInRow: {
          '0%': { opacity: 0, transform: 'translateY(-8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
