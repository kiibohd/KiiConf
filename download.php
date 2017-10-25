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

	$raw = file_get_contents("php://input");
	$decoded = @json_decode($raw);

	if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
		throw new Exception('Invalid JSON, unable to parse.');
	}
	$config = $decoded->config;
	// Default to latest unless we're told to flip to lts
	$is_lts = ($decoded->env === "lts");

	// LTS will disable: Trigger & Animations, and will re-write LED controls

	$name = !empty( $config->header->Name ) ? preg_replace('/[^a-z0-9._]/i', '', str_replace(' ', '_', $config->header->Name)) : '';
	$layout = !empty( $config->header->Layout ) ? preg_replace('/[^a-z0-9._]/i', '', str_replace(' ', '_', $config->header->Layout)) : '';
	$base_layout = !empty( $config->header->Base ) ? preg_replace('/[^a-z0-9._]/i', '', str_replace(' ', '_', $config->header->Base)) : '';

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

		// Between LTS and Latest the scancode mapping for White Fox changed. Previously
		//  there was a single all encompassing map, now there are a number of smaller
		//  ones that have different (sensible) default scancode mappings. This causes
		//  a little bit of havok due to the way layering works, we override what was
		//  previously there, we'll look for a special `.lts.json` file here.
		$lts_base_name = './layouts/' . $name . '-' . $base_layout . 'lts.json';
		$default = json_decode(file_get_contents($lts_base_name))->matrix;

		foreach ( $config->matrix as $i => $key ) {
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
				if (!$is_lts && isset($key->triggers)) {
					foreach ($key->triggers as $t => $trigger) {
						$triggers[$t][$default[$idxInDef]->layers->{0}->key] = $trigger;
					}
				}
			}
		}
	}
	else {
		foreach ( $config->matrix as $i => $key ) {
			// Process "layer" entries
			foreach ( $key->layers as $l => $layer ) {
				$layers[$l][$default[$i]->layers->{0}->key] = $layer->key;
			}

			// Process "trigger" entries
			if (!$is_lts && isset($key->triggers)) {
				foreach ($key->triggers as $t => $trigger) {
					$triggers[$t][$default[$i]->layers->{0}->key] = $trigger;
				}
			}
		}
	}

	$header = implode("\n", array_map(function ($v, $k) { return $k . ' = "' . $v . '";'; }, (array)$config->header, array_keys((array)$config->header)));
	$defines = implode("\n", array_map(function ($v) { return $v->name . ' = "' . $v->value . '";' . "\n"; }, (array)$config->defines));

	$files = array();
	$file_args = array();
	$controller_ver = json_decode(file_get_contents('./stats.json'));
	if ( $controller_ver !== '' ) {
		$controller_ver = $controller_ver->controller->gitrev . $controller_ver->kll->gitrev;
	}
	$hashbaby = $name . $layout . $controller_ver; // Set name of base, layout and controller version here as an md5 seed
	$layout_name = $name . '-' . $layout;

	$animations = '';
	if ( !$is_lts && isset($config->animations) ) {
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
		}, (array)$config->animations, array_keys((array)$config->animations)));
	}

	// Generate .kll files
	$max_layer = 0;
	foreach ( $layers as $n => $layer ) {
		$out = implode("\n", array_map(function ($v, $k) use ($is_lts) {
			$comment_out = false;
			if ( preg_match("/^((CONS|SYS|#):)?(.+)/i", $v, $match) ) {
				if ( $match[2] == '#' ) {
					if ($is_lts && strpos($match[3], 'ledControl') !== false) {
						switch (str_replace(' ', '', $match[3])) {
							case 'ledControl(0,15)': // LED-
								$v = 'ledControl( 3, 15, 0 )';
								break;
							case 'ledControl(1,15)': // LED+
								$v = 'ledControl( 4, 15, 0 )';
								break;
							case 'ledControl(3,0)':  // LED OFF
								$v = 'ledControl( 5, 0, 0)';
								break;
							default:
								$comment_out = true;
						}
					} elseif ($is_lts && strpos($match[3], 'animation_control') !== false) {
						$comment_out = true;
					} else {
						$v = $match[3];
					}
				} else if ( $match[2] == 'CONS' or $match[2] == 'SYS' ) {
					$v = $match[2] . '"' . $match[3] . '"';
				} else {
					$v = 'U"' . $v . '"';
				}
			} else {
				$v = 'U"' . $v . '"';
			}

			return ($comment_out ? '#' : '') . 'U"' . $k . '" : ' . $v . ';';

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
		if (isset($config->custom) && isset($config->custom->$n)) {
			$custom = "\n\n" . $config->custom->$n;
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

	// LTS and Latest paths are separated.
	$tmp_path = $is_lts ? './tmp-lts' : './tmp';
	$build_script = $is_lts ? 'cgi-bin/build_layout_lts.bash' : 'cgi-bin/build_layout.bash';

	$md5sum = md5( $hashbaby );
	$zipfile = $tmp_path . '/' . $layout_name . '-' . $md5sum . '.zip';

	// check if we already created the same zip file
	if ( file_exists($zipfile) ) {
		echo json_encode( array( 'success' => true, 'filename' => $zipfile ) );
		exit;
	}

	// Now that the layout files are ready, create directory for compilation object files
	$uid = uniqid(true);	// prevent compilation overlap on very close requests
	$objpath = $tmp_path . '/' . $md5sum . $uid;
	mkdir( $objpath, 0700 );


	// Save the configuration json to the folder in order to import later
	$path = $objpath . '/' .$name . '-' . $layout . '.json';
	file_put_contents( $path, json_encode( $config, JSON_PRETTY_PRINT ) );


	// Run compilation, very simple, 1 layer per entry (script supports complicated entries)
	$log_file = $objpath . '/build.log';
	$cmd = $build_script . ' ' . $md5sum . $uid . ' ' . $name . ' ';
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
	$zipfile = $tmp_path . '/' . $layout_name . '-' . $md5sum . $uid . $error_str . '.zip';
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

	$newzip = $tmp_path . '/' . $layout_name . '-' . $md5sum . $error_str . '.zip';

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