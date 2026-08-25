import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '.wxt/',
      '.output/',
      'node_modules/',
      // Каталоги, которые переезжают в этапах 2-6. Список сокращается в каждом
      // этапе и к концу этапа 6 обязан остаться без строк ниже этой.
      'src/components/',
      'src/entrypoints/',
      'src/features/dashboard/',
      'src/features/marketplace/',
      'src/features/settings/',
      'src/features/themes/',
      'src/plugins/',
      'src/sdk/',
      'src/services/',
      'src/stores/',
      'src/widgets/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Корневые конфиги на JS не входят ни в один tsconfig, а типизированные
    // правила им и не нужны: плагины ESLint не поставляют типов, из-за чего
    // любой их импорт выглядел бы как any.
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      // В тестах намеренно подаются некорректные значения, чтобы проверить отказ.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  prettier,
);
