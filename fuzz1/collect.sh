#!/bin/sh

[ -z "$CHROMIUM_SRC" ] && CHROMIUM_SRC="$HOME/chromium/src"
[ -z "$ERLNMYR" ] && ERLNMYR=erlnmyr

$ERLNMYR collect.erlnmyr --chromium="$CHROMIUM_SRC"
