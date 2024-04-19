import { ConfigOptions } from "./type";
import process from 'node:process'
import deepmerge from 'deepmerge'
import { createConfigLoader } from 'unconfig'

export function defineConfig(config: ConfigOptions): ConfigOptions {
  return config
}

function toArray(value?: string | string[]) {
  if (!value) return []
  return Array.isArray(value) ? value : value.split(',')
}

const DEFAULT_OPTIONS: ConfigOptions = {
  entries: './src/main.ts',
  supSuffix: ['.ts', '.tsx'],
  cwd: process.cwd(),
}

function normalizeConfig<T extends ConfigOptions>(options: T) {
  options.exclude = toArray(options.exclude)
  options.supSuffix = toArray(options.supSuffix)
  options.entries = toArray(options.entries)
  return options
}

export async function resolveConfig<T extends ConfigOptions>(
  options: T & { _?: (string | number)[] },
): Promise<T> {
  const defaults = DEFAULT_OPTIONS
  options = normalizeConfig(options)

  const loader = createConfigLoader<ConfigOptions>({
    sources: [
      {
        files: [
          'fra.config',
        ],
        extensions: ['js', 'ts', 'json']
      },
      {
        files: [
          '.frarc',
        ],
        extensions: ['json', ''],
      },
    ],
    cwd: options.cwd || process.cwd(),
    merge: false,
  })

  const config = await loader.load()
  console.log(config);


  if (!config.sources.length)
    return deepmerge(defaults, options as T) as T

  const configOptions = normalizeConfig(config.config)
  return deepmerge(deepmerge(defaults, configOptions), options as T) as T
}

