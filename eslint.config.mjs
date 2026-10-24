// Lint + security rules. `npm run lint`
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nounsanitized from 'eslint-plugin-no-unsanitized';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'data/**'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  nounsanitized.configs.recommended,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // Security: never build HTML from strings in the page, never eval.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-restricted-properties': ['error',
        { property: 'innerHTML', message: 'Build DOM with el()/textContent instead.' },
        { property: 'outerHTML', message: 'Build DOM with el()/textContent instead.' },
        { object: 'document', property: 'write', message: 'Not allowed.' },
      ],
      'no-restricted-syntax': ['error',
        { selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: 'Not allowed.' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
);
