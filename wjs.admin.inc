<?php
/**
 * @file
 * Contain global helpers functions for wjs support.
 */

/**
 * Create and return the single global instance of wjs.
 * @return \Wjs
 */
function wjs_wjs() {
  static $wjs;
  if (!$wjs) {
    $path = libraries_get_path('wjs') . '/';
    require_once $path . 'wjs.inc';
    // Create wjs global instance.
    $wjs = wjs_wjs_instance();
    // Apply settings.
    $settings = wjs_settings();
    foreach ($settings as $name => $desc) {
      $wjs->settings[$name] = variable_get('wjs_setting_' . $name, $wjs->settings[$name]);
    }
    // Activate lazy tags detection.
    if (variable_get('wjs_lazy_tags_enable', TRUE)) {
      // Import class.
      $wjs->import('JsClassStatic', 'lazyTagsLoad');
      // Enable extensions auto destruction.
      $wjs->settings['lazyTagsLoadAutoDestroy'] = variable_get('wjs_lazy_tags_destroy', TRUE);
    }
  }
  return $wjs;
}

/**
 * Create and return a new default instance of wjs.
 * @return \Wjs
 */
function wjs_wjs_instance() {
  // Path to library.
  $path = libraries_get_path('wjs') . '/';
  // New instance.
  return new \Wjs(array(
    'server' => array(
      // Server side path to wjs.
      'wjs' => $path,
    ),
    'client' => array(
      // Path for AJAX requests.
      'responsePath' => base_path() . wjs_response_path(),
      // Required to identify loaders path.
      'wjs'          => base_path() . $path,
    ),
  ), 'source');
}

/**
 * Define configurable settings manually.
 * @return array
 */
function wjs_settings() {
  return array(
    'paramExtra' => 'Extra query strings to add to AJAX queries like "&name=value".',
    'paramInc'   => 'Name of query parameter defining extensions to retrieve. Use it in case of conflict with another $_GET parameter name.',
    'paramExc'   => 'Name of query parameter defining extensions to exclude from dependencies. Use it in case of conflict with another $_GET parameter name.',
    'paramToken' => 'Extra query string, mainly used to enforce cached files refreshing.',
  );
}

/**
 * Return saved response path.
 * @return mixed
 */
function wjs_response_path() {
  return variable_get('wjs_response_path', 'wjs');
}

/**
 * Define configurable settings.
 * @return array
 */
function wjs_admin_settings() {
  $form = array();

  $wjs                  = wjs_wjs();
  $wjs_enable           = variable_get('wjs_enable', TRUE);
  $wjs_lazy_tags_enable = variable_get('wjs_lazy_tags_enable', TRUE);

  $form['wjs_enable'] = array(
    '#title'         => t('Enable wjs integration'),
    '#description'   => t('Wjs javascript object will be inserted into all you pages.'),
    '#type'          => 'checkbox',
    '#default_value' => $wjs_enable
  );

  $form['wjs_response_path'] = array(
    '#title'         => t('Wjs response path'),
    '#description'   => t('Path used by wjs for AJAX requests. Enter path relative to site root url. Use it in case of conflict with another menu path.'),
    '#type'          => 'textfield',
    '#default_value' => wjs_response_path(),
    '#disabled'      => !$wjs_enable
  );

  $wjs_settings = wjs_settings();

  // Wjs settings
  foreach ($wjs_settings as $name => $desc) {
    $variable_name        = 'wjs_setting_' . $name;
    $form[$variable_name] = array(
      '#title'         => t('Wjs setting : ' . $name),
      '#description'   => t($desc),
      '#type'          => 'textfield',
      '#default_value' => variable_get($variable_name, $wjs->settings[$name]),
      '#disabled'      => !$wjs_enable
    );
  }

  $form['wjs_lazy_tags_enable'] = array(
    '#title'         => t('Enable wjs lazy tags detection'),
    '#description'   => t('Wjs will detect html element built like : &lt;div data-wjs="ExtType:ExtName"&gt;...&lt;/div&gt;, and fill it we appear on the screen.'),
    '#type'          => 'checkbox',
    '#default_value' => $wjs_lazy_tags_enable,
    '#disabled'      => !$wjs_enable
  );

  $form['wjs_lazy_tags_destroy'] = array(
    '#title'         => t('Enable wjs lazy tags destruction'),
    '#description'   => t('Loaded lazy tags type will be removed from memory once out from screen'),
    '#type'          => 'checkbox',
    '#default_value' => variable_get('wjs_lazy_tags_destroy', TRUE),
    '#disabled'      => !($wjs_enable && $wjs_lazy_tags_enable)
  );

  // Build form.
  $form = system_settings_form($form);
  // Add a submit callback before saving
  // in order to parse variables and fill defaults.
  array_unshift($form['#submit'], 'wjs_admin_settings_submit');
  // Add a submit callback after saving
  // to rebuild menu in needed.
  $form['#submit'][] = 'wjs_admin_settings_submit_flush';

  return $form;
}

/**
 * Manage settings submission.
 *
 * @param $form
 * @param $form_state
 */
function wjs_admin_settings_submit($form, &$form_state) {

  if (!trim($form_state['values']['wjs_response_path'])) {
    $form_state['values']['wjs_response_path'] = 'wjs';
  }

  $wjs_default  = wjs_wjs_instance();
  $wjs_settings = wjs_settings();

  // Wjs settings.
  foreach ($wjs_settings as $name => $desc) {
    $variable_name = 'wjs_setting_' . $name;
    if (!trim($form_state['values'][$variable_name])) {
      $form_state['values'][$variable_name] = $wjs_default->settings[$name];
    }
  }
}

/**
 * Rebuild menu caches.
 *
 * @param $form
 * @param $form_state
 */
function wjs_admin_settings_submit_flush($form, &$form_state) {
  // We need to rebuild menu cache.
  drupal_flush_all_caches();
}
