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
        // Legacy colors (keep for backward compatibility)
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        ring: 'hsl(var(--ring))',

        // Happy Hues Palette #14 - New color tokens
        'hue-bg': 'var(--bg)',
        'hue-text': {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
        'hue-accent': {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--on-accent)',
          hover: 'var(--accent-hover)',
          focus: 'var(--accent-focus)',
        },
        'hue-surface': {
          soft: 'var(--surface-soft)',
          muted: 'var(--surface-muted)',
          'soft-hover': 'var(--surface-soft-hover)',
        },
        'hue-border': 'var(--border)',
        'hue-success': {
          DEFAULT: 'var(--success)',
          foreground: 'var(--on-success)',
        },
        'hue-warning': {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--on-warning)',
        },
        'hue-error': {
          DEFAULT: 'var(--error)',
          foreground: 'var(--on-error)',
        },
        'hue-info': {
          DEFAULT: 'var(--info)',
          foreground: 'var(--on-info)',
        },
        'hue-shadow': 'var(--shadow)',
        'hue-overlay': 'var(--overlay)',
      },
      fontFamily: {
        'orbitron': ['var(--font-orbitron)', 'monospace'],
      },
    },
  },
  plugins: [],
}