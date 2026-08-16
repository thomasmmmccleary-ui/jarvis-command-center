import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0e1a',
        surface: '#111827',
        border: '#1f2937',
        active: '#6366f1',
        queued: '#f59e0b',
        completed: '#10b981',
        'active-glow': 'rgba(99,102,241,0.4)',
        'queued-glow': 'rgba(245,158,11,0.4)',
        'completed-glow': 'rgba(16,185,129,0.4)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-active': '0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(99,102,241,0.2)',
        'glow-queued': '0 0 20px rgba(245,158,11,0.5), 0 0 40px rgba(245,158,11,0.2)',
        'glow-completed': '0 0 20px rgba(16,185,129,0.5), 0 0 40px rgba(16,185,129,0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
}

export default config
