<?php
$directory = './layouts/*.json';

$files = glob($directory);
$keyboards = [];

foreach ($files as $layout) {
    $layout = basename($layout, '.json');

    list($keyboard, $variant) = explode('-', $layout, 2);

    $keyboards[$keyboard][] = $variant;
}

$out = json_encode($keyboards);
echo $out;
exit;