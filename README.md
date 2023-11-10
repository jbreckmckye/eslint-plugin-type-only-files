# eslint-plugin-type-only-files

An ESLint plugin to support type-only files in TypeScript. Files with this rule enabled can only use types and interfaces.

### Why would I use this?

- You have `.ts` files that are only contain types / interfaces (e.g. `api.types.ts`)
- You want to exclude these files from things like unit test coverage
- But you also want ESLint to make sure no non-type code sneaks into these files

...then this plugin is for you.

## Installation

This plugin depends on `@typescript-eslint/parser`

```
yarn add --dev @typescript-eslint/parser eslint-plugin-type-only-files
```

Ensure the parser is set in your ESLint config (e.g. `.eslintrc`), then add the plugin:

```
{
  "parser": "@typescript-eslint/parser",
  "plugins": [
    "type-only-files"
  ],
  "rules": {
    "type-only-files/only-types": ["error"]
  }
}
```

The rule will default to banning non-types and non-type import/exports in files named `*.types.ts(x)`.

Modify your configuration as desired (defaults are shown):

```
{
  "rules": {
    "type-only-files/only-types": [
      "error", {
        "filePattern": "\.types\.tsx?$",
        "allowEnums": false
      }
    ]
  }
}
```

## Rule(s)

## License, contribution, etc.
