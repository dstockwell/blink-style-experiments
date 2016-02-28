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

// Collects a sequence of data points into a CSV file, grouping them by
// their 'eventName'.
module.exports.amalgamate = phase({input: types.number, output: types.string, arity: 'N:1'},
  {
    onStart: function() {
      if (this.columnIndices === undefined) {
        // Make sure that every row's fields are in a consistent order
        this.columnIndices = {};
        this.columnNames = [];
        this.isFirstRow = true;
      }
      this.row = [];
      this.getColumnIndex = function(name) {
        if (this.columnIndices[name] === undefined) {
          this.columnIndices[name] = this.columnNames.length;
          this.columnNames.push(name);
        }
        return this.columnIndices[name];
      };
    },
    impl: function(value, tags) {
      for (var tag of this.options.tags) {
        var tagValue = tags.read(tag);
        if (tagValue === undefined || tagValue === null) tagValue = '';
        this.row[this.getColumnIndex(tag)] = tags.read(tag);
      }
      var name = tags.read('eventName');
      this.row[this.getColumnIndex(name)] = value;
    },
    onCompletion: function() {
      var r = '';
      if (this.isFirstRow) {
        r = this.columnNames.join(', ') + '\n';
        this.isFirstRow = false;
      }
      r += this.row.join(', ');
      return r;
    }
  },
  {tags: []});

function typeVar(s) { return (function(v) {
  if (!v[s]) {
    v[s] = types.newTypeVar();
  }
  return v[s];
}); }

// Combines the values of multiple tags into a new tag.
//
// For example, the code
//
//     mergeTags [inputs="['date', 'hostname']", spec="$1-$2.log", output="filename"];
//
// builds a filename from the time and host on which the experiment was run.
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

// Adds a 'date' tag which contains the current time.
module.exports.dateTag = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    tags.tag('date', Date.now());
    return data;
  });

// Adds a 'hostname' tag which contains the machine's host name.
module.exports.hostnameTag = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    var os=require('os');
    var name = os.hostname();
    if (os.networkInterfaces().eth0 !== undefined)
      name += ' (' + os.networkInterfaces().eth0[0].address + ')';
    tags.tag('hostname', name);
    return data;
  });

// Parses the values of multiple tags from a single tag. This phase
// takes the input tag, splits it by the '-' character, and assigns each
// piece to a corresponding tag.
//
// The 'input' option states which tag to parse (default: 'filename').
//
// The 'tags' option states which tags to assign values to.
module.exports.extractTags = erlnmyr.phase(
  {
    input: typeVar('a'),
    output: typeVar('a'),
    arity: '1:1',
  },
  function(data, tags) {
    var input = tags.read(this.options.input);
    var fragments = input.split('-');
    for (var i = 0; i < this.options.tags.length; ++i) {
      tags.tag(this.options.tags[i], fragments[i]);
    }
    return data;
  },
  {
    input: 'filename',
    tags: [],
  });

// Outputs a JSON object which includes both the input value and its
// associated tags. This output will have two fields:
//
// {
//   "data": the original input value
//   "tags": the tags that go with it
// }
//
// The "tags" option is an array which lists what tags to include. If
// omitted, all tags will be included in the output.
module.exports.attachTagsToJson = erlnmyr.phase(
  {
    input: typeVar('a'),
    output: types.JSON,
    arity: '1:1',
  },
  function(data) {
    var keys = this.options.tags;
    if (keys === null) {
      keys = Object.keys(this.tags.tags);
    }
    var tags = {};
    for (var key of keys) {
      tags[key] = this.tags.read(key);
    }
    return { tags: tags, data: data };
  },
  {
    tags: null,
  });

// Extracts the tags back from the JSON input.
//
// This is the inverse of `attachTagsToJson`.
module.exports.extractTagsFromJson = erlnmyr.phase(
  {
    input: types.JSON,
    output: typeVar('a'),
    arity: '1:1',
  },
  function(input) {
    var tags = input.tags;
    for (var key of Object.keys(tags)) {
      this.tags.tag(key, tags[key]);
    }
    return input.data;
  });
