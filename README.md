# franalyse

**franalyse** - help you analyze your project file dependencies

<br>

<pre>
npm i -g <b>franalyse</b>
</pre>

<br>

``` bash

# -v, --version   | Show version number
ni -v

# -h, --help      | Show help
ni -h

For more info, run any command with the `--help` flag:
  $ franalyse --help

Options:
  -e, --entry <entry>        Entry file (default: ./src/main.ts)
  -s, --suffix <suffix>      when file has no suffix, auto complete (default: .ts)
  -ex, --excludes <pattern>  matches ignored files according to the regex (default: )
  -a, --alias <alias>        the alias configured in the project 
  -h, --help                 Display this message 
  -v, --version              Display version number 

Examples:
--alias.@ /src
```