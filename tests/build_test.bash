#!/bin/bash
# Module build test for KiiConf
# Jacob Alexander 2017
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Common functions
source ${SCRIPT_DIR}/common.bash

# Start in top-level directory
cd ${SCRIPT_DIR}/..


## Tests

cmd cgi-bin/build_layout.bash c3184563548ed992bfd3574a238d3289 MD1
cmd cgi-bin/build_layout.bash c3184563548ed992bfd3574a238d3289 MD1.1
cmd cgi-bin/build_layout.bash c3184563548ed992bfd3574a238d3289 MDErgo1
cmd cgi-bin/build_layout.bash c3184563548ed992bfd3574a238d3289 WhiteFox
cmd cgi-bin/build_layout.bash c3184563548ed992bfd3574a238d3289 KType


## Tests complete

result
exit $?

