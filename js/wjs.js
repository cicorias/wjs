/**
 * wJs v2.6.6
 *
 * Copyright Romain WEEGER 2010 / 2014
 * http://www.wexample.com
 * 
 * Licensed under the MIT and GPL licenses :
 * 
 *  - http://www.opensource.org/licenses/mit-license.php
 *  - http://www.gnu.org/licenses/gpl.html
 */
(function () {
  'use strict';
  // <--]
  
  // Protect against multiple declaration.
  // Only one instance of this object is created per page.
  // Contain global javascript tools and helpers functions.
  if (window.w !== undefined) {
    return;
  }

  var wjs_class = function () {
    // Create default vars.
    this.extend(true, this, this.defaults);
  };

  wjs_class.prototype = {
    defaults: {
      client_only: true,
      version: '2.6.6',
      core_loaders: [],
      ready_functions: [],
      is_ready: false,
      processes: [],
      default_package: null,
      loaders: {},
      loader_add_default: {},
      loaded: {},
      loading_process_parse_queue: {},
      transcode: null,
      methods: {},
      transcoded_data: {},
      constructors: {},
      xhr: null
    },

    /**
     * Create basics elements to interact with the document.
     * Must be executed when document is ready.
     */
    init: function (options) {
      this.document_ready(function () {
        // Apply options.
        this.extend(true, this, options);
        this.xhr = new window.XMLHttpRequest();
        // A transcode has been created for wjs, incorporate it.
        this.transcode = new (this.proto('wjs'))();
        var loader_name;
        // Create loaders prototypes.
        for (loader_name in this.loader_add_default) {
          if (this.loader_add_default.hasOwnProperty(loader_name)) {
            this.loader_add(loader_name, this.loader_add_default[loader_name], true);
          }
        }
        delete this.loader_add_default;
        // Load all other scripts then run ready functions.
        if (this.default_package !== null) {
          this.unpack(this.default_package, function () {
            // Execute startup functions.
            this.ready_complete();
          }.bind(this));
        }
      }.bind(this));
    },

    /**
     * Load specified collection of specified type / name.
     * @param {string} collection Type of collection.
     * @param {string} name Name of collection.
     * @param {function} complete Callback executed on loading complete.
     */
    load: function (collection, name, complete) {
      if (!this.collection(collection, name)) {
        this.loader(collection).load(name, complete);
      }
    },

    /**
     * Remove collection from memory.
     * @param {string} collection Type of collection.
     * @param {string} name Name of collection.
     * @param {function} complete Callback executed on loading complete.
     */
    unload: function (collection, name, complete) {
      if (this.collection(collection, name)) {
        this.loader(collection).unload(name, complete);
      }
    },

    /**
     * Because w must execute loading request on startup,
     * he needs his own ready function.
     * @param {function} callback Callback function executed on loading complete.
     */
    ready: function (callback) {
      if (this.is_ready === true) {
        callback();
      }
      else {
        this.ready_functions.push(callback);
      }
    },

    /**
     * Execute all "ready" functions.
     * Called by we_javascript_footer().
     */
    ready_complete: function () {
      var i;
      // Mark as is_ready, further ready functions
      // will be executed directly.
      this.is_ready = true;
      for (i in this.ready_functions) {
        if (this.ready_functions.hasOwnProperty(i)) {
          this.ready_functions[i]();
        }
      }
    },

    /**
     * Parse json data.
     * Used when data is not loaded by AJAX.
     * Basically as document startup.
     * @param {json} data
     * @param {function} complete Callback executed on loading complete.
     */
    unpack: function (data, complete) {
      this.load('json', data, complete);
    },

    /**
     * Return loader.
     * @param {string} name
     * @returns {*}
     */
    loader: function (name) {
      if (!this.loaders.hasOwnProperty(name)) {
        this.error('wjs : Try to get undefined loader "' + name + '"');
      }
      return this.loaders[name];
    },

    /**
     * Add new collection loader to wjs. It must be an
     * instance of wjs\\loader transcode.
     * @param {string} name
     * @param {object} methods
     * @param {boolean} init
     * @returns {*}
     */
    loader_add: function (name, methods, init) {
      // Wait for wjs init.
      if (this.is_ready === false && init !== true) {
        this.loader_add_default[name] = methods;
        return false;
      }
      if (!this.loaders.hasOwnProperty(name)) {
        var class_name = 'wjs\\loader\\' + name;
        // Allow to use short base name ex: javascript for wjs_loader_javascript.
        methods.base = methods.hasOwnProperty('base') ? 'wjs\\loader\\' + methods.base : 'wjs\\loader';
        // Add name to prototype.
        methods.name = name;
        this.extend_class(class_name, methods);
        this.loaders[name] = new (this.proto(class_name, class_name))(name);
        this.loaders[name].init();
      }
      return this.loaders[name];
    },

    /**
     * Set / Get data for specified collection.
     *
     * @param {string} type
     * @param {string} name
     * @param {object} data
     * @returns {*} Saved data for collection.
     */
    collection: function (type, name, data) {
      // Fill variable id data exist.
      if (data !== undefined) {
        this.loaded[type][name] = data;
      }
      // Return value if defined.
      return ((this.loaded.hasOwnProperty(type)) && (this.loaded[type].hasOwnProperty(name))) ? this.loaded[type][name] : false;
    },

    /**
     * Use a global parse queue to allow loaded scripts
     * to access to other ones, loaded before of after itself.
     * It prevent to reload script who are already loaded
     * but not parsed.
     * @param {object} data Returned data from server.
     * @param {function} process Instance of wjs\process.
     */
    process_parse_queue_add: function (data, process) {
      var collection,
        item;

      for (collection in data) {
        if (data.hasOwnProperty(collection)) {
          // Create object if missing.
          if (!this.loading_process_parse_queue.hasOwnProperty(collection)) {
            this.loading_process_parse_queue[collection] = {};
          }
          for (item in data[collection]) {
            if (data[collection].hasOwnProperty(item)) {
              this.loading_process_parse_queue[collection][item] = {value: data[collection][item], process: process};
            }
          }
        }
      }
    },

    /**
     * Check if queue of specified process is empty.
     * Completed processes with a non empty parse queue
     * will return an error, due to unknown data returned from server.
     * @param {function} process Instance of wjs\process.
     * @returns {boolean}
     */
    process_parse_queue_is_empty: function (process) {
      var i, j;
      for (i in this.loading_process_parse_queue) {
        if (this.loading_process_parse_queue.hasOwnProperty(i)) {
          for (j in this.loading_process_parse_queue[i]) {
            if (this.loading_process_parse_queue[i].hasOwnProperty(j) && this.loading_process_parse_queue[i][j].process === process) {
              return false;
            }
          }
        }
      }
      return true;
    },

    /**
     * Return parse queue item content.
     * @param {string} collection Collection name for parse queue.
     * @param {string} item Item name.
     * @returns {*}
     */
    process_parse_queue_get: function (collection, item) {
      if ((this.loading_process_parse_queue.hasOwnProperty(collection)) && (this.loading_process_parse_queue[collection].hasOwnProperty(item))) {
        return this.loading_process_parse_queue[collection][item];
      }
      return false;
    },

    /**
     * Remove loaded script from parse queue.
     * @param {string} collection
     * @param item
     */
    process_parse_queue_remove: function (collection, item) {
      if (this.loading_process_parse_queue.hasOwnProperty(collection)) {
        delete this.loading_process_parse_queue[collection][item];
        // Cleanup object.
        if (this.object_size(this.loading_process_parse_queue[collection]) === 0) {
          delete this.loading_process_parse_queue[collection];
        }
      }
    },

    /**
     * Trigger custom event for dom element.
     * @param {string} name
     * @param {object} dom_element
     */
    event: function (name, dom_element) {
      var event;
      // Check browser support.
      if (window.document.createEvent) {
        event = window.document.createEvent("HTMLEvents");
        event.initEvent(name, true, true);
      }
      else {
        event = window.document.createEventObject();
        event.eventType = name;
      }

      event.eventName = name;

      if (window.document.createEvent) {
        dom_element.dispatchEvent(event);
      }
      else {
        dom_element.fireEvent("on" + event.eventType, event);
      }
    },

    /**
     * Convert user passed options to object. Useful when
     * function parameters could be : callback OR {complete:callback}
     * @param {object} options
     * @param {object} extra
     * @returns {*|{}}
     */
    extend_options: function (options, extra) {
      // If options is a function, this is the "complete" callback.
      if (typeof options === 'function') {
        options = {
          complete: options
        };
      }
      // If extra is a function turn it to an object.
      if (typeof extra === 'function') {
        extra = {
          complete: extra
        };
      }
      return this.extend(options, extra);
    },

    /**
     * Create url needed for scripts loading.
     * Used internally to build URL requests for
     * collections loading.
     *
     * @param {string} path
     * @param {object} settings
     * @returns {string}
     */
    url: function (path, settings) {
      // If file or absolute url specified.
      if (settings !== undefined && (settings.hasOwnProperty('absolute') && settings.absolute === true)) {
        path = window.location.origin + '/' + path;
      }
      // Return non absolute url for a file.
      return path + ((settings !== undefined && settings.hasOwnProperty('query')) ? '?' + this.param(settings.query) : '');
    },

    /**
     * Remove item from array.
     *
     * @param {Array} array
     * @param {*} item
     * @returns {*}
     */
    array_delete: function (array, item) {
      return this.array_delete_index(array, array.indexOf(item));
    },

    /**
     * Remove item having this index from array.
     *
     * @param {Array} array
     * @param {number} index
     * @returns {Array}
     */
    array_delete_index: function (array, index) {
      if (index !== -1) {
        array.splice(index, 1);
      }
      return array;
    },

    /**
     * Changes index of an item into an array.
     *
     * @param {Array} array
     * @param {number} index_from
     * @param {number} index_to
     * @returns {Array}
     */
    array_move: function (array, index_from, index_to) {
      array.splice(index_to, 0, array.splice(index_from, 1)[0]);
      return array;
    },

    /**
     * Simple AJAX request
     * @param {object} options Contain various ajax options.
     */
    ajax: function (options) {
      options.method = (options.hasOwnProperty('method')) ? options.method : 'GET';
      options.async = (options.hasOwnProperty('async')) ? options.async : false;

      var ajax_request = new window.XMLHttpRequest();
      ajax_request.open(options.method, options.url, options.async);
      ajax_request.onreadystatechange = function () {
        // Success.
        if (ajax_request.readyState === 4 && ajax_request.status === 200) {
          // Callback function specified.
          if (options.hasOwnProperty('success') && typeof options.success === 'function') {
            options.success(ajax_request);
          }
        }
        else if (options.hasOwnProperty('error') && typeof options.error === 'function') {
          options.error(ajax_request);
        }
      };
      if (options.method === 'POST') {
        ajax_request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      }
      ajax_request.send(this.param(options.data));
    },

    /**
     * Transform object to URL query string.
     * @param {object} object Query data in format {name:"value"}.
     * @returns {string}
     */
    param: function (object) {
      var i, query = [];
      for (i in object) {
        if (object.hasOwnProperty(i)) {
          query.push(i + '=' + object[i]);
        }
      }
      return query.join('&');
    },

    /**
     * Return length of object.
     * @param object
     * @returns {number}
     */
    object_size: function (object) {
      var size = 0, key;
      for (key in object) {
        if (object.hasOwnProperty(key)) {
          size += 1;
        }
      }
      return size;
    },

    /**
     * Find data into an object using string path
     * like : "my.needle.name" into "haystack"
     * @param path
     * @param object object
     * @param {object} result Optional extra information about place who parameter was found.
     * @returns {*}
     */
    object_find: function (path, object, result) {
      var base = object, item;
      path = path.split('.');
      while (path.length > 0) {
        item = path.shift();
        if (base.hasOwnProperty(item)) {
          // We are on the last item.
          if (path.length === 0) {
            if (typeof result === 'object') {
              result.key = item;
              result.container = base;
            }
            return base[item];
          }
          base = base[item];
        }
      }
      return false;
    },

    /**
     * Remove variable of given object, using an object path.
     * @param {string} path
     * @param {object} object
     */
    object_cleanup: function (path, object) {
      if (this.object_size(this.object_find(path, object)) === 0) {
        // Use indirect eval for code inspectors.
        var eval_callback = eval;
        // We need to pass reference to this into eval.
        window.object_cleanup_temp = object;
        // Use eval to access variable to delete.
        eval_callback('delete window.object_cleanup_temp.' + path + ';');
        // Delete reference.
        delete window.object_cleanup_temp;
      }
    },

    /**
     * Replace all occurrences of a string.
     *
     * @param {string} find Needle
     * @param {string} replace Replacement
     * @param {string} string Haystack
     * @returns {string}
     */
    replace_all: function (find, replace, string) {
      return string.replace(new RegExp(find, 'g'), replace);
    },

    /**
     * This is a quasi clone of jQuery's extend() function.
     * @returns {*|{}}
     */
    extend: function () {
      // Make a copy of arguments to avoid JS inspector hints.
      var to_add, name, copy_is_array, clone,
      // The target object who receive parameters
      // form other objects.
        target = arguments[0] || {},
      // Index of first argument to mix to target.
        i = 1,
      // Mix target with all function arguments.
        length = arguments.length,
      // Define if we merge object recursively.
        deep = false;

      // Handle a deep copy situation.
      if (typeof target === 'boolean') {
        deep = target;
        // Skip the boolean and the target.
        target = arguments[ i ] || {};
        // Use next object as first added.
        i += 1;
      }

      // Handle case when target is a string or something (possible in deep copy)
      if (typeof target !== 'object' && typeof target !== 'function') {
        target = {};
      }

      // Loop trough arguments.
      for (false; i < length; i += 1) {
        // Only deal with non-null/undefined values
        if ((to_add = arguments[ i ]) !== null) {
          // Extend the base object.
          for (name in to_add) {
            // We do not wrap for loop into hasOwnProperty,
            // to access to all values of object.
            // Prevent never-ending loop.
            if (target === to_add[name]) {
              continue;
            }
            // Recurse if we're merging plain objects or arrays.
            if (deep && to_add[name] && (this.is_plain_object(to_add[name]) || (copy_is_array = Array.isArray(to_add[name])))) {
              if (copy_is_array) {
                copy_is_array = false;
                clone = target[name] && Array.isArray(target[name]) ? target[name] : [];
              }
              else {
                clone = target[name] && this.is_plain_object(target[name]) ? target[name] : {};
              }
              // Never move original objects, clone them.
              target[name] = this.extend(deep, clone, to_add[name]);
            }
            // Don't bring in undefined values.
            else if (to_add[name] !== undefined) {
              target[name] = to_add[name];
            }
          }
        }
      }
      return target;
    },

    /**
     * Check to see if an object is a plain object
     * (created using "{}" or "new Object").
     * Forked from jQuery.
     * @param obj
     * @returns {boolean}
     */
    is_plain_object: function (obj) {
      // Not plain objects:
      // - Any object or value whose internal [[Class]] property is not "[object Object]"
      // - DOM nodes
      // - window
      if (obj === null || typeof obj !== "object" || obj.nodeType || (obj !== null && obj === obj.window)) {
        return false;
      }
      // Support: Firefox <20
      // The try/catch suppresses exceptions thrown when attempting to access
      // the "constructor" property of certain host objects, ie. |window.location|
      // https://bugzilla.mozilla.org/show_bug.cgi?id=814622
      try {
        if (obj.constructor && !this.hasOwnProperty.call(obj.constructor.prototype, "isPrototypeOf")) {
          return false;
        }
      } catch (e) {
        return false;
      }
      // If the function hasn't returned already, we're confident that
      // |obj| is a plain object, created by {} or constructed with new Object
      return true;
    },

    /**
     * Returns true if it is a DOM node.
     * Found at {@link http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object}
     * @param {*} object
     * @returns {boolean}
     */
    is_dom_node: function (object) {
      return (
        typeof window.Node === "object" ? object instanceof window.Node :
          object && typeof object === "object" && typeof object.nodeType === "number" && typeof object.nodeName === "string"
        );
    },

    /**
     * Returns true if it is a DOM element.
     * Found at {@link http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object}
     * @param {*} object
     * @returns {boolean}
     */
    is_dom_element: function (object) {
      return (
        typeof window.HTMLElement === "object" ? object instanceof window.HTMLElement : // DOM2
          object && typeof object === "object" && object !== null && object.nodeType === 1 && typeof object.nodeName === "string"
        );
    },

    /**
     * Call super method of the given object and method.
     * This function create a temporary variable called "_call_base_reference",
     * to inspect whole inheritance linage. It will be deleted at the end of inspection.
     *
     * Usage : Inside your method use call_base(this, 'method_name', arguments);
     *
     * @param {object} object The owner object of the method and inheritance linage
     * @param {string} method The name of the super method to find.
     * @param {object} args The calls arguments, basically use the "arguments" special variable.
     * @returns {*} The data returned from the super method.
     */
    call_base: function (object, method, args) {
      // We get base object, first time it will be passed object,
      // but in case of multiple inheritance, it will be instance of parent objects.
      var base = object.hasOwnProperty('_call_base_reference') ? object._call_base_reference : object,
      // We get matching method, from current object,
      // this is a reference to define super method.
        object_current_method = base[method],
      // Temp object wo receive method definition.
        descriptor = null,
      // We define super function after founding current position.
        is_super = false,
      // Contain output data.
        output = null;
      // Iterates over the base prototypes chain.
      while (base !== null) {
        // Get method info
        descriptor = Object.getOwnPropertyDescriptor(base, method);
        if (descriptor !== undefined) {
          // We search for current object method to define inherited part of chain.
          if (descriptor.value === object_current_method) {
            // Further loops will be considered as inherited function.
            is_super = true;
          }
          // We already have found current object method.
          else if (is_super === true) {
            // We need to pass original object to apply() as first argument,
            // this allow to keep original instance definition along all method
            // inheritance. But we also need to save reference to "base" who
            // contain parent class, it will be used into this function startup
            // to begin at the right chain position.
            object._call_base_reference = base;
            // Apply super method.
            output = descriptor.value.apply(object, args);
            // Property have been used into super function if another
            // call_base() is launched. Reference is not useful anymore.
            delete object._call_base_reference;
            // Job is done.
            return output;
          }
        }
        // Iterate to the next parent inherited.
        base = Object.getPrototypeOf(base);
      }
    },

    /**
     * Merge variable from base to this instance type.
     * Non deep merge.
     * @param object
     * @param variable
     * @returns {{}}
     */
    inherit_object: function (object, variable) {
      var output = {},
      // Get list of variable in different states levels.
        variables = this.inherit_get_property(object, variable),
        i;
      // Merge variables.
      for (i in variables) {
        if (variables.hasOwnProperty(i)) {
          this.extend(output, variables[i]);
        }
      }
      return output;
    },

    /**
     * Get linage of a specified property from an inherited object.
     * @param object
     * @param property
     * @returns {Array}
     */
    inherit_get_property: function (object, property) {
      var base = Object.getPrototypeOf(object),
        output = [];
      // Use hasOwnProperty to define if we are out of
      // inherited objects.
      while (base !== null) {
        // Take only variable present in current prototype.
        if (base.hasOwnProperty(property)) {
          output.push(base[property]);
        }
        base = Object.getPrototypeOf(base);
      }
      return output.reverse();
    },

    /**
     * Copy data from add to result, and
     * add make inheritance for functions.
     * Other properties types are non deep extended.
     * @param {object} result Object to extend.
     * @param {object} add Object to add to result.
     */
    inherit_prototype: function (result, add) {
      var i, is_array;
      for (i in add) {
        if (add.hasOwnProperty(i)) {
          // Functions has a special case.
          if (typeof add[i] === 'function') {
            result[i] = this.inherit_function(result, result[i], add[i]);
          }
          else if (this.is_plain_object(add[i]) || (is_array = Array.isArray(add[i]))) {
            // Make a clone of object or array.
            result[i] = is_array ? [] : {};
            // Create a non-deep copy.
            this.extend(result[i], add[i]);
          }
          // Other variables are copied.
          else {
            result[i] = add[i];
          }
        }
      }
    },

    /**
     * Create all super method for specified object's method,
     * based on prototype creation linage.
     * @param {object} object Instance of object containing method.
     * @param {string} method Method name as Object.methodName.
     */
    inherit_method: function (object, method) {
      var i, linage = this.inherit_get_property(object, method);
      // Get first version as base.
      object[method] = linage.shift();
      while (i = linage.shift()) {
        // Adds all previous version as a base method (super method).
        object[method] = this.inherit_function(object, object[method], i);
      }
    },

    /**
     * Create a super method for first function, pointing to
     * the second function with a __base() call.
     * @param object
     * @param base
     * @param add
     * @returns {}
     */
    inherit_function: function (object, base, add) {
      // Base method is called with __base() function.
      return function (method, base_method) {
        return function () {
          if (this === undefined) {
            this.error('Call inherit function from undefined object : ' + method);
          }
          var baseSaved = this.__base,
            result;
          this.__base = (typeof base_method === 'function') ? base_method : function () {
          };
          result = method.apply(this, arguments);
          this.__base = baseSaved;
          return result;
        }.bind(this);
      }.apply(object, [add, base]);
    },

    /**
     * Merge variable from base to current instance type.
     * Create inheritance for functions.
     *
     * @param {object} object
     * @param {string} name
     */
    inherit_package: function (object, name) {
      var variables = this.inherit_get_property(object, name),
        i;
      // Reset package.
      object[name] = {};
      // Merge inherited packages.
      for (i in variables) {
        if (variables.hasOwnProperty(i)) {
          // Create base constructor for functions.
          this._inherit_package(object, object[name], variables[i]);
        }
      }
    },

    /**
     * Inspect package tree to merge content.
     * @param {object} object
     * @param {object} result
     * @param {object} add
     * @private
     */
    _inherit_package: function (object, result, add) {
      var i;
      for (i in add) {
        if (add.hasOwnProperty(i)) {
          if (typeof add[i] === 'function') {
            // We don't use inherit_method, we already got list of
            // inherited property into the main inherit_package method.
            result[i] = this.inherit_function(object, result[i], add[i]);
          }
          // Escape some objects to avoid recursions.
          else if (this.is_plain_object(add[i])) {
            if (!result.hasOwnProperty(i)) {
              result[i] = {};
            }
            // Continue to search for other functions.
            this._inherit_package(object, result[i], add[i]);
          }
          else if (Array.isArray(add[i])) {
            result[i] = [];
            this.extend(result[i], add[i]);
          }
          else {
            result[i] = add[i];
          }
        }
      }
    },

    /**
     * Add definitions to an existing constructor.
     * @param {string} name
     * @param {object} methods
     */
    extend_class: function (name, methods) {
      if (this.methods.hasOwnProperty(name)) {
        this.extend(this.methods[name], methods);
      }
      else {
        this.methods[name] = methods;
      }
    },

    /**
     * Return a new instance of required transcode item.
     * @param {string} name Transcode class name.
     * @returns {object} Transcode prototype ready to be instantiated with "new".
     */
    proto: function (name) {
      // Base object is created once.
      if (!this.constructors.hasOwnProperty(name)) {
        // It may have base constructor send from transcoded data.
        var parent = 'wjs\\transcode',
          base;
        // Maybe a parent is specified into transcoded data.
        parent = this.transcoded_data.hasOwnProperty(name) ? this.transcoded_data[name].__PARENT__ : parent;
        if (parent === name) {
          this.error('Unable to find base constructor for ' + name + ' : ' + parent);
        }
        // Or is specified into prototype.
        parent = this.methods.hasOwnProperty(name) && this.methods[name].hasOwnProperty('base') ? this.methods[name].base : parent;
        base = this.proto(parent);
        // Create base object.
        this.constructors[name] = function () {
          return this.__construct.apply(this, arguments);
        };
        // Append base constructor.
        this.constructors[name].prototype = Object.create(base.prototype);
        // Adjust constructor to make instanceof works.
        this.constructors[name].prototype.constructor = base;
        this.constructors[name].prototype.transcode_class_name = name;
        this.constructors[name].prototype.w = this;
      }
      // Add extra method at each pass, in case of
      // prototype have been extended after first
      // constrictor creation.
      if (this.methods.hasOwnProperty(name)) {
        this.extend(this.constructors[name].prototype, this.methods[name]);
      }
      return this.constructors[name];
    },

    /**
     * Thrown wjs specific error.
     * @param {string} message
     */
    error: function (message) {
      throw new Error('[wjs error] : ' + message);
    },

    /**
     * Append function to execute when document is ready.
     * Only one function is supported. This function is used
     * internally for init function. To add callbacks to wjs,
     * use w.ready() function instead.
     * @param {function} fn Anonymous function callback.
     */
    document_ready: function (fn) {
      var done = false, top = true,
        doc = window.document, root = doc.documentElement,
        add = doc.addEventListener ? 'addEventListener' : 'attachEvent',
        rem = doc.addEventListener ? 'removeEventListener' : 'detachEvent',
        pre = doc.addEventListener ? '' : 'on',

        init = function (e) {
          if (e.type === 'readystatechange' && doc.readyState !== 'complete') {
            return;
          }
          (e.type === 'load' ? window : doc)[rem](pre + e.type, init, false);
          if (!done && (done = true) !== false) {
            fn.call(window, e.type || e);
          }
        },

        poll = function () {
          try {
            root.doScroll('left');
          } catch (e) {
            window.setTimeout(poll, 50);
            return;
          }
          init('poll');
        };

      if (doc.readyState === 'complete') {
        fn.call(window, 'lazy');
      }
      else {
        if (doc.createEventObject && root.doScroll) {
          try {
            top = !window.frameElement;
          }
          catch (e) {
          }
          if (top) {
            poll();
          }
        }
        doc[add](pre + 'DOMContentLoaded', init, false);
        doc[add](pre + 'readystatechange', init, false);
        window[add](pre + 'load', init, false);
      }
    }
  };
  // Create global instance.
  window.w = new wjs_class();
  // [-->
}());
