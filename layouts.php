<?php

$keyboards = [];

$keyboards['K-Type'][] = 'Standard';

$keyboards['MD1.1'][] = 'Alphabet';
$keyboards['MD1.1'][] = 'AlphabetBlank';
$keyboards['MD1.1'][] = 'Hacker';
$keyboards['MD1.1'][] = 'HackerBlank';
$keyboards['MD1.1'][] = 'Standard';
$keyboards['MD1.1'][] = 'StandardBlank';

$keyboards['MD1'][] = 'Hacker';
$keyboards['MD1'][] = 'HackerBlank';
$keyboards['MD1'][] = 'Standard';
$keyboards['MD1'][] = 'StandardBlank';

$keyboards['MDErgo1'][] = 'Blank';
$keyboards['MDErgo1'][] = 'Default';

$keyboards['WhiteFox'][] = 'Aria';
$keyboards['WhiteFox'][] = 'Iso';
$keyboards['WhiteFox'][] = 'JackofAllTrades';
$keyboards['WhiteFox'][] = 'TheTrueFox';
$keyboards['WhiteFox'][] = 'Vanilla';
$keyboards['WhiteFox'][] = 'Winkeyless';

// TODO Hardcoding until a better solution for duplicates exists.

//$directory = './layouts/*.json';
//
//$files = glob($directory);

//foreach ($files as $layout) {
//    $layout = basename($layout, '.json');
//
//    list($keyboard, $variant) = explode('-', $layout, 2);
//
//    $keyboards[$keyboard][] = $variant;
//}

$out = json_encode($keyboards);
echo $out;
exit;