# fr-analyze

**fr-analyze** - help you analyze your project file dependencies

<br>

<pre>
npm i -g <b>fr-analyze</b>
</pre>

<br>

``` bash

# -v, --version   | Show version number
ni -v

# -h, --help      | Show help
ni -h

For more info, run any command with the `--help` flag:
  $ fr-analyze --help

Options:
  -e, --entries <entries>        Entry files (default: ./src/main.ts)
  -s, --suffix <suffix>      when file has no suffix, auto complete (default: .ts)
  -ex, --excludes <pattern>  matches ignored files according to the regex (default: )
  -a, --alias <alias>        the alias configured in the project 
  -h, --help                 Display this message 
  -v, --version              Display version number 

Examples:
--alias.@ /src
```

<br>

### Config file
<br>
With fra.config.ts|js file, you can configure the same options the command has.

``` typescript
import { defineConfig } from 'fr-analyze'

export default defineConfig({
  entries: './src/main.ts',
  exclude: ['**/test/**/*'],
  supSuffix: ['.ts', '.tsx'],
  alias: {
    '@': './src'
  }
})
```