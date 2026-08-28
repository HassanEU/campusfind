import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * The CampusFind design system.
 *
 * Identity: a calm, dense, "operational" interface. Ink-blue neutrals rather
 * than pure grey, one confident brand accent, and semantic colours that map
 * directly onto the workflow states (open / matched / pending / returned).
 * Small radii, hairline borders and restrained shadows — depth comes from the
 * surface hierarchy, not from drop shadows.
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1.25rem', lg: '2rem' },
      screens: { '2xl': '1320px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        /** Layered surfaces: canvas -> panel -> raised. */
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          muted: 'hsl(var(--surface-muted))',
          raised: 'hsl(var(--surface-raised))',
        },

        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          foreground: 'hsl(var(--primary-foreground))',
          subtle: 'hsl(var(--primary-subtle))',
        },

        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },

        /** Workflow semantics — used for every status badge in the product. */
        success: { DEFAULT: 'hsl(var(--success))', subtle: 'hsl(var(--success-subtle))' },
        warning: { DEFAULT: 'hsl(var(--warning))', subtle: 'hsl(var(--warning-subtle))' },
        danger:  { DEFAULT: 'hsl(var(--danger))',  subtle: 'hsl(var(--danger-subtle))'  },
        info:    { DEFAULT: 'hsl(var(--info))',    subtle: 'hsl(var(--info-subtle))'    },
      },

      borderRadius: {
        lg: '10px',
        md: '8px',
        sm: '6px',
      },

      fontFamily: {
        sans: ['InterVariable', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'JetBrains Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.375rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.375rem', { lineHeight: '1.85rem', letterSpacing: '-0.015em' }],
        '3xl': ['1.75rem', { lineHeight: '2.15rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.6rem', letterSpacing: '-0.025em' }],
        '5xl': ['3rem', { lineHeight: '3.25rem', letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem', { lineHeight: '4rem', letterSpacing: '-0.035em' }],
      },

      boxShadow: {
        xs: '0 1px 2px 0 hsl(var(--shadow-color) / 0.05)',
        sm: '0 1px 3px 0 hsl(var(--shadow-color) / 0.07), 0 1px 2px -1px hsl(var(--shadow-color) / 0.05)',
        md: '0 4px 12px -2px hsl(var(--shadow-color) / 0.08), 0 2px 4px -2px hsl(var(--shadow-color) / 0.04)',
        lg: '0 12px 32px -8px hsl(var(--shadow-color) / 0.12), 0 4px 8px -4px hsl(var(--shadow-color) / 0.05)',
        popover: '0 16px 48px -12px hsl(var(--shadow-color) / 0.18)',
      },

      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },

      animation: {
        'fade-up': 'fade-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
