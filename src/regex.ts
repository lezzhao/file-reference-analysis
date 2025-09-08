// Optimized regex patterns
const PATTERNS = {
  // Precise mode: matches all types of import/export statements
  precise: /(?:import\s+(?:[^'"]*?from\s+)?|import\s*\(\s*|require\s*\(\s*|export\s+(?:[^'"]*?from\s+)?)['"]([^'"]+)['"]/g,
  // Fast mode: simplified matching pattern, performance first
  fast: /(?:import|require|export)\s*[^'"]*['"]([^'"]+)['"]/g,
} as const

// Cache regex instances to avoid duplicate creation
const regexCache = new Map<string, RegExp>()

/**
 * Get or create regex instance
 * @param pattern Regex pattern
 * @returns RegExp instance
 */
function getRegex(pattern: string): RegExp {
  if (!regexCache.has(pattern))
    regexCache.set(pattern, new RegExp(pattern, 'g'))

  return regexCache.get(pattern)!
}

/**
 * High-performance function to match all import/export statements
 * @param code Source code string
 * @param fast Whether to use fast mode (sacrifice some precision for performance)
 * @returns Array of match results
 */
export function getAllMatches(code: string, fast: boolean = false): RegExpMatchArray[] {
  // Select regex pattern based on mode
  const pattern = fast ? PATTERNS.fast.source : PATTERNS.precise.source
  const regex = getRegex(pattern)
  regex.lastIndex = 0 // Reset lastIndex to ensure consistency

  // Use matchAll to get all match results
  return Array.from(code.matchAll(regex))
}

/**
 * Clear regex cache
 * Call this function to free cache when under memory pressure
 */
export function clearRegexCache(): void {
  regexCache.clear()
}
