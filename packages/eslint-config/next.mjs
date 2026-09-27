import baseConfig from './base.mjs'

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    // Next.js specific overrides can go here
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Allow default exports for Next.js pages and layouts
    },
  },
]
