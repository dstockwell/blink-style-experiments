# fuzz1

This folder contains experiments based on @dstockwell's initial HTML fuzzing code.

This generator had the following issues:

- There was no knowledge of the content model -- for example, a `<textarea>` would often have other tags inside it;

- Because of the way parents were chosen, nodes earlier in the document ended up with more children than later ones;

- There were no options for changing the shape of the DOM tree, other than the total number of nodes.

For these reasons a new generator was written.
