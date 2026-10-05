import { existsSync, readdirSync, readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import turbo from '../turbo.json'

const root = new URL('../', import.meta.url)
const configs = ['apps', 'packages'].flatMap(parent =>
  readdirSync(new URL(parent, root), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => `${parent}/${entry.name}/nuxt.config.ts`)
    .filter(path => existsSync(new URL(path, root))),
)

function environmentReads(path: string): string[] {
  const source = ts.createSourceFile(path, readFileSync(new URL(path, root), 'utf8'), ts.ScriptTarget.Latest, true)
  const names = new Set<string>()

  function visit(node: ts.Node) {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const object = node.expression
      if (ts.isPropertyAccessExpression(object)
        && ts.isIdentifier(object.expression)
        && object.expression.text === 'process'
        && object.name.text === 'env') {
        if (ts.isPropertyAccessExpression(node))
          names.add(node.name.text)
        else if (ts.isStringLiteral(node.argumentExpression))
          names.add(node.argumentExpression.text)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  return [...names]
}

describe('build environment', () => {
  it.each(configs)('includes environment variables read by %s in Turbo build.env', (path) => {
    const missing = environmentReads(path).filter(name => !turbo.tasks.build.env.includes(name))
    expect(missing, `${path}: add missing variables to turbo.json tasks.build.env`).toEqual([])
  })
})
