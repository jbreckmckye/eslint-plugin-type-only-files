import * as AST from '@typescript-eslint/types/dist/ast-spec'
import { TSESLint } from '@typescript-eslint/utils'

type CtxOptions = [
  {
    allowEnums?: true,
    filePattern?: string
  }
]

type MessageIDs = keyof typeof errorMessages
const errorMessages = {
  exportTypes: 'Type-only files should only export types or interfaces',
  exportTypesOrEnums: 'Type-only files should only export types, interfaces, or enums',
  importTypes: 'Type-only files should only import types or interfaces',
  noEnums: 'Type-only files are configured not to allow enums',
  noNonTypes: 'Type-only files should only declare types or interfaces. Found a { type }',
  noNonTypesOrEnums: 'Type-only files should only declare types, interfaces, or enums. Found a { type }'
}

export const onlyTypes: TSESLint.RuleModule<MessageIDs, CtxOptions> = {
  meta: {
    docs: {
      description: 'Makes selected files type-only (so they can be excluded from test coverage, etc.)',
      recommended: 'error',
      url: 'https://github.com/jbreckmckye/eslint-plugin-type-only-files/README.md'
    },
    messages: errorMessages,
    type: 'problem',
    schema: [{
      type: 'object',
      properties: {
        allowEnums: { type: 'boolean', required: false },
        filePattern: { type: 'string', required: false }
      }
    }]
  },
  create(ctx) {
    let insideType = false

    const [ config ] = ctx.options
    const badExportMessage: MessageIDs = config.allowEnums ? 'exportTypesOrEnums' : 'exportTypes'
    const badNodeMessage: MessageIDs = config.allowEnums ? 'noNonTypesOrEnums' : 'noNonTypes'

    return {
      // Ignored items
      'Program'() {
        return
      },

      // Exports
      'ExportNamedDeclaration'(node: AST.ExportNamedDeclaration) {
        const excluded = node.declaration?.type == 'TSEnumDeclaration' && config.allowEnums
        if (node.exportKind == 'value' && !excluded) {
          ctx.report({ node, messageId: badExportMessage })
        }
      },
      'ExportDefaultDeclaration'(node: AST.ExportDefaultDeclaration) {
        // This should always be invalid as the spec says `export default` must always be followed by an expression, function, or class
        ctx.report({ node, messageId: badExportMessage })
      },
      'ExportAllDeclaration'(node: AST.ExportAllDeclaration) {
        // Limitation: this can't detect when `export type *` includes an enum
        if (node.exportKind == 'value') {
          ctx.report({ node, messageId: badExportMessage })
        }
      },
      'ImportDeclaration'(node: AST.ImportDeclaration) {
        if (node.importKind == 'value') {
          ctx.report({ node, messageId: 'importTypes' })
        }
      },

      // Disable rejections whilst in a type declaration
      'TSTypeAliasDeclaration:enter'() {
        insideType = true
        return
      },
      'TSTypeAliasDeclaration:exit'() {
        insideType = false
        return
      },
      'TSInterfaceDeclaration:enter'() {
        insideType = true
        return
      },
      'TSInterfaceDeclaration:exit'() {
        insideType = false
        return
      },

      // Enums either disable rejections (allowEnum=true) or cause an error
      'TSEnumDeclaration'(node: AST.TSEnumDeclaration) {
        if (config.allowEnums) {
          insideType = true
        } else {
          ctx.report({ node, messageId: 'noEnums' })
        }
      },
      'TSEnumDeclaration:exit'() {
        if (config.allowEnums) {
          insideType = false
          return
        }
      },

      // Other node types cause rejections (if outside of type declarations)
      '*'(node: AST.Node) {
        if (!insideType) {
          ctx.report({
            node,
            messageId: badNodeMessage,
            data: {
              type: node.type
            }
          })
        }
      }
    }
  }
}
