// Copyright 2015 Google Inc. All rights reserved.
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
var seedrandom = require('seedrandom');

function typeVar(s) {
  return function(v) {
    if (!v[s]) {
      v[s] = erlnmyr.types.newTypeVar();
    }
    return v[s];
  };
}

module.exports.range = erlnmyr.phase(
  {
    input: erlnmyr.types.unit,
    output: erlnmyr.types.number,
    arity: '0:N',
  },
  function() {
    if (this.options.step > 0) {
      for (var i = this.options.start; i < this.options.end; i += this.options.step) {
        this.put(i);
      }
    } else {
      for (var i = this.options.start; i > this.options.end; i += this.options.step) {
        this.put(i);
      }
    }
  },
  {start: 0, end: 10, step: 1});

module.exports.map = erlnmyr.phase(
  {
    input: typeVar('a'),
    output: typeVar('b'),
    arity: '1:1',
  },
  function(it, tags) {
    if (!this.callback)
      this.callback = (new Function('it', 'tags', 'return ' + this.options.expr)).bind(this);
    return this.callback(it, tags);
  },
  {expr: 'it'});

module.exports.generateDOM = erlnmyr.phase(
  {
    input: erlnmyr.types.number,
    output: erlnmyr.types.string,
    arity: '1:1',
  },
  function(size) {
    var seed = +(this.options.seed || process.hrtime()[1]);
    // The Alea algorithm is fastest
    var random = seedrandom.alea(seed);
    // `seedrandom` doesn't provide a function for picking an item from a list,
    // so let's monkey-patch our own.
    random.choice = function(items) {
      var index = Math.floor(this.double() * items.length);
      return items[index];
    };
    var result = domgen(random, size);
    this.tags.tag('seed', seed);
    this.tags.tag('size', size);
    return result.dom;
  },
  {seed: null});

var tagNames = [
  'div',
  'pre',
  'table',
  'tr',
  'td',
  'thead',
  'span',
  'li',
  'ol',
  'ul',
  'a',
  'textarea',
  'input',
  'media',
  'video',
  'option',
  'canvas',
  'hr',
  'track',
  'image',
  'iframe',
  'embed',
  'object',
  'style',
  'template',
];

function Node(id, tagName) {
  this.id = id;
  this.tagName = tagName;
  this.children = [];
  this.size =
      tagName.length * 2 +
      '< id="">\n</>\n'.length +
      id.length;
}

Node.prototype.serialize = function() {
  return '<' + this.tagName + ' id="' +
      this.id + '">\n' +
      this.children.map(function(child) {
        return child.serialize();
      }).join('') +
      '</' + this.tagName + '>\n';
};

function TextNode(text) {
  this.text = text;
  this.size = text.length +
      '\n'.length;
}

TextNode.prototype.serialize = function() {
  return this.text + '\n';
};

function nextId(last) {
  var next = last + 1;
  while (/^\d/.test(next.toString(36))) {
    next++;
  }
  return next;
}

function domgen(random, maxSize) {
  if (!maxSize) {
    maxSize = 50000;
  }
  var id = nextId(0);
  var ids = [];
  var nodes = [new Node('root', 'body')];
  var size = nodes[0].size;
  while (size < maxSize) {
    var node;
    var parent = random.choice(nodes);
    if (random.double() < 0.4) {
      node = new TextNode(random.choice(tagNames));
      parent.children.push(node);
    } else {
      var idString = id.toString(36);
      ids.push(idString);
      id = nextId(id);
      node = new Node(idString, random.choice(tagNames));
      nodes.push(node);
      parent.children.push(node);
    }
    size += node.size;
  }
  return {
    dom: nodes[0].serialize(),
    ids: ids,
  }
};
