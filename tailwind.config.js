/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  safelist: [
    'text-base',
    'leading-relaxed',
    'antialiased',
    'prose',
    'prose-invert',
    'text-muted',
    'text-secondary',
    'bg-surface',
    'border-border',
  ],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        dark: '#0f0f0f',
        surface: '#1e1e1e',
        text: '#f1f1f1',
        link: '#d7267b',
        muted: '#2a2a2a',
        border: '#3a3a3a',
        secondary: '#bdbdbd',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
