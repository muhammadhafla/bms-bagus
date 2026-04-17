import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        display: ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        h1: ['2.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        h2: ['2rem', { lineHeight: '1.25', fontWeight: '600' }],
        h3: ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        h4: ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        body: ['1rem', { lineHeight: '1.5' }],
        caption: ['0.875rem', { lineHeight: '1.4' }],
        'caption-sm': ['0.75rem', { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
