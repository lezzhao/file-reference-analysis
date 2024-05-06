export const importRE = /import(?:.*?)from\s*['|"](\S*)['|"]/g
export const dynamicImportRE = /import\(['|"](\S*)['|"]\)/g
export const requireRE = /require\(['|"](\S*)['|"]\)/g
export const exportRE = /export(?:.*?)from\s*['|"](\S*)['|"]/g


/**
 * Matches all statements that meet the condition according to the RE
 * @param code 
 * @returns string[]
 */
export function getAllMatches(code: string) {
    const importMatches = Array.from(code.matchAll(importRE))
    const dynamicImportMatches = Array.from(code.matchAll(dynamicImportRE))
    const requireMatches = Array.from(code.matchAll(requireRE))
    const exportMatches = Array.from(code.matchAll(exportRE))
    const matches = importMatches.concat(dynamicImportMatches).concat(requireMatches).concat(exportMatches)
    return matches
}