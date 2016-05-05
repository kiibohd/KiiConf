#!/bin/bash
# Jacob Alexander 2015
# Arg 1: Build Directory
# Arg 2: Scan Module
# Arg 3: DefaultMap
# Arg 4: Layer 1
# Arg 5: Layer 2
# etc.
# Example: ./build_layout.bash <hash> <scan module> <default map> <layer1> <layer2>
#          ./build_layout.bash c3184563548ed992bfd3574a238d3289 MD1 MD1-Hacker-0.kll MD1-Hacker-1.kll
#          ./build_layout.bash c3184563548ed992bfd3574a238d3289 MD1 "" MD1-Hacker-1.kll
# NOTE: If a layer is blank, set it as ""

# Takes a layer path, moves it to the build directory then prints the layer name(s)
# "layer1 layer1a"
# Arg 1: List of file paths
layer() {
	output=""
	for file in $@; do
		filename=$(basename "${file}")
		extension="${filename##*.}"
		filename_base="${filename%.*}"
		output="${output}${filename_base} "
	done

	# Output everything except the last character unless there was nothing in this layer
	if [ "${output}" == "" ]; then
		echo ""
	else
		echo "${output::-1}"
	fi
}

BUILD_PATH="./tmp/${1}"; shift
SOURCE_PATH=$(realpath controller)

# Get Scan Module
SCAN_MODULE="${1}"; shift

# Create build directory if necessary
mkdir -p "${BUILD_PATH}"

ERGODOX_DEFAULT_MAP="$(layer ${1}) lcdFuncMap"
DEFAULT_MAP="$(layer ${1}) stdFuncMap"; shift # Assign the default map

# Make sure a there are layers to assign
PARTIAL_MAPS=""
ERGODOX_PARTIAL_MAPS=""
if test $# -gt 0; then
	# Assign the parital map paramters
	# Each layer is separated by a ;
	ERGODOX_PARTIAL_MAPS="$(layer ${1}) lcdFuncMap"
	PARTIAL_MAPS="$(layer ${1}) stdFuncMap"; shift
	while test $# -gt 0; do
		ERGODOX_PARTIAL_MAPS="${ERGODOX_PARTIAL_MAPS};$(layer ${1}) lcdFuncMap"
		PARTIAL_MAPS="${PARTIAL_MAPS};$(layer ${1}) stdFuncMap"; shift
	done
fi

# Start CMake generation
cd "${BUILD_PATH}"

# General build
default_build() {
	# Show commands
	set -x

	# NOTE: To add different layers -> -DPartialMaps="layer1 layer1a;layer2 layer2a;layer3"
	cmake ${SOURCE_PATH} -DScanModule="$SCAN_MODULE" -DCHIP="${CHIP}" -DMacroModule="PartialMap" -DOutputModule="pjrcUSB" -DDebugModule="full" -DBaseMap="defaultMap" -DDefaultMap="${DEFAULT_MAP}" -DPartialMaps="${PARTIAL_MAPS}" -DCONFIGURATOR=1
	#cmake ${SOURCE_PATH} -DScanModule="MD1" -DMacroModule="PartialMap" -DOutputModule="pjrcUSB" -DDebugModule="full" -DBaseMap="defaultMap" -DDefaultMap="${DEFAULT_MAP}" -DPartialMaps="${PARTIAL_MAPS}"
	# Example working cmake command
	#cmake ${SOURCE_PATH} -DScanModule="MD1" -DMacroModule="PartialMap" -DOutputModule="pjrcUSB" -DDebugModule="full" -DBaseMap="defaultMap" -DDefaultMap="md1Overlay stdFuncMap" -DPartialMaps="hhkbpro2"

	# Build Firmware
	make -j
	RETVAL=$?

	# Stop showing commands
	set +x

	# If the build failed, make clean, then build again
	# Build log will be easier to read
	if [ $RETVAL -ne 0 ]; then
		make clean
		make
		RETVAL=$?

		# If the build still failed, make sure to remove any old .dfu.bin files
		if [ $RETVAL -ne 0 ]; then
			rm -f *.dfu.bin
		fi
	fi

	exit $RETVAL
}

# TODO Get this to work with a general build
# Ergodox 2 half build
ergodox_build() {
	SIDE=${1}

	pwd
	# Show commands
	set -x

	# Directory for this side
	mkdir -p $SIDE
	cd $SIDE

	# Copy all the needed .kll files here
	cp ../*.kll .

	# NOTE: To add different layers -> -DPartialMaps="layer1 layer1a;layer2 layer2a;layer3"
	cmake ${SOURCE_PATH} -DScanModule="$SCAN_MODULE" -DCHIP="${CHIP}" -DBaseMap="${!SIDE}" -DMacroModule="PartialMap" -DOutputModule="pjrcUSB" -DDebugModule="full" -DDefaultMap="${ERGODOX_DEFAULT_MAP}" -DPartialMaps="${ERGODOX_PARTIAL_MAPS}" -DCONFIGURATOR=1

	# Build Firmware
	make -j
	RETVAL=$?

	# Stop showing commands
	set +x

	# If the build failed, make clean, then build again
	# Build log will be easier to read
	if [ $RETVAL -ne 0 ]; then
		make clean
		make
		RETVAL=$?

		# If the build still failed, make sure to remove any old .dfu.bin files
		if [ $RETVAL -ne 0 ]; then
			rm -f *.dfu.bin
		fi
	fi

	# Go back to the previous directory
	cd ..
}

case "$SCAN_MODULE" in
# Ergodox
"MDErgo1")
	CHIP="mk20dx256vlh7"
	left="defaultMap leftHand slave1 rightHand"
	right="defaultMap rightHand slave1 leftHand"

	# Run left side in the background
	ergodox_build left &
	ergodox_build right

	# Symlink all the needed files to this directory
	pwd
	ln -s  left/kiibohd.dfu.bin  left_kiibohd.dfu.bin
	ln -s right/kiibohd.dfu.bin right_kiibohd.dfu.bin

	ln -s  left/generatedKeymap.h  left_generatedKeymap.h
	ln -s right/generatedKeymap.h right_generatedKeymap.h

	ln -s  left/kll_defs.h  left_kll_defs.h
	ln -s right/kll_defs.h right_kll_defs.h

	exit $RETVAL
	;;

# WhiteFox
"WhiteFox")
	CHIP="mk20dx256vlh7"
	default_build
	;;

# General
*)
	CHIP="mk20dx128vlf5"
	default_build
	;;
esac

echo "ERROR: Should not get here..."
exit 1


