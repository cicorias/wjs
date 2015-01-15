<?php
/**
 * @file Callbacks for pages used by wjs.
 */

/**
 * Return ajax callback.
 */
function _wjs_response_callback() {
  // Get global wjs instance.
  $wjs = wjs_wjs();
  // Extract request from response.
  $wjs->response($_GET);
}