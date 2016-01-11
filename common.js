// Copyright 2016 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

var erlnmyr = require('erlenmeyer');
var types = erlnmyr.types;
var phase = erlnmyr.phase;

module.exports.amalgamate = phase({input: types.number, output: types.string, arity: 'N:1'},
  {
    onStart: function() {
      if (this.order == undefined) {
        this.order = {};
        this.names = [];
        this.max = 0;
        this.emittedOrder = false;
      }
      this.data = [];
    },
    impl: function(data, tags) {
      var name = tags.read('eventName');
      if (this.order[name] == undefined) {
        this.order[name] = this.max++;
        this.names.push(name);
      }
      this.data[this.order[name]] = data;
      this.id = tags.read(this.options.idTag);
    },
    onCompletion: function() {
      var r = '';
      if (!this.emittedOrder) {
        r = 'id, ' + this.names.reduce(function(a, b) { return a + ', ' + b}) + '\n';
        this.emittedOrder = true;
      }
      r += this.id + ', ' + this.data.reduce(function(a, b) { return a + ', ' + b});
      return r;
    }
  },
  {idTag: ''});

function typeVar(s) { return (function(v) {
  if (!v[s]) {
    v[s] = types.newTypeVar();
  }
  return v[s];
}); }

module.exports.mergeTags = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    var inputString = this.options.inputs.map(function(input) { return tags.read(input); }).reduce(
      function(a, b) { return a + '|' + b; });
    var reString = this.options.inputs.map(function(input) { return "([^\|]*)"}).reduce(
      function(a, b) { return a + '\\|' + b; });
    tags.tag(this.options.output, inputString.replace(new RegExp(reString), this.options.spec));
    return data;
  },
  { inputs: [], spec: '', output: 'result' });

module.exports.dateTag = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    tags.tag('date', Date.now());
    return data;
  });

module.exports.hostnameTag = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    var os=require('os');
    var name = os.hostname();
    if (os.networkInterfaces().eth0 !== undefined)
      name += ' (' + os.networkInterfaces().eth0[0].address + ')';
    tags.tag('hostname', name);
    return data;
  });

