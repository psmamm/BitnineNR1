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
      // BITGET-INSPIRED DESIGN SYSTEM (2026)
      // Minimal Colors: Dark + Teal + White
      // ===========================================
      colors: {
        // Semantic colors (shadcn-ui compatible)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Primary - CYAN (Bitget Style)
        primary: {
          DEFAULT: '#03AAC7',
          foreground: '#151517',
          hover: '#26BFD4',
          muted: 'rgba(3, 170, 199, 0.1)',
          glow: 'rgba(3, 170, 199, 0.3)',
        },

        // Secondary - Dark with border
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        // Destructive / Danger
        destructive: {
          DEFAULT: '#F43F5E',
          foreground: '#FFFFFF',
        },

        // Muted
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        // Accent - Same as Primary (Cyan)
        accent: {
          DEFAULT: '#03AAC7',
          foreground: '#151517',
          hover: '#26BFD4',
        },

        // Popover
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // Card
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ===========================================
        // BITGET DARK BACKGROUNDS (STRICT!)
        // ===========================================
        dark: {
          base: '#151517',        // Main background (Bitget: rgb(21,21,23))
          elevated: '#1B1B1D',    // Cards, Panels (Bitget: rgb(27,27,29))
          surface: '#252629',     // Inputs, Dropdowns (Bitget: rgb(37,38,41))
          hover: '#2B2F36',       // Hover states
          border: '#2B2F36',      // All borders
          subtle: '#3A3E45',      // Hover borders
        },

        // Bitget specific colors
        bitget: {
          bg: '#151517',
          card: '#1B1B1D',
          input: '#252629',
          border: '#2B2F36',
          'border-hover': '#3A3E45',
          accent: '#03AAC7',
          'accent-hover': '#26BFD4',
        },

        // Text colors
        text: {
          primary: '#FFFFFF',
          secondary: '#9CA3AF',
          muted: '#6B7280',
          disabled: '#4B5563',
        },

        // Status colors (sparingly used!)
        success: {
          light: '#34D399',
          DEFAULT: '#03AAC7',     // Same as accent
          dark: '#028BA3',
        },

        danger: {
          light: '#FB7185',
          DEFAULT: '#F43F5E',
          dark: '#E11D48',
        },

        warning: {
          light: '#FBBF24',
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },

        // Profit/Loss - ONLY use for trading data
        profit: '#03AAC7',        // Cyan (same as accent)
        loss: '#F43F5E',          // Red
      },

      // ===========================================
      // BORDER RADIUS - Bitget Style (4, 8, 12, 16, 32)
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
      // TYPOGRAPHY - Premium Font Sizes
      // ===========================================
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.375rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.125rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.25rem", { lineHeight: "1.75rem" }],
        "3xl": ["1.5rem", { lineHeight: "2rem" }],
        "4xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "5xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "6xl": ["3rem", { lineHeight: "1" }],
        "7xl": ["3.75rem", { lineHeight: "1" }],
      },

      // ===========================================
      // FONT FAMILY - Bitget Style (DM Sans as Pulse alternative)
      // ===========================================
      fontFamily: {
        sans: ['DM Sans', 'Arial', 'Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
        display: ['DM Sans', 'Cal Sans', 'Inter', 'sans-serif'],
      },

      // ===========================================
      // SHADOWS - Bitget Style (Subtle)
      // ===========================================
      boxShadow: {
        'soft-sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
        'soft-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        'soft-2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        // Glow shadows - CYAN (Bitget accent)
        'glow': '0 0 20px rgba(3, 170, 199, 0.3)',
        'glow-sm': '0 0 10px rgba(3, 170, 199, 0.2)',
        'glow-lg': '0 0 40px rgba(3, 170, 199, 0.4)',
        'glow-success': '0 0 20px rgba(3, 170, 199, 0.3)',
        'glow-danger': '0 0 20px rgba(244, 63, 94, 0.3)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.3)',
        // Card elevation - Bitget style
        'card': '0 4px 20px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.5)',
        // Dropdown shadow
        'dropdown': '0 10px 40px rgba(0, 0, 0, 0.5)',
      },

      // ===========================================
      // BACKDROP BLUR
      // ===========================================
      backdropBlur: {
        xs: '2px',
        '2xl': '24px',
        '3xl': '40px',
      },

      // ===========================================
      // ANIMATIONS - Butter Smooth
      // ===========================================
      animation: {
        // Fade animations
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',

        // Slide animations
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',

        // Scale animations
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-out',

        // Glow pulse
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',

        // Shimmer loading
        'shimmer': 'shimmer 2s linear infinite',

        // Number count up
        'count-up': 'countUp 0.4s ease-out',

        // Bounce subtle
        'bounce-subtle': 'bounceSubtle 0.5s ease-out',

        // Spin slow
        'spin-slow': 'spin 3s linear infinite',

        // Float
        'float': 'float 3s ease-in-out infinite',

        // Pulse soft
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },

      // ===========================================
      // KEYFRAMES
      // ===========================================
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          from: { opacity: '0', transform: 'translateX(10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.95)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(3, 170, 199, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(3, 170, 199, 0.5)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },

      // ===========================================
      // TRANSITION TIMING FUNCTIONS
      // ===========================================
      transitionTimingFunction: {
        'ease-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out-back': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ease-in-out-soft': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ease-apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },

      // ===========================================
      // TRANSITION DURATION
      // ===========================================
      transitionDuration: {
        '0': '0ms',
        '50': '50ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },

      // ===========================================
      // BACKGROUND IMAGE - Bitget Gradients
      // ===========================================
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Bitget-style gradients (subtle, not flashy)
        'gradient-primary': 'linear-gradient(135deg, #03AAC7 0%, #028BA3 100%)',
        'gradient-profit': 'linear-gradient(135deg, #03AAC7 0%, #028BA3 100%)',
        'gradient-loss': 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
        'gradient-card': 'linear-gradient(135deg, #252629 0%, #1B1B1D 100%)',
        'gradient-glow': 'radial-gradient(circle, rgba(3, 170, 199, 0.1) 0%, transparent 70%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        // Promo card gradient
        'gradient-promo': 'linear-gradient(135deg, #252629 0%, #1B1B1D 100%)',
      },
    },
  },
  plugins: [],
};
