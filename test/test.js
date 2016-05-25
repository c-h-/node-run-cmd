'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const sinonChai = require("sinon-chai");
const command = require('../index');

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

// written to run on OS X

const SUCCESS = 0;

describe('run', function() {
  it('should not accept a number argument', function() {
    const cmds = 6;
    return command.run(cmds).should.not.be.fulfilled;
  });
  it('should accept a single string argument', function() {
    const cmds = 'ls';
    command.run(cmds).then(function(result) {
      done();
    },
    function(err) {
      done(err);
    });
  });
  it('should accept an array of string arguments', function() {
    const cmds = ['ls', 'ls ~/Desktop'];
    const promise = command.run(cmds);
    return promise.should.be.fulfilled;
  });
  it('should accept an array of string and object arguments', function() {
    const cmds = ['ls', { command: 'ls ~/Desktop' }];
    return command.run(cmds).should.be.fulfilled;
  });
  it('should accept an array of object arguments', function() {
    const cmds = [{ command: 'ls' }, { command: 'ls ~/Desktop' }];
    return command.run(cmds).should.be.fulfilled;
  });
  it('should accept a single object argument', function() {
    const cmds = { command: 'ls' };
    return command.run(cmds).should.be.fulfilled;
  });

  it('should run commands sequentially by default', function() {
    const progressSpy = sinon.spy();
    const output = [];
    const cmds = [
      {
        command: './test/slowScript.sh',
        onData: function(data){ output.push(data) },
      },
      {
        command: 'echo 2',
        onData: function(data){ output.push(data) },
      },
    ];
    return command.run(cmds).then(function(results) {
      output.should.deep.equal([ '1\n', '2\n' ]);
    });
  });
  it('should run commands in parallel', function() {
    const progressSpy = sinon.spy();
    const output = [];
    const cmds = [
      {
        command: './test/slowScript.sh',
        onData: function(data){ output.push(data) },
      },
      {
        command: 'echo 2',
        onData: function(data){ output.push(data) },
      },
    ];
    return command.run(cmds, { mode: 'parallel' }).then(function(results) {
      output.should.deep.equal([ '2\n', '1\n' ]);
    });
  });
});
