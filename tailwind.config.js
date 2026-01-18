/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/react-app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // ===========================================
      // BINANCE-INSPIRED DESIGN SYSTEM
      // Professional, Clean, Minimal
      // ===========================================
      colors: {
        // shadcn/ui semantic colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ===========================================
        // BINANCE COLOR PALETTE
        // ===========================================

        // Backgrounds
        surface: {
          DEFAULT: '#1E2026',
          dark: '#0B0E11',
          light: '#2B3139',
          hover: '#363C46',
        },

        // Primary Accent - Binance Yellow
        brand: {
          DEFAULT: '#FCD535',
          hover: '#FFE066',
          muted: 'rgba(252, 213, 53, 0.1)',
        },

        // Trading Colors
        profit: {
          DEFAULT: '#0ECB81',
          hover: '#2ED47A',
          muted: 'rgba(14, 203, 129, 0.1)',
        },

        loss: {
          DEFAULT: '#F6465D',
          hover: '#FF6B7A',
          muted: 'rgba(246, 70, 93, 0.1)',
        },

        // Info Blue
        info: {
          DEFAULT: '#1E88E5',
          hover: '#42A5F5',
          muted: 'rgba(30, 136, 229, 0.1)',
        },

        // Text colors
        'text-primary': '#EAECEF',
        'text-secondary': '#848E9C',
        'text-tertiary': '#5E6673',
        'text-disabled': '#474D57',

        // Border colors
        'border-default': '#2B3139',
        'border-hover': '#3D4654',

        // Legacy support - map old names
        success: {
          DEFAULT: '#0ECB81',
          light: 'rgba(14, 203, 129, 0.1)',
        },

        danger: {
          DEFAULT: '#F6465D',
          light: 'rgba(246, 70, 93, 0.1)',
        },

        warning: {
          DEFAULT: '#F0B90B',
          light: 'rgba(240, 185, 11, 0.1)',
        },
      },

      // ===========================================
      // BORDER RADIUS
      // ===========================================
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'full': '9999px',
      },

      // ===========================================
      // TYPOGRAPHY
      // ===========================================
      fontSize: {
        'xs': ["0.75rem", { lineHeight: "1rem" }],
        'sm': ["0.8125rem", { lineHeight: "1.25rem" }],
        'base': ["0.875rem", { lineHeight: "1.375rem" }],
        'lg': ["1rem", { lineHeight: "1.5rem" }],
        'xl': ["1.125rem", { lineHeight: "1.75rem" }],
        '2xl': ["1.25rem", { lineHeight: "1.75rem" }],
        '3xl': ["1.5rem", { lineHeight: "2rem" }],
        '4xl': ["1.875rem", { lineHeight: "2.25rem" }],
        '5xl': ["2.25rem", { lineHeight: "2.5rem" }],
        '6xl': ["3rem", { lineHeight: "1" }],
      },

      // ===========================================
      // FONT FAMILY
      // ===========================================
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },

      // ===========================================
      // SHADOWS
      // ===========================================
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'DEFAULT': '0 2px 4px rgba(0, 0, 0, 0.3)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.4)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.5)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.5)',
        'glow-yellow': '0 0 20px rgba(252, 213, 53, 0.3)',
        'glow-green': '0 0 20px rgba(14, 203, 129, 0.3)',
        'glow-red': '0 0 20px rgba(246, 70, 93, 0.3)',
        'none': 'none',
      },

      // ===========================================
      // ANIMATIONS
      // ===========================================
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'spin': 'spin 0.8s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
      },

      // ===========================================
      // SPACING (8px grid)
      // ===========================================
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // ===========================================
      // TRANSITIONS
      // ===========================================
      transitionDuration: {
        '0': '0ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
};
