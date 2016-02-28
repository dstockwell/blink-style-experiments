#!/bin/sh

[ -z "$ERLNMYR" ] && ERLNMYR=erlnmyr

$ERLNMYR process.erlnmyr --input=traces > summary.csv
