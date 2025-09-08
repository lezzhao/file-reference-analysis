import { existsSync, promises as fs, statSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'

/**
 * Find package.json layer by layer
 * @param dir
 * @returns
 */
export function searchPackageJSON(dir: string) {
  let packageJsonPath
  while (true) {
    if (!dir)
      return
    const newDir = dirname(dir)
    if (newDir === dir)
      return
    dir = newDir
    packageJsonPath = join(dir, 'package.json')
    if (existsSync(packageJsonPath))
      break
  }
  return packageJsonPath
}
// get installed packages of current project
export async function findUpDepPackages(path: string) {
  try {
    const packageJsonPath = searchPackageJSON(path)
    if (!packageJsonPath)
      return []
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath as string, 'utf-8'))
    return Object.keys(packageJson.dependencies || {})
      .concat(Object.keys(packageJson.devDependencies || {}))
  }
  catch (error) {
    console.warn(`Failed to read package.json: ${error}`)
    return []
  }
}
// handles file without suffix
export function transformPath(path: string, { supSuffix }: { supSuffix: string[] | string }) {
  const suffixes = Array.isArray(supSuffix) ? supSuffix : [supSuffix]

  try {
    if (statSync(path).isDirectory())
      path = join(path, `index${suffixes[0]}`)
  }
  catch (error) {
    // Ignore directory check errors, continue processing
  }

  if (existsSync(path))
    return path

  const pathInfo = parse(path)
  const temp = path

  for (const suffix of suffixes) {
    const testPath = pathInfo.ext ? path : `${temp}${suffix}`
    if (existsSync(testPath))
      return testPath
  }

  return undefined
}
export function useCircularDepCheck() {
  const visitedSet = new Set<string>()
  const circularDepMap = new Map<string, string[]>()

  /**
   * check whehter current path is valid
   * @param path
   * @param visited
   * @returns
   */
  const checkPathIsValid = (path: string, { visited }: { visited: string[] }) => {
    // When the file exits circular dep, interrupt and record dep link
    const index = visited.indexOf(path)

    if (index !== -1) {
      const link = visited.slice(index)
      link.push(path)
      const str = link.join(' --> ')
      if (!circularDepMap.has(path))
        circularDepMap.set(path, [str])
      else
        circularDepMap.get(path)?.push(str)

      return
    }
    // When the file has been accessed, skip it
    if (visitedSet.has(path))
      return

    visited.push(path)
    visitedSet.add(path)
    return path
  }

  return {
    circularDepMap,
    visitedSet,
    checkPathIsValid,
  }
}

/**
 * Clear file cache to avoid memory leaks
 * @param cache Cache Map
 * @param maxAge Maximum cache time (milliseconds)
 */
export function clearExpiredCache<T extends { timestamp: number }>(
  cache: Map<string, T>,
  maxAge: number = 5 * 60 * 1000, // 5 minutes
) {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > maxAge)
      cache.delete(key)
  }
}
