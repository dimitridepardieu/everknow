import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'src/routeTree.gen.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // - shadcn ships cva variant configs alongside components in ui/ files
    //   (Button + buttonVariants). cva() returns a function, not a literal,
    //   so `allowConstantExport: true` doesn't cover it.
    // - TanStack Router's file-based convention exports both `Route` (a
    //   route object) and the route component from the same file.
    // Disable Fast Refresh enforcement in both directories.
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
