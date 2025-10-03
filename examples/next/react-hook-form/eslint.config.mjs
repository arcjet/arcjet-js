import { FlatCompat } from '@eslint/eslintrc'
import prettier from 'eslint-config-prettier';
import tailwind from 'eslint-plugin-tailwindcss';

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
})

const eslintConfig = [
  ...compat.config({
    extends: ['next/core-web-vitals'],
  }),
  prettier,
  ...tailwind.configs['flat/recommended'],
  {
    settings: {
      "tailwindcss": {
        "callees": ["cn"],
        "config": "tailwind.config.js"
      },
    },
  },
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react/jsx-key": "off",
      "tailwindcss/no-custom-classname": "off"
    },
  },
  {
    ignores: [
      "dist/*",
      ".cache",
      "public",
      "node_modules",
      "*.esm.js",
    ]
  }
]

export default eslintConfig
