import * as AST from '@typescript-eslint/types/dist/ast-spec'
import { AST_NODE_TYPES } from '@typescript-eslint/types/dist/ast-spec'
import { JSONSchema, TSESLint } from '@typescript-eslint/utils'
import { RuleMetaDataDocs } from '@typescript-eslint/utils/dist/ts-eslint'

/**
 * Types
 * ============================================================================
 */

type Options = {
  banEnums?: boolean,
  filePattern?: string | RegExp
}

type MessageIDs = keyof typeof ERROR_MESSAGES

/**
 * Constants
 * ============================================================================
 */

const DOCS: RuleMetaDataDocs = {
  description: 'Makes selected files type-only (so they can be excluded from test coverage, etc.)',
  recommended: 'error',
  url: 'https://github.com/jbreckmckye/eslint-plugin-type-only-files/README.md'
}

const ERROR_MESSAGES = {
  exportTypes: 'Type-only files should only export {{ allowed }}.',
  importTypes: 'Type-only files should only use type imports (e.g. `import type { }`).',
  noEnums: 'Enums are not allowed by your type-only-files config (option: banEnums=true).',
  noNonTypes: 'Type-only files should only declare {{ allowed }}. Found a {{ type }}.'
}

const OPTIONS_SCHEMA: JSONSchema.JSONSchema4 = {
  maxItems: 1,
  minItems: 0,
  items: [
    {
      type: 'object',
      properties: {
        allowEnums: {type: 'boolean', required: false},
        filePattern: {type: 'string', required: false}
      }
    }
  ]
}

/**
 * Rule: typeFile
 * ============================================================================
 */

export const onlyTypes: TSESLint.RuleModule<MessageIDs, [Options | undefined]> = {
  meta: {
    docs: DOCS,
    messages: ERROR_MESSAGES,
    type: 'problem',
    schema: OPTIONS_SCHEMA
  },
  create(ctx) {
    const {banEnums, filePattern} = ctx.options[0] || {}
    const fileMatch = getFileMatch(filePattern)

    // Bail out if this is not a matched file pattern
    if (!ctx.getFilename().match(fileMatch)) {
      return {
        // Null visitor
      }
    }

    const allowed = banEnums
      ? 'types or interfaces'
      : 'types, interfaces, or enums'

    return {
      // Rather than visiting all the nodes, we only need to query the top level statements.
      Program(program: AST.Program) {
        for (const programNode of program.body) {
          switch (programNode.type) {
            // Exports
            // ============================================================================

            case AST_NODE_TYPES.ExportAllDeclaration: {
              // ex. export * from 'foo'
              // ex. export type * from 'foo'
              // Shortcoming: cannot tell when `export type` is exporting an enum
              const {exportKind} = programNode
              if (exportKind !== 'type') {
                ctx.report({node: programNode, messageId: 'exportTypes', data: {allowed}})
              }
              break
            }

            case AST_NODE_TYPES.ExportDefaultDeclaration:
              // ex: export default { ... }
              // Default exports cannot be types, they must always be an expression, function or class
              ctx.report({node: programNode, messageId: 'exportTypes', data: {allowed}})
              break

            case AST_NODE_TYPES.ExportNamedDeclaration: {
              // ex. export const Thing = ...
              // ex. export type Thing = ...
              // ex. export { foo, bar }
              // ex. export type { Foo, Bar }
              // Shortcoming: hard to tell if non-type-style export is actually exporting types
              const {declaration, exportKind, specifiers} = programNode
              const isTypeExport = exportKind === 'type' || (!banEnums && declaration?.type === AST_NODE_TYPES.TSEnumDeclaration) || specifiers.every(
                specifier => 'exportKind' in specifier && specifier.exportKind === 'type'
              )
              if (!isTypeExport) {
                ctx.report({node: programNode, messageId: 'exportTypes', data: {allowed}})
              }
              break
            }

            // Imports
            // ============================================================================

            case AST_NODE_TYPES.ImportDeclaration: {
              // ex. import 'sideEffect'
              // ex. import * as A from 'a'
              // ex. import type * as A from 'a'
              // ex. import { A, type B } from 'b'
              // ex. import type { A, B } from 'c'
              const {importKind, specifiers} = programNode
              const typeImport = importKind === 'type' || specifiers.every(
                specifier => 'importKind' in specifier && specifier.importKind === 'type'
              )
              if (!typeImport) {
                ctx.report({node: programNode, messageId: 'importTypes'})
              }
              break
            }

            // Type declarations
            // ============================================================================

            case AST_NODE_TYPES.TSTypeAliasDeclaration:
            case AST_NODE_TYPES.TSInterfaceDeclaration:
              // ex. type Alpha = ...
              // ex. interface Alpha { ... }
              break

            case AST_NODE_TYPES.TSEnumDeclaration:
              // ex. enum Thing { }
              if (banEnums) ctx.report({node: programNode, messageId: 'noEnums'})
              break

            // Ban everything else
            // ============================================================================
            default:
              ctx.report({node: programNode, messageId: 'noNonTypes', data: {allowed, type: programNode.type}})
          }
        }
      }
    }
  }
}

function getFileMatch(pattern: Options['filePattern']) {
  if (!pattern) {
    return /[.\\/]types\.tsx?$/g

  } else if (pattern instanceof RegExp) {
    return pattern

  } else {
    return new RegExp(pattern)
  }
}
