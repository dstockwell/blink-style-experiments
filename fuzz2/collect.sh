#!/bin/sh

[ -z "$CHROMIUM_SRC" ] && CHROMIUM_SRC="$HOME/chromium/src"
[ -z "$ERLNMYR" ] && ERLNMYR=erlnmyr

for json_input in experiment-specs/*
do
    experiment_name="$(basename "$json_input" .json)"
    output_dir="traces/$experiment_name"
    $ERLNMYR collect.erlnmyr --chromium="$CHROMIUM_SRC" \
        --input="$json_input" --output="$output_dir"'/$1-$2-$3-$4-$5.trace'
done
