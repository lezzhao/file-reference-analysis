export interface ExtraOptions {
    /**
     * path alias
     */
    alias?: Record<string, string>,
    /**
     * exclude files'path or pattern
    */
    exclude?: string[],
    /**
     * when file has no suffix, auto add suffix
    */
    supSuffix?: string[]
    /**
     * current working directory
    */
    cwd?: string
}

export interface ConfigOptions {
    /**
     * path alias
     */
    alias?: Record<string, string>,
    /**
     * exclude files'path or pattern
    */
    exclude?: string | string[],
    /**
     * when file has no suffix, auto add suffix
    */
    supSuffix?: string | string[]
    /**
     * entry file path
    */
    entry: string | string[]
    /**
     * current working directory
    */
    cwd?: string
}

export type CircularDepMap = Map<string, string[]>

export interface AnalyzeResult {
    unusedFiles: string[],
    circularDepMap: CircularDepMap
}
    