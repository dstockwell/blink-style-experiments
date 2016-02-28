#!/bin/sh

[ -z "$CHROMIUM_SRC" ] && CHROMIUM_SRC="$HOME/chromium/src"
[ -z "$ERLNMYR" ] && ERLNMYR=erlnmyr

input_files="$*"
if [ -z "$input_files" ]
then
    input_files=experiment-specs/*.json
fi

for json_input in $input_files
do
    experiment_name="$(basename "$json_input" .json)"
    output_dir="traces/$experiment_name"
    $ERLNMYR collect.erlnmyr --chromium="$CHROMIUM_SRC" \
        --input="$json_input" --output="$output_dir"'/$1-$2.trace'
done
