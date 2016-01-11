#!/bin/sh

for json_input in experiment-specs/*
do
    experiment_name="$(basename "$json_input" .json)"
    output_dir="traces/$experiment_name"
    > "summary-$experiment_name.csv" \
        ../node_modules/erlenmeyer/erlnmyr process.erlnmyr \
        --input="$output_dir" --xvariable="$experiment_name"
done
