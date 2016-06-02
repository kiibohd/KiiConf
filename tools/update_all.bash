#!/bin/bash
# Jacob Alexander 2015-2016
# Updates all git repos
# Starts with KiiConf then calls update_controller.bash
#

# OS X's version of readline does not support -f, but the coreutil package has
# the gnu version greadlink which does support it.
readlink_() {
	if [ "$(uname)" == "Darwin" ]; then greadlink "$@"; else readlink "$@"; fi
}

cd $(dirname $(readlink_ -f $0))/..

git pull --rebase
tools/update_controller.bash

