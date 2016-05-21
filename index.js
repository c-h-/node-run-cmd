const spawn = require('child_process').spawn;


/*
* Runs a cordova command with supplied options
* @param {String} cmd - a shell command to run
* @param {String} [wd] - the working directory
* @param {Function} [onData(data)] - function to call when data is written
* @param {Function} [onErr(data)] - function to call when err is written
* @param {Function} [onDone(exitCode)] - function to call when cmd is done
* @returns {Promise} a promise resolved or rejected by the command result
*/
function run(cmd, wd, onData, onErr, onDone){
	return new Promise(function(resolve, reject){
		if( settings.verbose ){
			console.log('$ ' + cmd);
		}
		// https://stackoverflow.com/questions/4031900/split-a-string-by-whitespace-keeping-quoted-segments-allowing-escaped-quotes
		const cmds = cmd.match(/[^"\s]+|"(?:\\"|[^"])+"/g)
										.map(expr => expr.charAt(0) === '"' && expr.charAt(expr.length-1) === '"' ? expr.slice(1, -1) : expr); // remove surrounding quotes from matched values

		const opts = {};
		if( wd ){
			opts.cwd = wd;
		}
		const runCMD = cmds[0];
		cmds.shift();
		if( settings.verbose ){
			// console.log('Command length: ', runCMD, cmds, opts);
		}
		const child = spawn(runCMD, cmds, opts);
		child.stdout.on('data', function(data){
			if( data ){
				if( settings.verbose ){
					console.log(data.toString());
				}
				if( typeof onData === 'function' ){
					onData(data.toString());
				}
			}
		});
		child.stderr.on('data', function(data){
			if( data ){
				if( settings.verbose ){
					console.log(data.toString());
				}
				if( typeof onErr === 'function' ){
					onErr(data.toString());
				}
			}
		});
		child.on('close', function(code){
			if( typeof onDone === 'function' ){
				onDone(code);
			}
			resolve(code); // resolve all, let caller handle
			// code !== 0 ? reject(code) : resolve(code);
		});
		child.on('error', function(code){
			if( typeof onDone === 'function' ){
				onDone(code, true);
			}
			resolve(code); // resolve all, let caller handle
			// code !== 0 ? reject(code) : resolve(code);
		});
	});
}

/**
* Run multiple commands.
* @param {Array} commands - an array of objects or strings containing details of commands to run
* @param {Object} options - an object containing global options for each command
* @example
	runMultiple(['mkdir test', 'cd test', 'ls']);
* @example
	runMultiple(['mkdir test', 'cd test', 'ls'], { wd: '../myCustomWorkingDirectory' });
* @example
	const commandsToRun = [
		{ command: 'ls', onData: function(data) { console.log(data) } },
		// override globalOptions working directory with each commands' options
		{ command: 'mkdir test', wd: '../../customWdNumber2', onDone: function() { console.log('done mkdir!') } },
		'ls ~/Desktop' // finish up with simple string command
	];
	const globalOptions = { wd: '../myCustomWorkingDirectory' };
	runMultiple(commandsToRun, globalOptions);
*/
function runMultiple(commands, options) {
	return new Promise(function(resolve, reject){
		const receivedOptions = options ? options : { wd: process.cwd() };
		if (commands && typeof commands === 'object') {
			if (!commands.length) {
				// probably not array
				commands = [commands];
			}
			
			// parallel
			const promises = commands.map(commandDeets => {
				const command = typeof commandDeets === 'string' ? commandDeets : commandDeets.command;
				const wd = commandDeets.wd ? commandDeets.wd : receivedOptions.wd;
				const onData = commandDeets.onData ? commandDeets.onData : receivedOptions.onData;
				const onErr = commandDeets.onErr ? commandDeets.onErr : receivedOptions.onErr;
				const onDone = commandDeets.onDone ? commandDeets.onDone : receivedOptions.onDone;
				return run(command, wd, onData, onErr, onDone);
			});
			Promise.all(promises).then(resolve, reject);
		}
		else {
			reject('Invalid input')
			return false;
		}
	});
}


const command = {
	run: runMultiple,

};

module.exports = command;
