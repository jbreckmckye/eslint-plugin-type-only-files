import * as AST from '@typescript-eslint/types/dist/ast-spec'
import { TSESLint } from '@typescript-eslint/utils'

/**
 * Module Types
 * ============================================================================
 */

type CtxOptions = [
  {
    allowEnums?: true,
    filePattern?: string | RegExp
  }
]

type MessageIDs = keyof typeof ERROR_MESSAGES

/**
 * Constants
 * ============================================================================
 */

const DEFAULT_FILE_PATTERN = /\.types\.ts(x?)$/g

const ERROR_MESSAGES = {
  exportTypes: 'Type-only files should only export types or interfaces',
  exportTypesOrEnums: 'Type-only files should only export types, interfaces, or enums',
  importTypes: 'Type-only files should only import types or interfaces',
  noEnums: 'Type-only files are configured not to allow enums',
  noNonTypes: 'Type-only files should only declare types or interfaces. Found a { type }',
  noNonTypesOrEnums: 'Type-only files should only declare types, interfaces, or enums. Found a { type }'
}

/**
 * Rule: typeOnlyFile
 * ============================================================================
 */

export const typeOnlyFile: TSESLint.RuleModule<MessageIDs, CtxOptions> = {
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
    const [ { allowEnums } ] = ctx.options
    const fileMatch = getFilePattern(ctx.options)

    if (ctx.getFilename().match(fileMatch)) {
      let insideType = false

      const enterTypeDeclaration = () => {
        insideType = true
      }
      const exitTypeDeclaration = () => {
        insideType = false
      }
      const reportNonTypeExport = (node: AST.Node) => ctx.report({
        node,
        messageId: allowEnums ? 'exportTypesOrEnums' : 'exportTypes'
      })

      return {
        // Ignored items - highest precedence
        'Program'() {
          return
        },

        // Exports
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
        'ImportDeclaration'(node: AST.ImportDeclaration) {
          if (node.importKind == 'value') {
            ctx.report({node, messageId: 'importTypes'})
          }
        },

        // Disable rejections whilst in a type declaration
        'TSTypeAliasDeclaration:enter': enterTypeDeclaration,
        'TSInterfaceDeclaration:enter': enterTypeDeclaration,
        'TSEnumDeclaration'(node: AST.TSEnumDeclaration) {
          if (allowEnums) {
            enterTypeDeclaration()
          } else {
            ctx.report({node, messageId: 'noEnums'})
          }
        },

        // Re-enable rejections leaving a type declaration
        'TSTypeAliasDeclaration:exit': exitTypeDeclaration,
        'TSInterfaceDeclaration:exit': exitTypeDeclaration,
        'TSEnumDeclaration:exit': exitTypeDeclaration,

        // Other node types cause rejections (if outside of type declarations)
        '*'(node: AST.Node) {
          if (!insideType) {
            ctx.report({
              node,
              messageId: allowEnums ? 'noNonTypesOrEnums' : 'noNonTypes',
              data: {
                type: node.type
              }
            })
          }
        }
      }

    } else {
      // File disabled, no nodes to visit
      return {}
    }
  }
}

function getFilePattern(options: CtxOptions) {
  const [ { filePattern } ] = options

  if (typeof filePattern === 'string') {
    return new RegExp(filePattern)

  } else if (filePattern instanceof RegExp) {
    return filePattern

  } else {
    return DEFAULT_FILE_PATTERN
  }
}
