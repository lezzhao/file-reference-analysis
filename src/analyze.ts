import fg from 'fast-glob'
import { promises as fs, existsSync } from 'node:fs'
import { dynamicImportRE, importRE, requireRE } from './regex'
import { dirname, resolve } from 'node:path'
import { findUpDepPackages, transformPath, useCircularDepCheck } from './utils'
import { AnalyzeResult, CircularDepMap, ExtraOptions } from './type'


let installedPackages: string[] = []
const fileInfo: {
  all: string[],
  exclude: string[],
} = {
  all: [],
  exclude: [],
}

export async function analyze(entry: string[], options?: ExtraOptions) {

  const { circularDepMap, visitedSet, checkPathIsValid } = useCircularDepCheck()
  const { alias, exclude = [], supSuffix = '.ts', cwd = process.cwd() } = options || {}

  async function run(entry: string): Promise<AnalyzeResult> {
    // entry file absolute path
    const entryPath = resolve(cwd, entry)
    const entryRoot = dirname(entryPath).split('/').pop()

    // get installed packages of current project
    installedPackages = await findUpDepPackages(entryPath)

    const pattern = exclude.filter(Boolean).map(p => `!${p}`).concat(entryRoot ? `${entryRoot}/**/*` : '')
    fileInfo.all = await fg(pattern, { dot: true })
    if (exclude.length)
      fileInfo.exclude = await fg(exclude, { dot: true })
    // if entry file doesn't exist, return
    if (!existsSync(entryPath)) return {
      unusedFiles: [],
      circularDepMap: new Map() as CircularDepMap
    }
    await checkCircularDep(entryPath, { alias, visited: [], supSuffix })

    const unusedFiles = fileInfo.all.map(i => resolve(i)).filter(file => !visitedSet.has(file)).sort()

    return {
      unusedFiles,
      circularDepMap
    }
  }

  const checkCircularDep = async (path: string, { alias, visited, supSuffix }: {
    alias?: Record<string, string>,
    visited: string[],
    supSuffix: string | string[]
  }) => {
    const validPath = checkPathIsValid(path, { visited })
    if (!validPath) return
    const code = await fs.readFile(validPath, 'utf-8')
    // macth the path of import files
    const importMatches = Array.from(code.matchAll(importRE))
    const dynamicImportMatches = Array.from(code.matchAll(dynamicImportRE))
    const requireMatches = Array.from(code.matchAll(requireRE))
    const matches = importMatches.concat(dynamicImportMatches).concat(requireMatches)

    for (const match of matches) {
      let curPath = match[1]
      // check whether the current path belongs to a third-party package
      const flag = installedPackages.find(pkg => curPath.startsWith(pkg))
      if (flag) {
        continue
      }
      // handles aliases configed in the project  
      if (alias) {
        const key = Object.keys(alias).find(key => curPath.startsWith(key))
        if (key) {
          const _alias = resolve(cwd, alias[key])
          curPath = curPath.startsWith(key) ? curPath.replace(key, _alias) : curPath
        }
      }
      // get the absolute path of imported file
      const glob = resolve(dirname(path), curPath)
      const transformedPath = transformPath(glob, { supSuffix })
      if (!transformedPath) continue
      if (fileInfo.exclude.length && fileInfo.exclude.map(i => resolve(i)).indexOf(transformedPath) !== -1) {
        continue
      }
      await checkCircularDep(transformedPath, { alias, visited: Array.from(visited), supSuffix })
    }
  }

  const res = await Promise.allSettled(entry.map(run))

  if (res.length) {
    return res.reduce((acc, cur) => {
      if (cur.status === 'fulfilled') {
        const { unusedFiles, circularDepMap } = cur.value!
        return {
          unusedFiles: acc.unusedFiles.concat(unusedFiles),
          circularDepMap: new Map([...acc.circularDepMap, ...circularDepMap])
        }
      } else {
        return acc
      }
    }, {
      unusedFiles: [] as string[],
      circularDepMap: new Map<string, string[]>()
    })

  }
}
