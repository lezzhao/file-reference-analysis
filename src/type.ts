// Base configuration interface
interface BaseOptions {
  /**
   * path alias
   */
  alias?: Record<string, string>
  /**
   * exclude files'path or pattern
   */
  exclude?: string | string[]
  /**
   * when file has no suffix, auto add suffix
   */
  supSuffix?: string | string[]
  /**
   * current working directory
   */
  cwd?: string
}

export interface ExtraOptions extends Omit<BaseOptions, 'exclude' | 'supSuffix'> {
  /**
   * Exclude files' path or pattern (normalized to array)
   */
  exclude?: string[]
  /**
   * When file has no suffix, auto add suffix (normalized to array)
   */
  supSuffix?: string[]
}

export interface ConfigOptions extends BaseOptions {
  /**
   * Entry file paths
   */
  entries: string | string[]
}

export type CircularDepMap = Map<string, string[]>

export interface AnalyzeResult {
  unusedFiles: string[]
  circularDepMap: CircularDepMap
  unusedPackages?: string[]
}

// Additional type definitions
export interface FileCache {
  content: string
  timestamp: number
}

export interface PathCache {
  resolvedPath: string | undefined
  timestamp: number
}

export interface CircularDepCheckOptions {
  alias?: Record<string, string> | undefined
  visited: string[]
  supSuffix: string | string[]
  depth?: number
}

// PackageInfo interface was unused and has been removed

export interface GlobResult {
  all: string[]
  exclude: string[]
}
