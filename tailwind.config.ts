import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          300: '#75a9d3',
          400: '#3f88ba',
          600: '#1e6fb1',
          700: '#134f82',
        },
        // Design-token bridge (Phase A → design/tokens.json). Additive and
        // collision-free: new utilities only, e.g. bg-page, text-ink-heading,
        // bg-action, border-line, bg-tag-tint-blue. Tailwind's built-in
        // rounded-*/spacing and the legacy brand-* scale are deliberately NOT
        // remapped (hundreds of existing usages would shift).
        page: 'var(--color-bg-page)',
        surface: 'var(--color-bg-surface)',
        subtle: 'var(--color-bg-subtle)',
        header: 'var(--color-bg-header)',
        footer: 'var(--color-bg-footer)',
        'brand-tint': 'var(--color-bg-brand-tint)',
        ink: {
          DEFAULT: 'var(--color-text-body)',
          heading: 'var(--color-text-heading)',
          muted: 'var(--color-text-muted)',
          'on-brand': 'var(--color-text-on-brand)',
          'on-action': 'var(--color-text-on-action)',
          link: 'var(--color-text-link)',
          accent: 'var(--color-text-accent)',
        },
        action: {
          DEFAULT: 'var(--color-action-primary)',
          hover: 'var(--color-action-primary-hover)',
          'secondary-border': 'var(--color-action-secondary-border)',
          'disabled-bg': 'var(--color-action-disabled-bg)',
          'disabled-text': 'var(--color-action-disabled-text)',
          'focus-ring': 'var(--color-action-focus-ring)',
        },
        line: {
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
        },
        status: {
          'success-bg': 'var(--color-status-success-bg)',
          'success-text': 'var(--color-status-success-text)',
          'warning-bg': 'var(--color-status-warning-bg)',
          'warning-text': 'var(--color-status-warning-text)',
          'danger-bg': 'var(--color-status-danger-bg)',
          'danger-text': 'var(--color-status-danger-text)',
        },
        tag: {
          blue: 'var(--color-tag-blue)',
          green: 'var(--color-tag-green)',
          coral: 'var(--color-tag-coral)',
          purple: 'var(--color-tag-purple)',
          teal: 'var(--color-tag-teal)',
          amber: 'var(--color-tag-amber)',
        },
        'tag-tint': {
          blue: 'var(--color-tag-tint-blue)',
          green: 'var(--color-tag-tint-green)',
          coral: 'var(--color-tag-tint-coral)',
          purple: 'var(--color-tag-tint-purple)',
          teal: 'var(--color-tag-tint-teal)',
          amber: 'var(--color-tag-tint-amber)',
        },
        'tag-ink': {
          blue: 'var(--color-tag-ink-blue)',
          green: 'var(--color-tag-ink-green)',
          coral: 'var(--color-tag-ink-coral)',
          purple: 'var(--color-tag-ink-purple)',
          teal: 'var(--color-tag-ink-teal)',
          amber: 'var(--color-tag-ink-amber)',
        },
      },
      boxShadow: {
        card: '0 10px 25px rgba(2,6,23,0.08)'
      }
    },
  },
  plugins: [typography],
} satisfies Config


