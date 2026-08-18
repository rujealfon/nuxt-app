import path from 'node:path'

const FEATURE_MARKER = `${path.sep}app${path.sep}features${path.sep}`

function featureNameFromPath(filePath) {
  const idx = filePath.lastIndexOf(FEATURE_MARKER)
  if (idx === -1)
    return null
  const rest = filePath.slice(idx + FEATURE_MARKER.length)
  const name = rest.split(path.sep)[0]
  return name || null
}

function importedFeature(source, importer, alias) {
  if (typeof source !== 'string')
    return null

  const prefix = `${alias}/features/`
  if (source === `${alias}/features`)
    return '*'
  if (source.startsWith(prefix))
    return source.slice(prefix.length).split('/')[0] || '*'

  if (source.startsWith('.')) {
    const resolved = path.normalize(path.resolve(path.dirname(importer), source))
    return featureNameFromPath(`${resolved}${path.sep}`)
  }

  return null
}

function checkSource(context, node, source, alias) {
  if (!source)
    return

  const importer = context.filename
  const current = featureNameFromPath(importer)
  if (!current)
    return

  const imported = importedFeature(source, importer, alias)
  if (!imported || imported === current)
    return

  context.report({
    node,
    message: imported === '*'
      ? 'Import a file inside this feature with a relative path.'
      : `Feature "${current}" cannot import feature "${imported}". Pages import features; features stay isolated.`,
  })
}

export const featureBoundariesPlugin = {
  meta: {
    name: 'feature-boundaries',
  },
  rules: {
    'no-cross-feature-import': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Keep Nuxt feature folders isolated from each other',
        },
        schema: [{
          type: 'object',
          properties: {
            alias: { type: 'string' },
          },
          required: ['alias'],
          additionalProperties: false,
        }],
      },
      create(context) {
        const alias = context.options[0]?.alias
        if (!alias)
          return {}

        return {
          ImportDeclaration(node) {
            checkSource(context, node.source, node.source.value, alias)
          },
          ImportExpression(node) {
            if (node.source.type === 'Literal')
              checkSource(context, node.source, node.source.value, alias)
          },
          ExportNamedDeclaration(node) {
            if (node.source)
              checkSource(context, node.source, node.source.value, alias)
          },
          ExportAllDeclaration(node) {
            checkSource(context, node.source, node.source.value, alias)
          },
        }
      },
    },
  },
}
