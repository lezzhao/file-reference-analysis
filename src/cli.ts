import cac from "cac";
import { existsSync, promises as fs } from 'node:fs'
import { resolve } from "node:path";
import { version } from '../package.json'
import { analyse } from './index'
import ora from "ora";

const cli = cac('franalyse')

cli
    .command('')
    .option('-e, --entry <entry>', 'Entry file', {
        default: `${process.cwd()}/src/main.ts`,
    })
    .option('-s, --suffix <suffix>', 'when file has no suffix, auto complete', {
        default: '.ts',
    })
    .option('-ex, --excludes <pattern>', 'matches ignored files according to the regex', {
        default: '',
    })
    .option('-a, --alias <alias>', 'the alias configured in the project').example('--alias.@ /src')
    .action(async (options) => {
        const spinner = ora('Analysing...').start()
        const excludes = options.excludes ? options.excludes.split(',') : []
        const supSuffix = options.suffix ? options.suffix.split(',') : []
        const { unusedFiles, circularDepMap } = await analyse(options.entry, { excludes, supSuffix, alias: options.alias }) || {}
        const tempDirName = resolve(process.cwd(), options.entry, '../../fra')
        if (!existsSync(tempDirName))
            await fs.mkdir(tempDirName)
        if (unusedFiles) {
            await fs.writeFile(resolve(tempDirName, 'unusedFile.json'), JSON.stringify(unusedFiles, null, 2), {
                encoding: 'utf-8',
            })
        }
        if (circularDepMap) {
            const circularDep = Array.from(circularDepMap?.entries()!).map(([key, value]) => {
                return {
                    [key]: value
                }
            })
            await fs.writeFile(resolve(tempDirName, 'circular.json'), JSON.stringify(circularDep, null, 2), {
                encoding: 'utf-8',
            })
            console.log(Array.from(circularDepMap?.keys()!));
        }

        spinner.succeed('Analysis completed')

    })

// Display help message when `-h` or `--help` appears
cli.help()
// Display version number when `-v` or `--version` appears
// It's also used in help message
cli.version(version)
cli.parse()