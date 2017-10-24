#!/bin/bash
# Jacob Alexander 2015-2017
#
# Environment Variables
#
# URL        - controller git repo URL
# BRANCH     - controller git repo branch   (default: secure_disable)
# REV        - controller git repo revision (default: HEAD)
# KLL_URL    - kll git repo URL
# KLL_BRANCH - kll git repo branch   (default: master)
# KLL_REV    - kll git repo revision (default: ee4008a1905ca14bac641f581304c3b967b8ddc3)

# OS X's version of readline does not support -f, but the coreutil package has
# the gnu version greadlink which does support it.
readlink_() {
    if [ "$(uname)" == "Darwin" ]; then greadlink "$@"; else readlink "$@"; fi
}

# Exit on any error
set -e

CODE_PATH="controller-lts"
KLL_PATH="kll"

set +x
URL=${URL:-https://github.com/kiibohd/controller.git}
BRANCH=${BRANCH:-secure_disable}
REV=${REV:-HEAD}

KLL_URL=${KLL_URL:-https://github.com/kiibohd/kll.git}
KLL_BRANCH=${KLL_BRANCH:-master}
KLL_REV=${KLL_REV:-ee4008a1905ca14bac641f581304c3b967b8ddc3}
set -x

cd $(dirname $(readlink_ -f $0))/..

# Check if controller code already exists
if [ ! -d "${CODE_PATH}" ]; then
	echo "Fresh Clone"
	git clone "${URL}" "${CODE_PATH}"
	cd "${CODE_PATH}"
	git checkout ${BRANCH}

	git clone "${KLL_URL}" "${KLL_PATH}"
	cd "${KLL_PATH}"
	git checkout ${KLL_BRANCH}
	cd ..
else
	echo "Updating controller and kll repos"
	# Make sure we're using the selected branch
	cd "${CODE_PATH}"
	git checkout ${BRANCH}
	git pull --rebase origin ${BRANCH}

	cd "${KLL_PATH}"
	git checkout ${KLL_BRANCH}
	git pull --rebase origin ${KLL_BRANCH}
	cd ..
fi

# Select the desired git revision
git checkout ${REV}

cd "${KLL_PATH}"
git checkout ${KLL_REV}

