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


# Functions for json file generation
gitrev() {
	cd $1
	git show -s --format=%H
	cd - > /dev/null
}

gitdate() {
	cd $1
	git show -s --format=%ci
	cd - > /dev/null
}

gitrepourl() {
	cd $1
	git remote show origin -n | grep "Fetch URL:" | sed -e "s/^ *Fetch URL: *//" | sed -e "s/.git *$//"
	cd - > /dev/null
}


# Generate a json file with the git information
cd $ORIG_DIR
echo "
{
	\"KiiConf\" : {
		\"gitrev\"  : \"$(gitrev .)\",
		\"gitdate\" : \"$(gitdate .)\",
		\"url\"     : \"$(gitrepourl .)\"
	},
	\"controller\" : {
		\"gitrev\"  : \"$(gitrev ${CODE_PATH})\",
		\"gitdate\" : \"$(gitdate ${CODE_PATH})\",
		\"url\"     : \"$(gitrepourl ${CODE_PATH})\"
	},
	\"kll\" : {
		\"gitrev\"  : \"$(gitrev ${CODE_PATH}/${KLL_PATH})\",
		\"gitdate\" : \"$(gitdate ${CODE_PATH}/${KLL_PATH})\",
		\"url\"     : \"$(gitrepourl ${CODE_PATH}/${KLL_PATH})\"
	}
}
" > stats.json

