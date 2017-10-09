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
		echo "${output::${#output}-1}"
	fi
}

BUILD_PATH="./tmp/${1}"; shift
SOURCE_PATH=$(realpath controller)
REAL_BUILD_PATH=$(realpath ${BUILD_PATH})

# Get Scan Module
SCAN_MODULE="${1}"; shift

# Create build directory if necessary
mkdir -p "${BUILD_PATH}"

ExtraMap="stdFuncMap"
BuildScript=""

case "$SCAN_MODULE" in
"MD1")      # Infinity
	BuildScript="infinity.bash"
	;;
"MD1.1")    # Infinity LED
	BuildScript="infinity_led.bash"
	;;
"MDErgo1")  # Ergodox
	BuildScript="ergodox.bash"
	ExtraMap="infinity_ergodox/lcdFuncMap"
	;;
"WhiteFox") # WhiteFox
	BuildScript="whitefox.bash"
	;;
"KType")    # K-Type
	BuildScript="k-type.bash"
	;;
*)
	echo "ERROR: Unknown keyboard type"
	exit 1
	;;
esac

# Assign the default map
DEFAULT_MAP="${ExtraMap} $(layer ${1})";
shift

# Make sure a there are layers to assign
PARTIAL_MAPS="${ExtraMap} $(layer ${1})"
shift
while (( "$#" >= "1" )); do
	PARTIAL_MAPS="${PARTIAL_MAPS};${ExtraMap} $(layer ${1})"
	# PARTIAL_MAPS+=("${ExtraMap} $(layer ${1})")
	shift
done


if [ "${SCAN_MODULE}" != "MDErgo1" ]; then
	# Show commands
	set -x

	# Use this line if you want to enable debug logging.
	#DefaultMapOverride="${DEFAULT_MAP}" PartialMapsExpandedOverride="${PARTIAL_MAPS}" CMakeExtraBuildArgs="-- kll_debug" "${SOURCE_PATH}/Keyboards/${BuildScript}" -c "${SOURCE_PATH}" -o "${REAL_BUILD_PATH}" #"${DEFAULT_MAP}" "${PARTIAL_MAPS[@]}"

	DefaultMapOverride="${DEFAULT_MAP}" PartialMapsExpandedOverride="${PARTIAL_MAPS}" "${SOURCE_PATH}/Keyboards/${BuildScript}" -c "${SOURCE_PATH}" -o "${REAL_BUILD_PATH}" #"${DEFAULT_MAP}" "${PARTIAL_MAPS[@]}"
else
	LBuildPath="${REAL_BUILD_PATH}/left"
	RBuildPath="${REAL_BUILD_PATH}/right"

	# Show commands
	set -x

	DefaultMapOverride="${DEFAULT_MAP}" PartialMapsExpandedOverride="${PARTIAL_MAPS}" "${SOURCE_PATH}/Keyboards/ergodox-l.bash" -c "${SOURCE_PATH}" -o "${LBuildPath}"

	DefaultMapOverride="${DEFAULT_MAP}" PartialMapsExpandedOverride="${PARTIAL_MAPS}" "${SOURCE_PATH}/Keyboards/ergodox-r.bash" -c "${SOURCE_PATH}" -o "${RBuildPath}"

	ln -s "${LBuildPath}/kiibohd.dfu.bin" "${REAL_BUILD_PATH}/left_kiibohd.dfu.bin"
	ln -s "${LBuildPath}/kiibohd.secure.dfu.bin" "${REAL_BUILD_PATH}/left_kiibohd.secure.dfu.bin"
	ln -s "${LBuildPath}/kll.json" "${REAL_BUILD_PATH}/left_kll.json"
	ln -s "${LBuildPath}/log/generatedKeymap.h" "${REAL_BUILD_PATH}/left_generatedKeymap.h"
	ln -s "${LBuildPath}/log/kll_defs.h" "${REAL_BUILD_PATH}/left_kll_defs.h"

	ln -s "${RBuildPath}/kiibohd.dfu.bin" "${REAL_BUILD_PATH}/right_kiibohd.dfu.bin"
	ln -s "${RBuildPath}/kiibohd.secure.dfu.bin" "${REAL_BUILD_PATH}/right_kiibohd.secure.dfu.bin"
	ln -s "${RBuildPath}/kll.json" "${REAL_BUILD_PATH}/right_kll.json"
	ln -s "${RBuildPath}/log/generatedKeymap.h" "${REAL_BUILD_PATH}/right_generatedKeymap.h"
	ln -s "${RBuildPath}/log/kll_defs.h" "${REAL_BUILD_PATH}/right_kll_defs.h"
fi

RETVAL=$?

# Stop showing commands
set +x

# If the build failed, make clean, then build again
# Build log will be easier to read
if (($RETVAL != 0)); then
	# If the build still failed, make sure to remove any old .dfu.bin files
	if [ $RETVAL -ne 0 ]; then
		rm -f "${BUILD_PATH}/*.dfu.bin"
	fi
fi

exit $RETVAL