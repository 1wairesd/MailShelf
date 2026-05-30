/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Custom MailShelf colors — driven by CSS variables for theme switching
        // Variables store R G B channels so Tailwind opacity modifiers work (bg-shelf-accent/20 etc.)
        shelf: {
          bg: 'rgb(var(--shelf-bg) / <alpha-value>)',
          surface: 'rgb(var(--shelf-surface) / <alpha-value>)',
          elevated: 'rgb(var(--shelf-elevated) / <alpha-value>)',
          border: 'rgb(var(--shelf-border) / <alpha-value>)',
          'border-subtle': 'rgb(var(--shelf-border-subtle) / <alpha-value>)',
          text: 'rgb(var(--shelf-text) / <alpha-value>)',
          'text-muted': 'rgb(var(--shelf-text-muted) / <alpha-value>)',
          'text-subtle': 'rgb(var(--shelf-text-subtle) / <alpha-value>)',
          accent: 'rgb(var(--shelf-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--shelf-accent-hover) / <alpha-value>)',
          'accent-muted': 'rgb(var(--shelf-accent-muted) / <alpha-value>)',
          green: 'rgb(var(--shelf-green) / <alpha-value>)',
          yellow: 'rgb(var(--shelf-yellow) / <alpha-value>)',
          red: 'rgb(var(--shelf-red) / <alpha-value>)',
          orange: 'rgb(var(--shelf-orange) / <alpha-value>)',
          blue: 'rgb(var(--shelf-blue) / <alpha-value>)',
          purple: 'rgb(var(--shelf-purple) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.1s ease-out',
        'scale-in': 'scale-in 0.1s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
