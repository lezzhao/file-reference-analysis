import { existsSync, promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import fg from 'fast-glob'
import { getAllMatches } from './regex'
import { findUpDepPackages, transformPath, useCircularDepCheck } from './utils'
import type { AnalyzeResult, CircularDepMap, ExtraOptions } from './type'

const fileInfo: {
  all: string[]
  exclude: string[]
} = {
  all: [],
  exclude: [],
}

export async function analyze(entries: string[], options?: ExtraOptions) {
  let installedPackages: string[] = []
  let unusedPackages: string[] = []
  const { circularDepMap, visitedSet, checkPathIsValid } = useCircularDepCheck()
  // eslint-disable-next-line node/prefer-global/process
  const { alias, exclude = [], supSuffix = '.ts', cwd = process.cwd() } = options || {}

  const checkCircularDep = async (path: string, { alias, visited, supSuffix }: {
    alias?: Record<string, string>
    visited: string[]
    supSuffix: string | string[]
  }) => {
    const validPath = checkPathIsValid(path, { visited })
    if (!validPath)
      return
    const code = await fs.readFile(validPath, 'utf-8')

    const matches = getAllMatches(code)

    for (const match of matches) {
      let curPath = match[1]
      // check whether the current path belongs to a third-party package
      const flag = installedPackages.find(pkg => curPath.startsWith(pkg))
      if (flag) {
        unusedPackages.splice(unusedPackages.indexOf(flag), 1)
        continue
      }
      // handles aliases config in the project
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
      if (!transformedPath)
        continue
      if (fileInfo.exclude.length && fileInfo.exclude.map(i => resolve(i)).includes(transformedPath))
        continue

      await checkCircularDep(transformedPath, { alias, visited: Array.from(visited), supSuffix })
    }
  }

  async function run(entry: string): Promise<AnalyzeResult> {
    // entries file absolute path
    const entryPath = resolve(cwd, entry)
    const entryRoot = dirname(entryPath).split('/').pop()

    // get installed packages of current project
    installedPackages = await findUpDepPackages(entryPath)
    unusedPackages = Array.from(new Set<string>(installedPackages.concat(unusedPackages)))

    const pattern = exclude.filter(Boolean).map(p => `!${p}`).concat(entryRoot ? `${entryRoot}/**/*` : '')
    fileInfo.all = await fg(pattern, { dot: true })
    if (exclude.length)
      fileInfo.exclude = await fg(exclude, { dot: true })
    // if entries file doesn't exist, return
    if (!existsSync(entryPath)) {
      return {
        unusedFiles: [],
        circularDepMap: new Map() as CircularDepMap,
      }
    }
    await checkCircularDep(entryPath, { alias, visited: [], supSuffix })

    const unusedFiles = fileInfo.all.map(i => resolve(i)).filter(file => !visitedSet.has(file)).sort()

    return {
      unusedFiles,
      circularDepMap,
    }
  }

  const res = await Promise.allSettled(entries.map(run))

  if (res.length) {
    return res.reduce((acc, cur) => {
      if (cur.status === 'fulfilled') {
        const { unusedFiles, circularDepMap } = cur.value!
        return {
          unusedFiles: acc.unusedFiles.concat(unusedFiles),
          circularDepMap: new Map([...acc.circularDepMap, ...circularDepMap]),
          unusedPackages,
        }
      }
      else {
        return acc
      }
    }, {
      unusedFiles: [] as string[],
      circularDepMap: new Map<string, string[]>(),
      unusedPackages,
    })
  }
}
