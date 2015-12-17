#!/bin/sh

chromium_src="$HOME/chromium/src"

run() {
    # Print a command to stdout before running it
    echo "$@"
    "$@"
}

for json_input in experiment-specs/*
do
    experiment_name="$(basename "$json_input" .json)"
    output_dir="traces/$experiment_name"
    run ../node_modules/erlenmeyer/erlnmyr collect.erlnmyr --chromium="$chromium_src" \
        --input="$json_input" --output="$output_dir"'/$1-$2-$3-$4-$5.trace'
done
