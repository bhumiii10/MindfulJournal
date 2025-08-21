// functions/.eslintrc.cjs
module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.json"], // fixed: was ".tsconfig.json"
        tsconfigRootDir: __dirname,
        sourceType: "module",
    },
    plugins: ["@typescript-eslint", "import"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "google",
    ],
    env: { node: true, es2022: true },
    ignorePatterns: [
        "lib/**",
        "node_modules/**",
        ".eslintrc.cjs", // don't lint the config file
        "*.config.js",
        "*.config.cjs",
    ],
    overrides: [{
            files: ["src/**/*.ts"], // fixed: was "src//*.ts"
            rules: {
                "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            },
        },
        {
            // JS/CJS config files: disable TS project parsing
            files: ["**/*.js", "**/*.cjs"], // fixed: no leading slash, proper globs
            parserOptions: { project: null },
        },
    ],
    rules: {
        "import/no-unresolved": "off",
        "require-jsdoc": "off",
        quotes: ["error", "double", { avoidEscape: true }],
    },
};