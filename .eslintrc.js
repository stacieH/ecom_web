module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended"
    ],
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        },
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "plugins": [
        "react"
    ],
    "settings": {
        "react": {
          "version": 'latest',
        },
    },
    "parser":"babel-eslint",
    "rules": {
        "quotes": ['error', 'single'],
        "semi": ['error', 'always'],
        "no-console": 'error',
        "no-debugger": 'error',
        "no-dupe-keys": 'error',
        "no-unused-vars": ['error', { vars: 'all', args: 'after-used', ignoreRestSiblings: false }],
    }
};

