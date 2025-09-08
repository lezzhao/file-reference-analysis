import { existsSync, promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import fg from 'fast-glob'
import { clearRegexCache, getAllMatches } from './regex'
import { clearExpiredCache, findUpDepPackages, transformPath, useCircularDepCheck } from './utils'
import type { AnalyzeResult, CircularDepCheckOptions, CircularDepMap, ExtraOptions, FileCache, GlobResult, PathCache } from './type'

// File cache to avoid duplicate reads
const fileCache = new Map<string, FileCache>()
// Path resolution cache
const pathCache = new Map<string, PathCache>()

export async function analyze(entries: string[], options?: ExtraOptions): Promise<AnalyzeResult> {
  let installedPackages: string[] = []
  let unusedPackages: string[] = []
  const { circularDepMap, visitedSet, checkPathIsValid } = useCircularDepCheck()
  // eslint-disable-next-line node/prefer-global/process
  const { alias, exclude = [], supSuffix = '.ts', cwd = process.cwd() } = options || {}

  // Clear caches
  fileCache.clear()
  pathCache.clear()
  clearExpiredCache(fileCache)
  clearExpiredCache(pathCache)

  const fileInfo: GlobResult = {
    all: [],
    exclude: [],
  }

  // Add recursion depth limit to prevent stack overflow
  const MAX_DEPTH = 100

  const checkCircularDep = async (path: string, options: CircularDepCheckOptions & { depth?: number }): Promise<void> => {
    const { alias, visited, supSuffix, depth = 0 } = options
    // Check recursion depth
    if (depth > MAX_DEPTH) {
      console.warn(`Maximum recursion depth (${MAX_DEPTH}) reached for path: ${path}`)
      return
    }

    const validPath = checkPathIsValid(path, { visited })
    if (!validPath)
      return

    // Use cache to read file
    let code: string
    const cachedFile = fileCache.get(validPath)
    if (cachedFile) {
      code = cachedFile.content
    }
    else {
      try {
        code = await fs.readFile(validPath, 'utf-8')
        fileCache.set(validPath, {
          content: code,
          timestamp: Date.now(),
        })
      }
      catch (error) {
        console.warn(`Failed to read file: ${validPath}`, error)
        return
      }
    }

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

      // Use cache for path transformation
      const cacheKey = `${glob}-${Array.isArray(supSuffix) ? supSuffix.join(',') : supSuffix}`
      let transformedPath: string | undefined
      const cachedPath = pathCache.get(cacheKey)
      if (cachedPath) {
        transformedPath = cachedPath.resolvedPath
      }
      else {
        transformedPath = transformPath(glob, { supSuffix })
        pathCache.set(cacheKey, {
          resolvedPath: transformedPath,
          timestamp: Date.now(),
        })
      }

      if (!transformedPath)
        continue
      if (fileInfo.exclude.length && fileInfo.exclude.map(i => resolve(i)).includes(transformedPath))
        continue

      await checkCircularDep(transformedPath, { alias, visited: Array.from(visited), supSuffix, depth: depth + 1 })
    }
  }

  async function run(entry: string): Promise<AnalyzeResult> {
    try {
      // entries file absolute path
      const entryPath = resolve(cwd, entry)
      const entryRoot = dirname(entryPath).split('/').pop()

      // Verify entry file exists
      if (!existsSync(entryPath)) {
        console.warn(`Entry file does not exist: ${entryPath}`)
        return {
          unusedFiles: [],
          circularDepMap: new Map() as CircularDepMap,
        }
      }

      // get installed packages of current project
      try {
        installedPackages = await findUpDepPackages(entryPath)
        unusedPackages = Array.from(new Set<string>(installedPackages.concat(unusedPackages)))
      }
      catch (error) {
        console.warn(`Failed to find package dependencies: ${error}`)
        installedPackages = []
        unusedPackages = []
      }

      // Build file matching pattern
      const pattern = exclude.filter(Boolean).map(p => `!${p}`).concat(entryRoot ? `${entryRoot}/**/*` : '')

      try {
        fileInfo.all = await fg(pattern, { dot: true })
        if (exclude.length)
          fileInfo.exclude = await fg(exclude, { dot: true })
      }
      catch (error) {
        console.warn(`Failed to glob files: ${error}`)
        fileInfo.all = []
        fileInfo.exclude = []
      }

      await checkCircularDep(entryPath, { alias, visited: [], supSuffix, depth: 0 })

      const unusedFiles = fileInfo.all.map(i => resolve(i)).filter(file => !visitedSet.has(file)).sort()

      return {
        unusedFiles,
        circularDepMap,
      }
    }
    catch (error) {
      console.error(`Error analyzing entry ${entry}:`, error)
      return {
        unusedFiles: [],
        circularDepMap: new Map() as CircularDepMap,
      }
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

  // If no results, return default values
  const result = {
    unusedFiles: [],
    circularDepMap: new Map<string, string[]>(),
    unusedPackages,
  }

  // Clear all caches to free memory
  clearRegexCache()

  return result
}
