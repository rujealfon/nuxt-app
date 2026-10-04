import { existsSync, readdirSync, readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const turbo = JSON.parse(readFileSync(new URL('turbo.json', root), 'utf8'))
const buildEnv: string[] = turbo.tasks.build.env

const configPaths = ['apps', 'packages'].flatMap(parent =>
  readdirSync(new URL(`${parent}/`, root), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => `${parent}/${entry.name}/nuxt.config.ts`)
    .filter(path => existsSync(new URL(path, root))),
)

describe('turbo build environment', () => {
  it.each(configPaths)('includes environment variables read by %s', (path) => {
    const source = ts.createSourceFile(
      path,
      readFileSync(new URL(path, root), 'utf8'),
      ts.ScriptTarget.Latest,
    )

    function visit(node: ts.Node) {
      if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
        && ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression)
        && node.expression.expression.text === 'process'
        && node.expression.name.text === 'env') {
        if (ts.isPropertyAccessExpression(node)) {
          expect(buildEnv, `${path} reads ${node.name.text}`).toContain(node.name.text)
        }
        else {
          expect(ts.isStringLiteralLike(node.argumentExpression), `${path} must name its build environment variable explicitly`).toBe(true)
          if (ts.isStringLiteralLike(node.argumentExpression)) {
            expect(buildEnv, `${path} reads ${node.argumentExpression.text}`).toContain(node.argumentExpression.text)
          }
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(source)
  })
})
