# eslint-plugin-type-only-files

An ESLint plugin to support **type-only files** in TypeScript. Files with a matching pattern can only use types,
interfaces and enums.

## Use cases

- Files that should only describe types - e.g. `api.types.ts`
- Safely excluding type-only files from test coverage
- In a monorepo, safely excluding changes to type-only modules from test / deploy invalidation

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
        "filePattern": /\.types\.tsx?$/.source
      }
    ]
  }
}
```

## Configuration

### `banEnums`

Prohibit enums in type-only files.

Note that this can't detect when an enum is imported via `import type { MyEnum }`.

### `filePattern`

Specify the pattern for "type only files" in your project. By default, this is any file ending `.types.ts[x]`

## Errors

### Imports

```
Type-only files should only use type imports (e.g. "import type { }").
```

Rationale:

- Prevents a type-file performing side effects via the import statement

Banned:

```typescript
import 'sideEffect'
import * as A from 'file'
import { valueA, valueB } from 'file'
```

Allowed:

```typescript
import type * as T from 'file'
import type { TypeA, TypeB } from 'file'
import { type TypeA, type TypeB } from 'file'
```

### Exports

```
Type-only files should only export types, interfaces, or enums.
```

Rationale:

- A type-file should only contribute types to a project
- A type-file should only re-export types, without side effects

Banned:

```typescript
export const variable = 'a'
export default someExpression()

export { valueA, valueB }
export { type TypeA, valueB }
```

Allowed:

```typescript
export type TypeA = { }

export type { TypeA, TypeB }
export { type TypeA, type TypeB }

export enum MyEnum { }
```

Limitation: this plugin cannot detect the case `export { MyEnum }` as a type-only export. Work around this with `export
enum MyEnum { ... }`.

### Non-types

```
Type-only files should only declare types, interfaces, or enums. Found a VariableDeclaration.
```

Rationale:

- A type-file should only declare, export or import pure types
- If you need to do a `typeof`, export a type from a non-type file

## License, contribution, etc.

This software is MIT licensed.

Please feel free to contribute changes and issues to the GitHub project. Pull requests are welcome.

Copyright Jimmy Breck-McKye 2023
