import cac from "cac";
import { promises as fs } from 'node:fs'
import { resolve } from "node:path";
import { version } from '../package.json'
import { analyze } from './index'
import ora from "ora";
import { resolveConfig } from "./config";

const cli = cac('fr-analyze')

cli
    .command('')
    .option('-e, --entries <entries>', 'entry files')
    .option('-s, --suffix <suffix>', 'when file has no suffix, auto complete')
    .option('-ex, --exclude <pattern>', 'matches ignored files according to the regex')
    .option('-a, --alias <alias>', 'the alias configured in the project').example('--alias.@ /src')
    .action(async (options) => {
        const spinner = ora('Analyzing...').start()
        const configs = await resolveConfig(options)

        const { unusedFiles, circularDepMap } = await analyze(configs.entries, configs) || {}

        const resultFilePath = resolve(process.cwd(), configs.entries[0], '../../fra.result.json')
        const circularDep = Array.from(circularDepMap?.entries()!).map(([key, value]) => {
            return {
                [key]: value
            }
        })
        const result = {
            unused: unusedFiles,
            circularDep
        }
        await fs.writeFile(resultFilePath, JSON.stringify(result, null, 2), {
            encoding: 'utf-8',
        })
        console.log(Array.from(circularDepMap?.keys()!));
        spinner.succeed('Analysis completed')

    })

// Display help message when `-h` or `--help` appears
cli.help()
// Display version number when `-v` or `--version` appears
// It's also used in help message
cli.version(version)
cli.parse()