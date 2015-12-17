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

function makeRandom(seed) {
  var seed = seed || process.hrtime()[1];
  // The Alea algorithm is fastest
  var rng = seedrandom.alea(seed);
  return {
    random: rng.double.bind(rng),
    seed: seed,
  };
}

module.exports.makeGenerateDOM2Args = erlnmyr.phase(
  {
    input: erlnmyr.types.JSON,
    output: erlnmyr.types.JSON,
    arity: '1:N',
  },
  function(args) {
    var random = makeRandom(args.seed);
    var randint = (min, max) => Math.floor(random.random() * (max - min + 1)) + min;
    var i = 0;
    while (i < args.samples) {
      var branchiness = randint(args.minBranchiness, args.maxBranchiness);
      var depthicity = randint(args.minDepthicity, args.maxDepthicity);
      var predictedNodeCount = Math.floor(
        (Math.pow(branchiness, depthicity + 1) - 1) / (branchiness - 1));
      if (predictedNodeCount > args.maxNodeCount) continue;
      this.put({
        branchiness: branchiness,
        depthicity: depthicity,
        seed: randint(0, Math.pow(2, 32) - 1),
      });
      ++i;
    }
  },
  {});

module.exports.generateDOM2 = erlnmyr.phase(
  {
    input: erlnmyr.types.JSON,
    output: erlnmyr.types.string,
    arity: '1:N',
  },
  function(args) {
    var random = makeRandom(args.seed);
    var generator = new DOMGenerator(random.random, args.branchiness, args.depthicity);
    var result = generator.generateNode();
    this.tags.tag('branchiness', args.branchiness);
    this.tags.tag('depthicity', args.depthicity);
    this.tags.tag('nodeCount', result.countNodes());
    this.tags.tag('seed', random.seed);
    this.put(result.render());
  },
  {seed: null});

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

////////////////////////////////////////////////////////////////////////////////////////////////////

/*
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
*/

function* generateNames() {
  for (var i = 0; ; ++i) {
    yield i.toString(36);
  }
}

function Node(tagName, id) {
  this.tagName = tagName;
  this.id = id;
  this.children = [];
}

Node.prototype.render = function(baseIndent, indent) {
  if (typeof baseIndent == 'undefined') baseIndent = '';
  if (typeof indent == 'undefined') indent = '';
  var body;
  if (this.children.length > 0) {
    body = `\n${this.children.map(x => x.render(baseIndent, baseIndent + indent)).join('\n')}\n${indent}`;
  } else {
    body = '';
  }
  return `${indent}<${this.tagName} id="${this.id}">${body}</${this.tagName}>`;
}

Node.prototype.countNodes = function() {
  var total = 1;
  for (var child of this.children) total += child.countNodes();
  return total;
}

function TextNode(text) {
  this.text = text;
}

TextNode.prototype.render = function(baseIndent, indent) {
  return `${indent}${this.text}`;
}

TextNode.prototype.countNodes = function() {
  return 1;
}

function DOMGenerator(random, branchiness, depthicity) {
  // Random number generator. Returns a random value from the range `[0, 1)`.
  this.random = random;
  // Branching factor.
  this.branchiness = branchiness;
  // Maximum tree depth.
  this.depthicity = depthicity;
  this.ids = generateNames();
}

DOMGenerator.prototype.generateNode = function(depth) {
  if (typeof depth == 'undefined') depth = 0;
  // var tagName = tagNames[Math.floor(this.random() * tagNames.length)];
  var tagName = 'div';
  var node = new Node(tagName, this.ids.next().value);
  if (depth < this.depthicity) {
    for (var width = 0; width < this.branchiness; ++width) {
      var child = this.generateNode(1 + depth);
      node.children.push(child);
    }
  } else {
    node.children.push(new TextNode(tagName));
  }
  return node;
}

module.exports.Node = Node;
module.exports.DOMGenerator = DOMGenerator;
