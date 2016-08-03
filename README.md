# KiiConf

[![Visit our IRC channel](https://kiwiirc.com/buttons/irc.freenode.net/input.club.png)](https://kiwiirc.com/client/irc.freenode.net/#input.club)

KiiConf is composed by two main programs:

- the editor
- the configurator

The editor is meant for admins and it is used to generate the layout file for the configurator.

The configurator loads the layout and lets the user configure the keyboard layers.

**NOTE:** the applications are set up in debug mode by calling the ``APP`` constructor with the first parameter set to ``true``. In production it should be set to ``false`` or simply undefined.


## Environment Setup

### Prerequistes

#### Required

* Web server (e.g. lighttpd, apache, etc.)
* php5-cgi
* cmake >= 2.8
* arm-none-eabi-gcc (binutils as well)
* python3
* git
* node.js

#### Recommended

* dfu-suffix >= 0.7 (part of dfu-util)

#### Optional

* ctags


### Intial Dev Setup
* Enable web server and point it to the KiiConf/dist directory (this directory will get removed and added during build so you may want to make a symbolic link to this directory)
* Make sure that the following directories have permissions for the web-server to write
  * KiiConf/tmp
  * KiiConf/layouts
* Then setup the firmware sources. This script can be run anytime you want to update the firmware source version.
```bash
cd KiiConf
./update_controller.bash
```
* Update npm packages with `npm install`
* Finally build the project with gulp (if globally installed) `gulp dev`

The dev build will create a `dist` directory and symlink to the `controller` and `tmp` directories to allow ensure you do not have to re-build or download them.
