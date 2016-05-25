# node-run-cmd
-
*Node.js commandline/terminal interface.*

Easily run simple or sophisticated console/terminal command(s) from Node. Supports sequential and parallel execution. Returns a promise that resolves to an array of exit codes for each command run.

With node-run-cmd you can execute a single command or an array of commands quite simply.

If you want, set in-depth options for commands being run, including callbacks for data, errors, and completion. Also set working directory, environment variables, run execution process in detached mode, set the uid and gid for the execution process(es), and set the shell to run the command in.

The source that this package is based on has been in production since February, 2016. Note that the examples here are for illustrative purposes only; most of the time there is no real need to run commands from Node, and they should be avoided if there are cross-platform requirements. This package aims to help when there isn't an agreeable alternative.

If most of your commands are filesystem related, I would instead look to [node-fs-extra](https://github.com/jprichardson/node-fs-extra) to accomplish what the commands would have.

##### NPM:
![node-cmd npm version](https://img.shields.io/npm/v/node-run-cmd.svg) ![supported node version for node-cmd](https://img.shields.io/node/v/node-run-cmd.svg) ![total npm downloads for node-cmd](https://img.shields.io/npm/dt/node-run-cmd.svg) ![monthly npm downloads for node-cmd](https://img.shields.io/npm/dm/node-run-cmd.svg) ![npm licence for node-cmd](https://img.shields.io/npm/l/node-run-cmd.svg)

##### GitHub:
![node-run-cmd GitHub Release](https://img.shields.io/github/release/c-h-/node-run-cmd.svg) ![GitHub license node-run-cmd license](https://img.shields.io/github/license/c-h-/node-run-cmd.svg) ![open issues for node-run-cmd on GitHub](https://img.shields.io/github/issues/c-h-/node-run-cmd.svg)

Licensed via MIT License.

-

## Quick Start
The quickest way to get started is to run a single, simple command, then increase complexity as needed.

Install the package:
```shell
$ npm install --save node-run-cmd
```

Use the package:
```javascript
var nrc = require('node-run-cmd');
nrc.run('mkdir foo');
```

## Examples
These examples get increasingly complex to demonstrate the robustness of the package. Not all options are demonstrated; see the Options Object section for all possible options.

### Simple command
```javascript
nrc.run('mkdir foo');
```

### Aysnchronous usage
#### Promise style
```javascript
nrc.run('mkdir foo').then(function(exitCodes) {
  doSomethingElse();
}, function(err) {
  console.log('Command failed to run with error: ', err);
});
```
#### Callback style
```javascript
var callback = function (exitCodes) {
  doSomethingElse();
};
nrc.run('mkdir foo', { onDone: callback } );
```

### Use output (stdout) from command
```javascript
var dataCallback = function(data) {
  useData(data);
};
nrc.run('ls', { onData: dataCallback });
```

### Use error output (stderr) from command
```javascript
var errorCallback = function(data) {
  useErrorData(data);
};
nrc.run('ls ~/does/not/exist', { onError: dataCallback });
```

### Use exit code from command
```javascript
var doneCallback = function(code) {
  useCode(code);
};
nrc.run('ls foo', { onDone: doneCallback });
```
*OR*
```javascript
nrc.run('ls foo').then(function(codes){ useCode(codes[0]); });
```

### Run multiple commands
```javascript
nrc.run([ 'mkdir foo', 'touch foo/bar.txt' ]);
```

### Set working directory for commands
```javascript
var commands = [
  'mkdir foo',
  'touch foo/bar.txt'
];
var options = { cwd: 'path/to/my/dir' };
nrc.run(commands, options);
```

### Set different working directory for each command
```javascript
var commands = [
  { command: 'mkdir foo', cwd: 'dir1' },
  { command: 'mkdir foo', cwd: 'dir2' }
];
nrc.run(commands);
```

### Set different working directory one command and default working directory for the others
```javascript
var commands = [
  'mkdir foo',
  { command: 'mkdir foo', cwd: 'different/dir' },
  'mkdir bar'
];
var options = { cwd: 'default/dir' };
nrc.run(commands, options);
```

### Run commands in parallel
```javascript
var commands = [
  './runCompute1.sh',
  './runCompute2.sh',
  './runCompute3.sh',
];
var options = { mode: 'parallel' };
nrc.run(commands, options);
```

## NRC Methods
### Run
#### Usage:
```javsacript
var promise = nrc.run(commands, globalOptions);
```
#### Returns:
A promise that resolves to an array of exit codes for commands run.
#### Arguments:
*`commands` can be specified in any one of the below formats*

| name | type | required | description | example |
|------|------|----------|-------------|---------|
| commands | string | yes | The command to run | `'ls'` |
| commands | array(string) | yes | An array of string commands to run | `['ls', 'mkdir foo']` |
| commands | array(object) | yes | An array of objects describing commands to run. See section Options Object for allowed properties. | `[{ command: 'ls' }, { command: 'mkdir foo' }]` |
| commands | array(object or string) | yes | A mixed array of objects describing commands and string commands to run. See section Options Object for allowed properties. | `[{ command: 'ls' }, 'mkdir foo']` |
| globalOptions | object | no | The global options to set for each command being run. Overridden by command's options. | `{ cwd: 'foo', verbose: true, logger: gutil.log }` |

## Options Object
Options available for the `commands` or `globalOptions` argument:

| property | type | required | default | description |
|----------|------|----------|---------|-------------|
| command | string | yes | - | the command to run |
| cwd | string | no | `process.cwd()` | the directory to run the command in |
| onData | function(data) | no | null | where to send output from stdout. Called each time stdout is written. |
| onError | function(data) | no | null | where to send output from stderr. Called each time stderr is written. |
| onDone | function(code) | no | null | where to send the exit code of the command. Called once. |
| verbose | boolean | no | `false` | show verbose output |
| logger | function(data) | no | `console.log` | what function to use to log *when verbose is set to true* |
| env | object | no | null | Environment key-value pairs
| stdio | string or array | no | null | Child's stdio configuration
| detached | boolean | no | null | Prepare child to run independently of its parent process. Specific behavior depends on the platform. |
| uid | number | no | null | Sets the user identity of the process. |
| gid | number | no | null | Sets the group identity of the process. |
| shell | boolean or string | no | null | If true, runs command inside of a shell. Uses '/bin/sh' on UNIX, and 'cmd.exe' on Windows. A different shell can be specified as a string. The shell should understand the -c switch on UNIX, or /s /c on Windows. Defaults to false (no shell). |

### Global-Only Commands
These options can only be set in the `globalOptions` argument.

| property | type | required | default | description |
|----------|------|----------|---------|-------------|
| mode | string | no | `'sequential'` | Whether to run commands in series (sequentially) or in parallel. |
