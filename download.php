<?php
header('Content-Type: application/json');

try {
	//Make sure that it is a POST request.
	if(strcasecmp($_SERVER['REQUEST_METHOD'], 'POST') != 0){
		throw new Exception('Request method must be POST!');
	}

	//Make sure that the content type of the POST request has been set to application/json
	$contentType = isset($_SERVER["CONTENT_TYPE"]) ? trim($_SERVER["CONTENT_TYPE"]) : '';
	if(strpos($contentType, 'application/json') === false){
		throw new Exception('Content type must be: application/json -- was ' . $contentType);
	}

	$map_orig = file_get_contents("php://input");

	$map = @json_decode( $map_orig );

	if ($map === null && json_last_error() !== JSON_ERROR_NONE) {
		throw new Exception('Invalid JSON, unable to parse.');
	}

	$name = !empty( $map->header->Name ) ? preg_replace('/[^a-z0-9._]/i', '', str_replace(' ', '_', $map->header->Name)) : '';
	$layout = !empty( $map->header->Layout ) ? preg_replace('/[^a-z0-9._]/i', '', str_replace(' ', '_', $map->header->Layout)) : '';
	$base_layout = !empty( $map->header->Base ) ? preg_replace('/[^a-z0-9._]/i', '', str_replace(' ', '_', $map->header->Base)) : '';

	if ( !$name || !$layout ) {
		throw new Exception('Invalid Header Information');
	}

	$default = './layouts/' . $name . '-' . $base_layout . '.json';
	$default = json_decode( file_get_contents($default) );
	$default = $default->matrix;

	$layers = array();
	$triggers = array();

	// Find the differences between the default map and the user's map
	if ($name == 'WhiteFox') {
		// WhiteFox layouts have fewer keys than the defaultMap so we need to verify based
		//  upon the scan codes rather than just a sequence. Long term this method should
		//  probably be the preferred method for building up layer files
		foreach ( $map->matrix as $i => $key ) {
			// First find the corresponding key via scan code
			$idxInDef = -1;
			foreach ( $default as $j => $defkey ) {
				if ($key->code == $defkey->code) {
					$idxInDef = $j;
					break;
				}
			}
			if ($idxInDef >= 0) {
				foreach ( $key->layers as $l => $layer ) {
					$layers[$l][$default[$idxInDef]->layers->{0}->key] = $layer->key;
				}

				// Process "trigger" entries
				if (isset($key->triggers)) {
					foreach ($key->triggers as $t => $trigger) {
						$triggers[$t][$default[$idxInDef]->layers->{0}->key] = $trigger;
					}
				}
			}
		}
	}
	else {
		foreach ( $map->matrix as $i => $key ) {
			// Process "layer" entries
			foreach ( $key->layers as $l => $layer ) {
				$layers[$l][$default[$i]->layers->{0}->key] = $layer->key;
			}

			// Process "trigger" entries
			if (isset($key->triggers)) {
				foreach ($key->triggers as $t => $trigger) {
					$triggers[$t][$default[$i]->layers->{0}->key] = $trigger;
				}
			}
		}
	}

	$header = implode("\n", array_map(function ($v, $k) { return $k . ' = "' . $v . '";'; }, (array)$map->header, array_keys((array)$map->header)));
	$defines = implode("\n", array_map(function ($v) { return $v->name . ' = "' . $v->value . '";' . "\n"; }, (array)$map->defines));

	$files = array();
	$file_args = array();
	$controller_ver = ($_SERVER['REMOTE_ADDR'] == '127.0.0.1' || $_SERVER['REMOTE_ADDR'] == '::1') ? '' : json_decode(file_get_contents('http://configurator.input.club/stats.json'));
	if ( $controller_ver !== '' ) {
		$controller_ver = $controller_ver->controller->gitrev . $controller_ver->kll->gitrev;
	}
	$hashbaby = $name . $layout . $controller_ver; // Set name of base, layout and controller version here as an md5 seed
	$layout_name = $name . '-' . $layout;

	$animations = '';
	if ( isset($map->animations) ) {
		$animations = implode("\n", array_map(function($v, $k) {
			$s = 'A[' . $k . '] <= ' . $v->settings . ";\n";

			$i = 1;
			foreach ($v->frames as $frame) {
				if (substr($frame, 0, 1) === "#") {
					// Output comment lines raw.
					$s = $s . $frame . "\n";
				} else {
					$s = $s . 'A[' . $k . ', ' . $i . '] <= ' . $frame . ";\n";
					$i++;
				}
			}

			return $s;
		}, (array)$map->animations, array_keys((array)$map->animations)));
	}

	// Generate .kll files
	$max_layer = 0;
	foreach ( $layers as $n => $layer ) {
		$out = implode("\n", array_map(function ($v, $k) {
			if ( preg_match("/^((CONS|SYS|#):)?(.+)/i", $v, $match) ) {
				if ( $match[2] == '#' ) {
					$v = $match[3];
				} else if ( $match[2] == 'CONS' or $match[2] == 'SYS' ) {
					$v = $match[2] . '"' . $match[3] . '"';
				} else {
					$v = 'U"' . $v . '"';
				}
			} else {
				$v = 'U"' . $v . '"';
			}

			return 'U"' . $k . '" : ' . $v . ';';

		}, $layer, array_keys($layer)));

		$triggersOut = "";
		if (isset($triggers[$n])) {
			$triggersOut = implode("\n", array_map(function($v, $k) {
				$s = "";

				foreach ($v as $t) {
					if ($s !== "") {
						$s = $s . "\n";
					}
					$s = $s . 'U"' .$k . '" :+ ' . $t->action . ';';
				}

				return  $s;
			}, $triggers[$n], array_keys($triggers[$n])));
		}

		$custom = "";
		if (isset($map->custom) && isset($map->custom->$n)) {
			$custom = "\n\n" . $map->custom->$n;
		}

		if ($n == 0) {
			$out = $header . "\n\n" . $defines . "\n\n" . $out . "\n\n" . $triggersOut . $custom . "\n\n" . $animations . "\n\n";
		} else {
			$out = $header . "\n\n" . $out . "\n\n" . $triggersOut . $custom . "\n\n";
		}
		$hashbaby .= $out;

		$files[$n] = $file = array('content' => $out, 'name' => $layout_name . '-' . $n . '.kll' );

		if ( $n > $max_layer ) {
			$max_layer = $n;
		}
	}

	$md5sum = md5( $hashbaby );
	$zip_path = './tmp';
	$zipfile = $zip_path . '/' . $layout_name . '-' . $md5sum . '.zip';

	// check if we already created the same zip file
	if ( file_exists($zipfile) ) {
		echo json_encode( array( 'success' => true, 'filename' => $zipfile ) );
		exit;
	}

	// Now that the layout files are ready, create directory for compilation object files
	$uid = uniqid(true);	// prevent compilation overlap on very close requests
	$objpath = $zip_path . '/' . $md5sum . $uid;
	mkdir( $objpath, 0700 );


	// Save the configuration json to the folder in order to import later
	$path = $objpath . '/' .$name . '-' . $layout . '.json';
	file_put_contents( $path, json_encode( $map, JSON_PRETTY_PRINT ) );


	// Run compilation, very simple, 1 layer per entry (script supports complicated entries)
	$log_file = $objpath . '/build.log';
	$cmd = 'cgi-bin/build_layout.bash ' . $md5sum . $uid . ' ' . $name . ' ';
	for ( $c = 0; $c <= $max_layer; $c++ ) {
		$path = $objpath . '/' . $files[$c]['name'];
		file_put_contents( $path, $files[$c]['content'] ); // Write kll file

		$cmd .= '"' . $files[$c]['name'] . '" ';
	}
	$cmd .= ' 2>&1';
	file_put_contents( $log_file , $cmd . "\n" ); // Reset the log file, with the specified command
	$handle = popen( $cmd, 'r' );
	while ( !feof( $handle ) ) {
		file_put_contents( $log_file, fgets( $handle ), FILE_APPEND );
	}
	$retval = pclose( $handle );


	// If failed mark the zip file with an _error
	$error_str = '';
	if ( $retval != 0 ) {
		$error_str = '_error';
	}


	// Always create the zip file (the date is always updated, which changes the binary)
	$zipfile = $zip_path . '/' . $layout_name . '-' . $md5sum . $uid . $error_str . '.zip';
	$zip = new ZipArchive;
	$zip->open( $zipfile, ZipArchive::CREATE );
	$kll_files  = glob( $objpath . "/*.kll", GLOB_NOCHECK );
	$bin_files  = glob( $objpath . "/*.dfu.bin", GLOB_NOCHECK );
	$log_files  = glob( $objpath . "/*.log", GLOB_NOCHECK );
	$hdr_files  = glob( $objpath . "/*.h", GLOB_NOCHECK );
	$json_files = glob( $objpath . "/*.json", GLOB_NOCHECK );

	// Add each of the files, flattening the dir hierarchy
	foreach ( array_merge( $kll_files, $bin_files, $json_files ) as $file ) {
		$zip->addFile( $file, basename( $file ) );
	}

	// Add each of the kll files to the kll directory
	foreach ( array_merge( $kll_files ) as $file ) {
		$zip->addFile( $file, "kll/" . basename( $file ) );
	}

	// Add the log/debug files to the log directory
	foreach ( array_merge( $hdr_files, $log_files ) as $file ) {
		$zip->addFile( $file, "log/" . basename( $file ) );
	}

	$zip->close();

	$newzip = $zip_path . '/' . $layout_name . '-' . $md5sum . $error_str . '.zip';

	// check if someone else compiled the same firmware at the same time
	if ( file_exists( $newzip ) ) {
		unlink( $zipfile );				// we lost the race, firmware already compiled, remove the unneeded zip
	} else {
		rename( $zipfile, $newzip );	// remove the session ID from the file name
	}

	// delete the working directory
	delTree($objpath);

	// Output zip file path
	echo json_encode( array( 'success' => true, 'filename' => $newzip ) );
	exit;
} catch(Exception $e) {
	http_response_code(400);
	echo json_encode( array( 'success' => false, 'error' => $e->getMessage()));
}

// delete directory recursively
function delTree ($dir) {
	$files = array_diff(scandir($dir), array('.','..'));
	foreach ($files as $file) {
		(is_dir("$dir/$file")) ? delTree("$dir/$file") : unlink("$dir/$file");
	}
	return rmdir($dir);
}

function logObject($x) {
	error_log(print_r($x, true));
}