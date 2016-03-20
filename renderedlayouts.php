<?php
$directory = './layouts/*.json';
// Check the query string for the layout parameter, if none exists default to 'KType-Blank'
$specified_layout = !empty($_GET['layout']) ? $_GET['layout'] : 'KType-Blank'; // default to KType-Blank

$files = glob($directory);
$old_keyboard = '';
$out = '<span id="active-layout-title">' . str_replace('-', ' ', $specified_layout) . '</span><ul>' . "\n";

foreach ($files as $layout) {
    $layout = basename($layout, '.json');

    list($keyboard, $variant) = explode('-', $layout, 2);

    if ( $keyboard !== $old_keyboard ) {
        if ( $old_keyboard !== '' ) {
            $out .= '</ul></li>' . "\n";
        }

        $out .= '<li>' . "\n";
        $out .= '<a href="#" onclick="return false">' . htmlspecialchars($keyboard) . '</a>' . "\n";
        $out .= '<ul>' . "\n";

        $old_keyboard = $keyboard;
    }

    $selected = strcasecmp( $specified_layout, $layout ) == 0 ? ' class="selected" ' : '';
    $out .= '<li' . $selected . ' data-layout="' . htmlspecialchars($layout) . '"><a href="?layout=' . urlencode($layout) . '">' . htmlspecialchars($variant) . '</a></li>' . "\n";
}

$out .= '</ul></li></ul>';
echo $out;
exit;