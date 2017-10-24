#!/bin/bash
# Jacob Alexander 2015-2016
# Updates all git repos

# Starts with KiiConf then calls update_controller.bash
tools/update_kiiconf.bash
tools/update_controller.bash
tools/update_controller_lts.bash
# controller update will call this already
# tools/update_stats.bash
