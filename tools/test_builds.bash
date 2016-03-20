#!/bin/bash
# Jacob Alexander 2015
# Build error finder

# OS X's version of readline does not support -f, but the coreutil package has
# the gnu version greadlink which does support it.
readlink_() {
    if [ "$(uname)" == "Darwin" ]; then greadlink "$@"; else readlink "$@"; fi
}

cd $(dirname $(readlink_ -f $0))/..

for dir in $(find tmp -mindepth 1 -maxdepth 1 -type d); do
	cd $dir

	# Attempt to build
	echo "Building - $dir"
	make -j

    # if the www-data user does not exist do not attempt to set permissions
	if [ $(id -u www-data > /dev/null 2>&1; echo $?)  -eq 0 ]; then
		# Make sure any new files are still owned by the www-data user
		chown -R www-data *

		# If failed, stop
		if [ $? -ne 0 ]; then
			exit 1
		fi
	else
	    echo "WARNING: No www-data user exists."
	fi

	cd -
done

echo "SUCCESS!"

