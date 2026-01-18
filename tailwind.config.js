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
      // BITGET EXACT DESIGN SYSTEM (2026)
      // Colors extracted from Bitget UI analysis
      // ===========================================
      colors: {
        // Semantic colors (shadcn-ui compatible)
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
        // BITGET EXACT COLORS
        // ===========================================
        
        // Dark Mode Backgrounds
        bitget: {
          // Page background
          'bg': '#0D0D0E',
          'bg-page': '#0D0D0E',
          // Card background
          'bg-card': '#16171A',
          // Input/Surface background
          'bg-input': '#1F2024',
          // Button background
          'bg-button': '#2B2E33',
          'bg-button-hover': '#363A40',
          // Hover states
          'bg-hover': '#1A1A1C',
          
          // Borders
          'border': '#3A3D42',
          'border-light': '#E5E7EB',
          'border-strong': '#D1D5DB',
          
          // Text - Dark Mode
          'text': '#FFFFFF',
          'text-secondary': '#72757A',
          'text-muted': '#5A5D63',
          
          // Text - Light Mode
          'text-light': '#1F2937',
          'text-secondary-light': '#6B7280',
          'text-muted-light': '#9CA3AF',
          
          // Accent Colors
          'green': '#00B87A',
          'teal': '#00B8A9',
          'green-dark': '#1E8A6E',
          'orange': '#E67E22',
          'red': '#F04B4B',
          'gold': '#F0B90B',
          
          // Badge backgrounds
          'badge-enabled': '#1A2E1A',
          'badge-enabled-light': '#E6F7F1',
          'badge-disabled': '#2B2E33',
          'badge-disabled-light': '#F3F4F6',
        },

        // Status colors
        success: {
          DEFAULT: '#00B87A',
          light: '#E6F7F1',
          dark: '#1A2E1A',
        },

        danger: {
          DEFAULT: '#F04B4B',
          light: '#FEE2E2',
          dark: '#2E1A1A',
        },

        warning: {
          DEFAULT: '#E67E22',
          light: '#FEF3E7',
          dark: '#2E251A',
        },

        // Profit/Loss
        profit: '#00B87A',
        loss: '#F04B4B',
      },

      // ===========================================
      // BORDER RADIUS - Bitget Style
      // ===========================================
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '32px',
        'full': '9999px',
      },

      // ===========================================
      // TYPOGRAPHY
      // ===========================================
      fontSize: {
        'xs': ["0.75rem", { lineHeight: "1rem" }],        // 12px
        'sm': ["0.8125rem", { lineHeight: "1.25rem" }],   // 13px
        'base': ["0.875rem", { lineHeight: "1.375rem" }], // 14px
        'lg': ["1rem", { lineHeight: "1.5rem" }],         // 16px
        'xl': ["1.125rem", { lineHeight: "1.75rem" }],    // 18px
        '2xl': ["1.25rem", { lineHeight: "1.75rem" }],    // 20px
        '3xl': ["1.5rem", { lineHeight: "2rem" }],        // 24px
        '4xl': ["1.875rem", { lineHeight: "2.25rem" }],   // 30px
        '5xl': ["2.25rem", { lineHeight: "2.5rem" }],     // 36px
        '6xl': ["3rem", { lineHeight: "1" }],             // 48px
      },

      // ===========================================
      // FONT FAMILY
      // ===========================================
      fontFamily: {
        sans: ['DM Sans', 'Arial', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },

      // ===========================================
      // SHADOWS
      // ===========================================
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        'dropdown': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.1)',
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
        'shimmer': 'shimmer 2s linear infinite',
        'spin': 'spin 1s linear infinite',
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
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
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
