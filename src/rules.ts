import * as AST from '@typescript-eslint/types/dist/ast-spec'
import { TSESLint } from '@typescript-eslint/utils'

/**
 * Module Types
 * ============================================================================
 */

type Options = {
  allowEnums?: true,
  filePattern?: string | RegExp
}

type MessageIDs = keyof typeof ERROR_MESSAGES

/**
 * Constants
 * ============================================================================
 */

const DEFAULT_FILE_PATTERN = /\.types\.ts(x?)$/g

const ERROR_MESSAGES = {
  exportTypes: 'Type-only files should only export types or interfaces',
  exportTypesOrEnums: 'Type-only files should only export types, interfaces, or enums',
  importTypes: 'Type-only files should only use "import type"',
  noEnums: 'Enums are not allowed by your configuration (allowEnums)',
  noNonTypes: 'Type-only files should only declare types or interfaces. Found a {{ type }}',
  noNonTypesOrEnums: 'Type-only files should only declare types, interfaces, or enums. Found a {{ type }}'
}

/**
 * Rule: typeOnlyFile
 * ============================================================================
 */

export const typeOnlyFile: TSESLint.RuleModule<MessageIDs, [Options | undefined]> = {
  meta: {
    docs: {
      description: 'Makes selected files type-only (so they can be excluded from test coverage, etc.)',
      recommended: 'error',
      url: 'https://github.com/jbreckmckye/eslint-plugin-type-only-files/README.md'
    },
    messages: ERROR_MESSAGES,
    type: 'problem',
    schema: [{
      type: 'object',
      properties: {
        allowEnums: {type: 'boolean', required: false},
        filePattern: {type: 'string', required: false}
      }
    }]
  },
  create(ctx) {
    const { allowEnums, filePattern } = ctx.options[0] || {}
    const fileMatch = parseFilePattern(filePattern)

    if (ctx.getFilename().match(fileMatch)) {
      // todo Just a big list o' lines we've already warned on. Needs profiling...
      const invalidLines: number[] = []

      const walker = new WalkerState()

      const reportNonTypeExport = (node: AST.Node) => ctx.report({
        node,
        messageId: allowEnums ? 'exportTypesOrEnums' : 'exportTypes'
      })

      return {
        /**
         * Primary check for whether node is prohibited
         * todo: a more efficient check could be to just traverse the top level items in (node:Program).body ?
         */
        '*'(node: AST.Node) {
          switch (node.type) {
            // These nodes are always allowed
            case 'ExportAllDeclaration':
            case 'ExportNamedDeclaration':
            case 'ExportDefaultDeclaration':
            case 'ImportDeclaration':
            case 'Program':
            case 'TSTypeAliasDeclaration':
            case 'TSInterfaceDeclaration':
              break
            // Enums are sometimes allowed
            case 'TSEnumDeclaration':
              if (!allowEnums) {
                ctx.report({node, messageId: 'noEnums'})
              }
              break

            default:
              if (
                !walker.insideType &&                           // Skip subtree of a type declaration
                !walker.insideImport &&                         // Skip subtree of an import declaration
                invalidLines.indexOf(node.loc.start.line) == -1 // Skip warning on lines that already have errors
              ) {
                ctx.report({
                  node,
                  messageId: allowEnums ? 'noNonTypesOrEnums' : 'noNonTypes',
                  data: {
                    type: node.type
                  }
                })
                for (let i = node.loc.start.line; i <= node.loc.end.line; i++) {
                  invalidLines.push(i)
                }
              }
          }
        },

        /**
         * Enforce exporting of types
         */
        'ExportNamedDeclaration'(node: AST.ExportNamedDeclaration) {
          if (node.exportKind === 'value' && node.declaration?.type !== 'TSEnumDeclaration') {
            reportNonTypeExport(node)
          }
        },
        'ExportDefaultDeclaration'(node: AST.ExportDefaultDeclaration) {
          // This should always be invalid as the spec says `export default` must always be followed by an expression, function, or class
          reportNonTypeExport(node)
        },
        'ExportAllDeclaration'(node: AST.ExportAllDeclaration) {
          // Limitation: this can't detect when `export type *` includes an enum
          if (node.exportKind == 'value') {
            reportNonTypeExport(node)
          }
        },

        /**
         * Enforce importing of types
         * Skip inspecting subtrees of import statements
         */
        'ImportDeclaration'(node: AST.ImportDeclaration) {
          walker.enterImportDeclaration()
          if (node.importKind == 'value') {
            ctx.report({node, messageId: 'importTypes'})
          }
        },
        'ImportDeclaration:exit': walker.exitImportDeclaration,

        /**
         * We switch off node checks whilst within a type declaration.
         * Type declarations cannot be nested, so it's safe to have a context-free switch.
         */

        'TSTypeAliasDeclaration': walker.enterTypeDeclaration,
        'TSInterfaceDeclaration': walker.enterTypeDeclaration,
        'TSEnumDeclaration': walker.enterTypeDeclaration,

        'TSTypeAliasDeclaration:exit': walker.exitTypeDeclaration,
        'TSInterfaceDeclaration:exit': walker.exitTypeDeclaration,
        'TSEnumDeclaration:exit': walker.exitTypeDeclaration
      }

    } else {
      // File is not a types-file, nothing to do
      return {}
    }
  }
}

class WalkerState {
  insideType = false
  insideImport = false

  enterImportDeclaration = () => {
    this.insideImport = true
  }

  exitImportDeclaration = () => {
    this.insideImport = false
  }

  enterTypeDeclaration = () => {
    this.insideType = true
  }

  exitTypeDeclaration = () => {
    this.insideType = false
  }
}

// todo this is not needed - by default eslint will not apply rules from plugins
function parseFilePattern(filePattern?: string | RegExp) {
  if (typeof filePattern === 'string') {
    return new RegExp(filePattern)

  } else if (filePattern instanceof RegExp) {
    return filePattern

  } else {
    return DEFAULT_FILE_PATTERN
  }
}
