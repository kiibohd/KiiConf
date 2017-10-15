#!/bin/bash
# Docker test for KiiConf, not intended to be run by travis-ci
# Jacob Alexander 2017
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Common functions
source ${SCRIPT_DIR}/common.bash

# Start in top-level directory
cd ${SCRIPT_DIR}/..


## Tests

# First generate docker image
cmd docker build -t kiiconf-test .

# Run build_test.bash using docker container
cmd docker run -t -u 33:33 --rm kiiconf-test tests/build_test.bash

# Start basic web server
# Attempt to wget
# Kill server
cmd docker run -td --rm -p 127.0.0.1:80:80 --name kiiconf-test-webtest kiiconf-test
cmd wget -O /dev/null 127.0.0.1
cmd docker stop kiiconf-test-webtest



## Tests complete

result
exit $?

