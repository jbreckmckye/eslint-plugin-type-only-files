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
        "banEnums": true,
        "filePattern": "\.types\.tsx?$"
      }
    ]
  }
}
```

## Configuration

### `banEnums`

Prohibit enums in type-only files. Note that this can't detect when an enum is exported via `export type { ... }`.

### `filePattern`

Specify the pattern for "type only files" in your project. By default, this is any file ending `.types.ts[x]`

## Errors

### Imports

```
Type-only files should only use type imports (e.g. "import type { }")
```

Rationale:

- Prevents a type-file performing side effects via the import statement

Banned:

```typescript
import 'sideEffect'
import * as A from 'file'
import { A, B } from 'file'
```

Allowed:

```typescript
import type * as T from 'file'
import type { A, B } from 'file'
import { type A, type B } from 'file'
```

### Exports

```
Type-only files should only export types, interfaces, or enums
```

Rationale:

- A type-file should only contribute types to a project
- A type-file should only re-export types, without side effects

Banned:

```typescript
export const variable = 'a'
export default someExpression()
export { value1, value2 }
```

Allowed:

```typescript
export type A = { }
export type { Foo, Bar }
export enum MyEnum { }
```

### Non-types

```
Type-only files should only declare types, interfaces, or enums. Found a VariableDeclaration
```

Rationale:

- A type-file should only declare, export or import pure types
- If you need to do a `typeof`, export a type from a non-type file

## License, contribution, etc.

This software is MIT licensed.

Please feel free to contribute changes and issues to the GitHub project. Pull requests are welcome.

Copyright Jimmy Breck-McKye 2023
