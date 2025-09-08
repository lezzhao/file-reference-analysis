import { describe, expect, it } from 'vitest'
import { analyze, defineConfig } from '../src'

describe('find unused file list', () => {
  it('find unused file list', async () => {
    expect(await analyze(['./examples/src/main.ts'], {
      alias: {
        '@': './examples/src'
      },
      exclude: ['**/services/**/*'],
      supSuffix: ['.ts', '.tsx']
    })).toMatchInlineSnapshot(`
      {
        "circularDepMap": Map {},
        "unusedFiles": [],
        "unusedPackages": [],
      }
    `)
  })

  it('test circular', async () => {
    expect(await analyze(['./examples/fixtures/index.ts'], {
      alias: {
        '@': './examples/fixtures'
      },
      supSuffix: ['.ts']
    })).toMatchInlineSnapshot(`
      {
        "circularDepMap": Map {},
        "unusedFiles": [],
        "unusedPackages": [],
      }
    `)
  })
})

describe('define config', () => {
  it('test define config', async () => {
    const config = defineConfig({
      entries: './src/main.ts',
      exclude: ['**/services/**/*'],
      supSuffix: ['.ts', '.tsx'],
      alias: {
        '@': './src'
      }
    })
    expect(config).toMatchInlineSnapshot(`
      {
        "alias": {
          "@": "./src",
        },
        "entries": "./src/main.ts",
        "exclude": [
          "**/services/**/*",
        ],
        "supSuffix": [
          ".ts",
          ".tsx",
        ],
      }
    `)
  }
  )
})


describe('test detect unused packages', () => {
  it('should detect unused packages', async () => {
    expect((await analyze(['./src/index.ts', './src/cli.ts']))?.unusedPackages).toMatchInlineSnapshot(`
      [
        "@antfu/eslint-config",
        "@types/debug",
        "@types/node",
        "bumpp",
        "eslint",
        "pnpm",
        "rimraf",
        "taze",
        "typescript",
        "unbuild",
        "vite",
        "vitest",
      ]
    `)
  })
})