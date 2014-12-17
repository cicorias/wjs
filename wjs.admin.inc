<?php
/**
 * @file
 * Contain global helpers functions for wjs support.
 */

/**
 * Create and return the single global instance of wjs.
 */
function wjs_wjs() {
  static $wjs;
  if (!$wjs) {
    $path = libraries_get_path('wjs') . '/';
    require_once $path . 'wjs.inc';
    /* @var \Wjs */
    $wjs = new \Wjs(array(
      'server' => array(
        'wjs' => $path,
      ),
      'client' => array(
        // Path for AJAX requests.
        'responsePath' => base_path() . '/wjs',
        // Required to identify loaders path.
        'wjs'          => base_path() . $path,
      ),
    ), 'source');
  }
  return $wjs;
}
