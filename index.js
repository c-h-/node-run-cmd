'use strict';
const spawn = require('child_process').spawn;

const SEQUENTIAL = 'sequential';
const PARALLEL = 'parallel';
const DEFAULT_VERBOSE = false;

/*
* Runs a cordova command with supplied options
* @param {Object} options - an options object
* @param {String} options.command - a command to run
* @param {Boolean} [options.verbose] - whether to print stuff to console
* @param {Boolean} [options.logger] - the logging function to call if verbose is true (default console.log)
* @param {String} [options.cwd] - the working directory
* @param {Function} [options.onData(data)] - function to call when data is written
* @param {Function} [options.onError(data)] - function to call when err is written
* @param {Function} [options.onDone(exitCode)] - function to call when cmd is done
* @param {Object} [options.env] - Environment key-value pairs
* @param {String|Array} [options.stdio] -  Child's stdio configuration
* @param {Boolean} [options.detached] - Prepare child to run independently of its parent process. Specific behavior depends on the platform.
* @param {Number} [options.uid] - Sets the user identity of the process.
* @param {Number} [options.gid] - Sets the group identity of the process.
* @param {Boolean|String} [options.shell] -  If true, runs command inside of a shell. Uses '/bin/sh' on UNIX, and 'cmd.exe' on Windows. A different shell can be specified as a string. The shell should understand the -c switch on UNIX, or /s /c on Windows. Defaults to false (no shell).
* @returns {Promise} a promise resolved or rejected by the command result
*/
function run(options){
  return new Promise((resolve, reject) => {
    if (options.verbose) {
      options.logger('$ ' + options.command);
    }

    // get the options allowed to be passed to the child process
    const spawnOptsAllowedKeys = [
      'cwd',
      'env',
      'stdio',
      'detached',
      'uid',
      'gid',
      'shell',
    ];
    const spawnProcessOpts = {};
    for (const key in options) {
      if (spawnOptsAllowedKeys.indexOf(key) > -1) {
        spawnProcessOpts[key] = options[key];
      }
    }

    // spawn the process to run the command
    // below splits the command into pieces to pass to the process; mapping function simply removes quotes from each piece
    const cmds = options.command.match(/[^"\s]+|"(?:\\"|[^"])+"/g)
                  .map(expr => {
                    return expr.charAt(0) === '"' && expr.charAt(expr.length - 1) === '"' ? expr.slice(1, -1) : expr;
                  });
    const runCMD = cmds[0];
    cmds.shift();
    const child = spawn(runCMD, cmds, spawnProcessOpts);

    // set stdout listener
    child.stdout.on('data', data => {
      if (data) {
        if (options.verbose) {
          options.logger(data.toString());
        }
        if (typeof options.onData === 'function') {
          options.onData(data.toString());
        }
      }
    });

    // set stderr listener
    child.stderr.on('data', data => {
      if (data) {
        if (options.verbose) {
          options.logger(data.toString());
        }
        if (typeof options.onError === 'function') {
          options.onError(data.toString());
        }
      }
    });

    // set close listener
    child.on('close', code => {
      if (typeof options.onDone === 'function') {
        options.onDone(code);
      }
      resolve(code); // resolve all, let caller handle
      // code !== 0 ? reject(code) : resolve(code);
    });

    // set error listener
    child.on('error', code => {
      if (typeof options.onDone === 'function') {
        options.onDone(code, true);
      }
      resolve(code); // resolve all, let caller handle
    });
  });
}

/**
* Returns a function that resolves any yielded promises inside the generator.
* @param {Function} makeGenerator - the function to turn into an async generator/promise
* @returns {Function} the function that will iterate over interior promises on each call when invoked
*/
function async(makeGenerator) {
  return () => {
    const generator = makeGenerator(...arguments);

    function handle(result) {
      // result => { done: [Boolean], value: [Object] }
      if (result.done) {
        return Promise.resolve(result.value);
      }

      return Promise.resolve(result.value).then(res => {
        return handle(generator.next(res));
      }, err => {
        return handle(generator.throw(err));
      });
    }

    try {
      return handle(generator.next());
    } catch (ex) {
      return Promise.reject(ex);
    }
  };
}


/**
* Run multiple commands.
* @param {Array} commands - an array of objects or strings containing details of commands to run
* @param {Object} options - an object containing global options for each command
* @example
  runMultiple(['mkdir test', 'cd test', 'ls']);
* @example
  runMultiple(['mkdir test', 'cd test', 'ls'], { cwd: '../myCustomWorkingDirectory' });
* @example
  const commandsToRun = [
    { command: 'ls', onData: function(data) { console.log(data) } },
    // override globalOptions working directory with each commands' options
    { command: 'mkdir test', cwd: '../../customCwdNumber2', onDone: function() { console.log('done mkdir!') } },
    'ls ~/Desktop' // finish up with simple string command
  ];
  const globalOptions = { cwd: '../myCustomWorkingDirectory' };
  runMultiple(commandsToRun, globalOptions);
*/
function runMultiple(input, options) {
  return new Promise((resolve, reject) => {
    let commands = input;
    // set default options
    const defaultOpts = {
      cwd: process.cwd(),
      verbose: DEFAULT_VERBOSE,
      mode: SEQUENTIAL,
      logger: console.log,
    };

    // set global options
    const globalOpts = Object.assign({}, defaultOpts, options);

    // resolve string to proper input type
    if (typeof commands === 'string') {
      commands = [{ command: commands }];
    }

    // start execution
    if (commands && typeof commands === 'object') {
      if (Object.prototype.toString.call(commands) !== '[object Array]') {
        // not array
        commands = [commands];
      }
      else {
        // is array, check type of children
        commands = commands.map(cmd => typeof cmd === 'object' ? cmd : { command: cmd });
      }

      // run commands in parallel
      if (globalOpts.mode === PARALLEL) {
        const promises = commands.map(cmd => {
          const resolvedOpts = Object.assign({}, globalOpts, cmd);
          return run(resolvedOpts);
        });
        Promise.all(promises).then(resolve, reject);
      }
      else { // run commands in sequence (default)
        async(function* () {
          try {
            const results = [];
            for (const i in commands) {
              const cmd = commands[i];
              const resolvedOpts = Object.assign({}, globalOpts, cmd);
              const result = yield run(resolvedOpts);
              results.push(result);
            }
            if (results) {
              resolve(results);
            }
            else {
              reject('Falsy value in results');
            }
          }
          catch (e) {
            reject(e);
          }
        })();
      }
    }
    else {
      reject('Invalid input');
    }
  });
}


const command = {
  run: runMultiple,
};

module.exports = command;
