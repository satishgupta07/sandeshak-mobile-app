/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Signal-inspired dark palette — hex equivalents of the webapp's
        // oklch tokens so React Native renderers can parse them.
        background: '#161a26',
        foreground: '#f0f2f7',

        surface: '#1f2433',
        'surface-2': '#262c3d',
        'surface-hover': '#2f3649',

        card: '#1f2433',
        'card-foreground': '#f0f2f7',

        primary: {
          DEFAULT: '#4a78ff',
          hover: '#3a68ef',
          foreground: '#ffffff',
        },

        muted: {
          DEFAULT: '#262c3d',
          foreground: '#9aa0b0',
        },

        accent: {
          DEFAULT: '#4a78ff',
          foreground: '#ffffff',
        },

        destructive: {
          DEFAULT: '#e35454',
          foreground: '#ffffff',
        },

        warning: {
          DEFAULT: '#e0b647',
          foreground: '#3a2e10',
        },

        success: {
          DEFAULT: '#3fc97c',
          foreground: '#0f2a1d',
        },

        bubble: {
          own: '#4f7bff',
          'own-foreground': '#ffffff',
          peer: '#262c3d',
          'peer-foreground': '#f0f2f7',
        },

        border: {
          DEFAULT: '#2a3142',
          strong: '#384057',
        },
      },
      borderRadius: {
        '4xl': '28px',
      },
    },
  },
  plugins: [],
};
