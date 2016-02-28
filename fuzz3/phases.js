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
var seedrandom = require('seedrandom');

var generator2 = require('../generator2');

function typeVar(s) {
  return function(v) {
    if (!v[s]) {
      v[s] = erlnmyr.types.newTypeVar();
    }
    return v[s];
  };
}

// Given a JSON object with two fields, "cssArgs" and "domArgs":
//
// 1. Output the value of "domArgs"; and
// 2. Store the value of "cssArgs" in a tag of the same name.
//
// This is necessary because erlnmyr doesn't support multiple parallel
// inputs. So we hack around this by storing the latter input in a tag.
module.exports.separateCssAndDomArgs = erlnmyr.phase(
  {
    input: erlnmyr.types.JSON,
    output: erlnmyr.types.JSON,
    arity: '1:1',
  },
  function(args) {
    this.tags.tag('cssArgs', args.cssArgs);
    return args.domArgs;
  });

function predictedNodeCount(branchiness, depthicity) {
  // See <https://en.wikipedia.org/wiki/K-ary_tree#Properties_of_k-ary_trees>
  if (branchiness == 1) return depthicity;
  return Math.floor((Math.pow(branchiness, depthicity + 1) - 1) / (branchiness - 1));
}

// Generates random parameters for `generateDom2`.
//
// The JSON input should have the following format:
// {
//   "minBranchiness": the minimum value for the "branchiness" parameter
//   "maxBranchiness": the maximum value for the "branchiness" parameter
//   "minDepthicity": the minimum value for the "depthicity" parameter
//   "maxDepthicity": the maximum value for the "depthicity" parameter
//   "maxNodeCount": the maximum number of nodes in the output. Any set
//     of parameters which may result in too many nodes will be
//     discarded.
//   "samples": the number of outputs to generate
// }
module.exports.generateDomSampleArgs = erlnmyr.phase(
  {
    input: erlnmyr.types.JSON,
    output: erlnmyr.types.JSON,
    arity: '1:N',
  },
  function(args) {
    if (predictedNodeCount(args.minBranchiness, args.minDepthicity) > args.maxNodeCount)
      throw 'parameters too large -- either reduce minBranchiness/minDepthicity or increase maxNodeCount';
    var random = generator2.makeRandom(args.seed);
    var i = 0;
    while (i < args.samples) {
      var branchiness = random.randint(args.minBranchiness, args.maxBranchiness);
      var depthicity = random.randint(args.minDepthicity, args.maxDepthicity);
      // Only emit this set of parameters if the node count is
      // guaranteed to stay under the maximum.
      if (predictedNodeCount(branchiness, depthicity) <= args.maxNodeCount) {
        this.put({
          branchiness: branchiness,
          depthicity: depthicity,
          tagMap: args.tagMap,
          seed: random.randint(0, Math.pow(2, 32) - 1),
        });
        ++i;
      }
    }
  });

// Generates random HTML fragments.
//
// The JSON input should have the following format:
// {
//   "branchiness": the number of children contained by each non-leaf node
//   "depthicity": the maximum depth of the tree
//   "nodeCount": the maximum number of nodes in the tree
//   "seed": the seed to use for random number generation
// }
//
// If you want to generate multiple fragments, consider building the
// parameters using `generateSampleArgs`.
module.exports.generateDom2 = erlnmyr.phase(
  {
    input: erlnmyr.types.JSON,
    output: erlnmyr.types.string,
    arity: '1:1',
  },
  function(args) {
    var random = generator2.makeRandom(args.seed);
    var result = generator2.generateDom(random, args.branchiness, args.depthicity, args.tagMap);
    this.tags.tag('branchiness', args.branchiness);
    this.tags.tag('depthicity', args.depthicity);
    this.tags.tag('tagMap', args.tagMap);
    this.tags.tag('nodeCount', result.countNodes());
    this.tags.tag('ids', result.ids);
    this.tags.tag('seed', random.seed);
    return result.render();
  });

module.exports.generateCss = erlnmyr.phase(
  {
    input: erlnmyr.types.string,
    output: erlnmyr.types.string,
    arity: '1:1',
  },
  function(html) {
    var random = generator2.makeRandom(this.tags.read('seed'));
    var options = this.tags.read('cssArgs');
    var classes = [];
    var ids = this.tags.read('ids');
    var ruleCount = random.randint(options.minRuleCount, options.maxRuleCount);
    var result = generator2.generateCss(
      random, options.tagMap, options.simpleSelectorMap, options.combinatorMap,
      classes, ids, options.propertyString, ruleCount);
    this.tags.tag('ruleCount', ruleCount);
    for (var key of Object.keys(result.selectorsUsed)) {
      this.tags.tag(`selectorsUsed.${key}`, result.selectorsUsed[key]);
    }
    return `<style>${result.render()}</style>\n${html}`;
  });
