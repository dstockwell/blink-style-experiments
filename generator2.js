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

var seedrandom = require('seedrandom');

// Builds a random number generator from a specified seed.
//
// If the seed is omitted or zero/false, this function will use the
// current time instead.
//
// The returned object provides the following methods:
//
// * choice(items): pick a random item from the given array.
// * weightedChoice(weights): given an object mapping keys to
//     frequencies, pick a random key.
// * randint(min, max): pick a random integer in the range [min, max].
// * uniform(min, max): pick a random float in the range [min, max).
// * seed: an attribute containing the random seed.
function makeRandom(seed) {
  var seed = seed || process.hrtime()[1];
  // The Alea algorithm is fastest
  var random = seedrandom.alea(seed);
  random.choice = function(items) {
    if (items.length === 0) return undefined;
    return items[this.randint(0, items.length - 1)];
  };
  random.weightedChoice = function(weights) {
    var totalWeight = 0;
    for (var item of Object.keys(weights))
      totalWeight += weights[item];
    var threshold = this.uniform(0, totalWeight);
    var partialSum = 0;
    for (var item of Object.keys(weights)) {
      partialSum += weights[item];
      if (partialSum >= threshold) return item;
    }
    return undefined;
  };
  random.randint = function(min, max) {
    return min + Math.abs(this.int32()) % (max - min + 1);
  };
  random.uniform = function(min, max) {
    return min + (max - min) * this.double();
  };
  random.seed = seed;
  return random;
}

