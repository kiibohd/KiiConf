#!/bin/bash
# Jacob Alexander 2015

# OS X's version of readline does not support -f, but the coreutil package has
# the gnu version greadlink which does support it.
readlink_() {
	if [ "$(uname)" == "Darwin" ]; then greadlink "$@"; else readlink "$@"; fi
}
cd $(dirname $(readlink_ -f $0))/..

CODE_PATH="controller"
KLL_PATH="kll"
URL="https://github.com/kiibohd/controller.git"
KLL_URL="https://github.com/kiibohd/kll.git"
BRANCH="master"
ORIG_DIR=$(pwd)

# Check if controller code already exists
if [ ! -d "${CODE_PATH}" ]; then
	git clone "${URL}"
	cd ${CODE_PATH}
	git clone "${KLL_URL}"
else
	cd "${CODE_PATH}"
	git pull --rebase origin ${BRANCH}
	cd "${KLL_PATH}"
	git pull --rebase origin ${BRANCH}
fi

cd $ORIG_DIR
tools/update_stats.bash