// A red bullet icon. Used in the src attribute of <img> tags.
var redBullet = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA
AAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO
9TXL0Y4OHwAAAABJRU5ErkJggg==`;

// A bunch of data sets which tell us which tags to use, and where we
// should use them.
//
// The 'alexa' map is derived from the 500 most popular sites according
// to Alexa. See <https://github.com/lfairy/alexa-stats> for the code.
//
// The 'simple' map only generates <div> tags. This can be useful when
// generating very deep trees, since <div> tags can be nested
// indefinitely while e.g. <img> tags cannot.
var TagMaps = {
  alexa: require('./alexa-stats.json'),
  simple: {
    'body': {
      'div': 1,
    },
    'div': {
      'div': 1,
    }
  },
};

// Some tags (such as <a> or <img>) require certain attributes before
// they make sense. This map contains these attributes.
var tagAttributes = new Map([
  ['a', [['href', 'about:blank']]],
  ['iframe', [['src', 'about:blank']]],
  ['img', [['src', redBullet]]],
]);

// Source: http://www.programmerinterview.com/index.php/html5/void-elements-html5/
var voidElements = new Set(
  'area base br col command embed hr img input keygen link meta param source track wbr'.split(' '));

// Generates a stream of alphanumeric identifiers.
//
// Note that some of the results may start with a digit, so you'll need
// to prefix them with a letter. See `DomGenerator.prototype.nextId`.
function* generateNames() {
  for (var i = 0; ; ++i) {
    yield i.toString(36);
  }
}

// Represents an element node.
function Node(tagName, id, children) {
  this.tagName = tagName;
  this.id = id;
  this.children = children || [];
}

// Renders the current node as a string.
//
// `baseIndent` is a string which has the indentation that is added at
// each level. For example, a value of '  ' (two spaces) will indent
// every child node by that amount.
//
// `indent` is the indentation accumulated so far. It is empty or
// undefined at the top level, and has a `baseIndent` appended to it at
// every level below that.
Node.prototype.render = function(baseIndent, indent) {
  if (typeof baseIndent == 'undefined') baseIndent = '';
  if (typeof indent == 'undefined') indent = '';

  // Render attributes
  var attrs = '';
  if (tagAttributes.has(this.tagName)) {
    for (var attr of tagAttributes.get(this.tagName)) {
      attrs += ` ${attr[0]}="${attr[1]}"`;
    }
  }

  // Render children
  var body = '';
  if (this.children.length > 0) {
    body = `\n${this.children.map(x => x.render(baseIndent, baseIndent + indent)).join('\n')}\n${indent}`;
  }

  // Render end tag
  var endTag = '';
  if (!voidElements.has(this.tagName)) {
    endTag = `</${this.tagName}>`;
  }

  return `${indent}<${this.tagName} id="${this.id}"${attrs}>${body}${endTag}`;
}

// Counts the number of nodes in this node (including the node itself).
Node.prototype.countNodes = function() {
  var total = 1;
  for (var child of this.children) total += child.countNodes();
  return total;
}

// A text node.
function TextNode(text) {
  this.text = text;
}

TextNode.prototype.render = function(baseIndent, indent) {
  if (typeof indent == 'undefined') indent = '';
  return `${indent}${this.text}`;
}

TextNode.prototype.countNodes = function() {
  return 1;
}

// Generates a fragment of HTML.
//
// See `fuzz3/experiment-specs/*.json` for examples of these parameters.
//
// Parameters:
// * random: the random number generator (as returned by `makeRandom`)
// * branchiness: branching factor
// * depthicity: tree depth
// * tagMap: the set of tags to use, either 'alexa' or 'simple'
//     (optional, defaults to 'alexa')
//
// The returned object has the following attributes:
// * nodes: an array of generated nodes
// * ids: an array of element IDs
// * countNodes(): counts the number of element and text nodes
// * render(indent): converts the nodes to a string, prepending the
//     `indent` string at each level of the tree
function generateDom(random, branchiness, depthicity, tagMap) {
  var gen = new DomGenerator(random, branchiness, depthicity, tagMap);
  var nodes = gen.generateNodes();
  return {
    nodes: nodes,
    ids: gen.ids,
    countNodes: function() {
      return this.nodes.map(n => n.countNodes()).reduce((m, n) => m + n, 0);
    },
    render: function(indent) {
      return this.nodes.map(n => n.render(indent)).join('\n');
    },
  };
}

function DomGenerator(random, branchiness, depthicity, tagMap) {
  this.random = random;
  this.branchiness = branchiness;
  this.depthicity = depthicity;
  this.tagMap = tagMap ? TagMaps[tagMap] : TagMaps['alexa'];
  if (typeof this.tagMap === 'undefined') throw `Unknown tag map ${tagMap}`;
  this.namesIterator = generateNames();
  this.ids = [];
}

DomGenerator.prototype.generateNodes = function(parentTag, depth) {
  if (typeof parentTag === 'undefined') parentTag = 'body';
  if (typeof depth === 'undefined') depth = 0;
  var result = [];
  for (var width = 0; width < this.branchiness; ++width) {
    // Choose a random tag, based on the tag name of the parent
    var tagName = this.random.weightedChoice(this.tagMap[parentTag]);
    if (depth >= this.depthicity || tagName === '') {
      // Create a text node
      var newText = parentTag;
      // Optimization: merge consecutive text nodes into a single node
      if (result.length > 0 && result[result.length-1] instanceof TextNode)
        result[result.length-1].text += newText;
      else
        result.push(new TextNode(newText));
    } else {
      // Create an element node
      var children = [];
      if (this.tagMap[tagName] && Object.keys(this.tagMap[tagName]).length > 0)
        children = this.generateNodes(tagName, 1 + depth);
      result.push(new Node(tagName, this.nextId(), children));
    }
  }
  return result;
}

// Returns a fresh ID.
DomGenerator.prototype.nextId = function() {
  var result = 'i' + this.namesIterator.next().value;
  this.ids.push(result);
  return result;
}

// Generates a fragment of CSS.
//
// See `fuzz3/experiment-specs/*.json` for examples of these parameters.
//
// Parameters:
// * random: random number generator, as returned by `makeRandom`
// * tagMap: an object mapping tag names to frequencies. Used to decide
//     what tags to use for tag and universal selectors. Note that this
//     is *not* the same as the tagMap used by `generateDom`.
// * simpleSelectorMap/combinatorMap: objects which map selector types
//     to frequencies
// * classes/ids: arrays of classes and IDs to match
// * propertyString: a string to be placed in the body of each rule
// * ruleCount: the number of CSS rules to generate
//
// Return value:
// * rules: the generated CSS rules, as an array of strings
// * selectorsUsed: an object mapping selector types to how many times
//     they appear in the result
// * render(): renders the rules as a string
function generateCss(random, tagMap, simpleSelectorMap, combinatorMap, classes, ids, propertyString, ruleCount) {
  var gen = new CssGenerator(random, tagMap, simpleSelectorMap, combinatorMap, classes, ids, propertyString);
  var rules = [];
  for (var i = 0; i < ruleCount; ++i) {
    rules.push(gen.generateOneRule());
  }
  return {
    rules: rules,
    selectorsUsed: gen.selectorsUsed,
    render: function() {
      return this.rules.join('\n');
    },
  };
}

function CssGenerator(random, tagMap, simpleSelectorMap, combinatorMap, classes, ids, propertyString) {
  this.random = random;
  this.tagMap = tagMap;
  this.simpleSelectorMap = simpleSelectorMap;
  this.combinatorMap = combinatorMap;
  this.classes = classes;
  this.ids = ids;
  this.propertyString = propertyString;

  this.selectorsUsed = {tag: 0, universal: 0};
  for (var selector of Object.keys(simpleSelectorMap)) {
    this.selectorsUsed[selector] = 0;
  }
  for (var selector of Object.keys(combinatorMap)) {
    this.selectorsUsed[selector] = 0;
  }
}

// Generates a single CSS rule, and returns it as a string.
CssGenerator.prototype.generateOneRule = function() {
  var selector = this.generateSelector();
  return `${selector} { ${this.propertyString} }`;
}

CssGenerator.prototype.generateSelector = function() {
  var tokens = [];
  this.appendSimpleSelectorTokensTo(tokens);
  do {
    var next = this.random.weightedChoice(this.combinatorMap);
    switch (next) {
      case 'end':
        continue;
      case 'descendant':
        tokens.push(' ');
        break;
      case 'child':
        tokens.push('>');
        break;
      case 'adjacentSibling':
        tokens.push('+');
        break;
      case 'generalSibling':
        tokens.push('~');
        break;
      default:
        throw `Unknown selector combinator type: ${next}`;
    }
    ++this.selectorsUsed[next];
    this.appendSimpleSelectorTokensTo(tokens);
  } while (next !== 'end');
  return tokens.join('');
}

CssGenerator.prototype.appendSimpleSelectorTokensTo = function(tokens) {
  var tagOrStar = this.random.weightedChoice(this.tagMap);
  if (tagOrStar === '*') ++this.selectorsUsed.universal;
  else ++this.selectorsUsed.tag;
  tokens.push(tagOrStar);
  do {
    var next = this.random.weightedChoice(this.simpleSelectorMap);
    switch (next) {
      case 'end':
        continue;
      case 'class':
        if (this.classes.length === 0) continue;
        tokens.push(`.${this.random.choice(this.classes)}`);
        break;
      case 'id':
        if (this.ids.length === 0) continue;
        tokens.push(`#${this.random.choice(this.ids)}`);
        break;
      default:
        throw `Unknown selector type: ${next}`;
    }
    ++this.selectorsUsed[next];
  } while (next !== 'end');
}

module.exports.makeRandom = makeRandom;
module.exports.generateDom = generateDom;
module.exports.generateCss = generateCss;
