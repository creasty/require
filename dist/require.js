/*!
 * require - v2.0.0 (2013-04-03)
 *
 * @author creasty
 * @url http://github.com/creasty/require
 * @copyright 2013 creasty
 */
(function() {
  'use strict';

  var $, $head, FullPackages, MILLISEC_DAY, Require, cache, config, defQueue, defQueueId, define, document, exports, fileHasDefine, fired, loader, localStorage, require, undef, utils, window,
    __slice = [].slice;

  $ = jQuery;

  window = this;

  document = window.document;

  localStorage = window.localStorage;

  $head = $('head');

  defQueue = [];

  defQueueId = 0;

  fileHasDefine = /\bdefine\s*\(/;

  MILLISEC_DAY = 86400000;

  config = {
    prefix: 'require-',
    base: './',
    paths: {},
    modules: {},
    injectors: {},
    alts: [],
    maps: [],
    cache: true,
    debug: false,
    override: false,
    expiration: 30,
    interval: 10,
    timeout: 6000
  };

  utils = {
    replace: function(text, pattern, to) {
      if (typeof pattern === 'string') {
        return text.split(pattern).join(to);
      } else {
        return text.replace(pattern, to);
      }
    },
    doAlts: function(name) {
      var r, type, _i, _len, _ref;
      type = this.getPackageType(name);
      _ref = config.alts;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        r = _ref[_i];
        if (!r.type || r.type === type) {
          name = this.replace(name, r.pattern, r.to);
        }
      }
      return name;
    },
    doMaps: function(uri) {
      var path, r, _i, _len, _ref;
      if (path = /^(\~([a-z_\$]\w*)\/|[a-z_\$]\w*)/i.exec(uri)) {
        if (path[2] && config.paths[path[2]]) {
          path = path[2];
        } else {
          path = path[1];
        }
        _ref = config.maps;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          r = _ref[_i];
          if (!r.path || r.path === path) {
            uri = this.replace(uri, r.pattern, r.to);
          }
        }
      }
      return uri;
    },
    inject: function(uri, data) {
      var _base, _name;
      return typeof (_base = config.injectors)[_name = this.getFileExtension(uri)] === "function" ? _base[_name](data, uri) : void 0;
    },
    getFileExtension: function(file) {
      var _ref;
      return (_ref = /(\w+)([\?#].+)?$/.exec(file.toLowerCase())) != null ? _ref[1] : void 0;
    },
    sanitizeNamespace: function(ns) {
      return ns.replace(/\//g, '.').replace(/[^\w\.\$]+/g, '_').replace(/\b(\d+)/g, '_$1').replace(/\.+/g, '.').replace(/^\.*(.+?)\.*$/, '$1');
    },
    getPackageType: function(pkg) {
      var _ref;
      if (pkg.indexOf('!') > 0) {
        return 'plugin';
      } else if (pkg.match(/^(\.\/|)/) && !config.injectors[(_ref = /\w+$/.exec(pkg)) != null ? _ref[0] : void 0]) {
        return 'package';
      } else {
        return 'path';
      }
    },
    fixBase: function(name, base) {
      var _ref;
      if ('.' === name) {
        return base;
      } else if ('./' === name.slice(0, 2)) {
        if (config.injectors[(_ref = /\w+$/.exec(name)) != null ? _ref[0] : void 0]) {
          return '~/' + base + '/' + name.slice(2);
        } else {
          return base + '/' + name.slice(2);
        }
      } else {
        return name;
      }
    },
    trimDots: function(uri) {
      var part, parts, _i, _len, _ref;
      parts = [];
      _ref = uri.split('/');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        part = _ref[_i];
        if ('..' === part && _i !== 0) {
          parts.pop();
        } else if ('.' !== part) {
          parts.push(part);
        }
      }
      return parts.join('/');
    },
    toUri: function(pkg) {
      pkg = (function() {
        var _this = this;
        switch (this.getPackageType(pkg)) {
          case 'path':
            return this.doMaps(pkg).replace(/^\~\/((\w*)\/)?/, function(_0, _1, _2) {
              var p;
              p = config.paths[_2];
              return config.base + '/' + (p ? p + '/' : _1 != null ? _1 : '');
            });
          case 'package':
            pkg = this.doMaps(pkg).replace(/^\w+/, function(_0) {
              var _ref;
              return (_ref = config.paths[_0]) != null ? _ref : _0;
            });
            return config.base + '/' + pkg + '.js';
          default:
            return pkg;
        }
      }).call(this);
      return this.trimDots(pkg);
    },
    getFullPackages: function(packages) {
      return new FullPackages(packages).get();
    },
    useNamespace: function(ns, create, set) {
      var parent, pp, space, _i, _len, _ref;
      parent = window;
      ns = this.sanitizeNamespace(ns);
      _ref = ns.split('.');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        space = _ref[_i];
        if (parent[space] == null) {
          if (create) {
            parent[spaces] = {};
          } else {
            return set;
          }
        }
        pp = parent;
        parent = parent[space];
      }
      if (set) {
        return pp[space] = set;
      } else {
        return parent;
      }
    },
    error: function() {
      throw new Error(__slice.call(arguments).join(' '));
    },
    log: function() {
      if (config.debug) {
        return console.log.apply(console, ['[log]'].concat(__slice.call(arguments)));
      }
    }
  };

  FullPackages = (function() {

    function FullPackages(packages) {
      this.packages = packages;
      this.added = {};
    }

    FullPackages.prototype.checkAdded = function(pkg) {
      this.added[pkg] >>>= 0;
      return this.added[pkg]++;
    };

    FullPackages.prototype.addDependencies = function(list, pkg) {
      var i, ns, spaces, _i, _ref;
      spaces = pkg.split('/');
      for (i = _i = 1, _ref = spaces.length; _i < _ref; i = _i += 1) {
        ns = spaces.slice(0, i).join('/');
        if (this.added[ns]) {
          continue;
        }
        if (config.modules[ns]) {
          list.push.apply(list, this.expand([ns]));
          this.checkAdded(ns);
        } else {
          this.addSinglePackage(list, ns);
        }
      }
      return list;
    };

    FullPackages.prototype.addModulePackage = function(list, pkg, silent) {
      var def, m;
      if (def = config.modules[pkg]) {
        if (this.checkAdded(pkg)) {
          return;
        }
        def = $.extend({
          pkg: pkg,
          silent: silent,
          modules: []
        }, def);
        def.modules = (function() {
          var _i, _len, _ref, _results;
          _ref = def.modules;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            m = _ref[_i];
            m = utils.doAlts(m);
            m = utils.fixBase(m, pkg);
            if ('package' === utils.getPackageType(m)) {
              this.addDependencies(list, m);
            }
            if (m !== pkg && config.modules[m]) {
              list.push.apply(list, this.expand([m]));
              continue;
            } else {
              _results.push({
                name: m,
                uri: utils.toUri(m)
              });
            }
          }
          return _results;
        }).call(this);
        return list.push(def);
      } else {
        return this.addSinglePackage(list, pkg);
      }
    };

    FullPackages.prototype.addSinglePackage = function(list, pkg) {
      if (this.checkAdded(pkg)) {
        return;
      }
      return list.push({
        pkg: pkg,
        modules: [
          {
            name: pkg,
            uri: utils.toUri(pkg)
          }
        ]
      });
    };

    FullPackages.prototype.addPluginPackage = function(list, pkg) {
      if (this.checkAdded(pkg)) {
        return;
      }
      return list.push({
        pkg: pkg,
        modules: [
          {
            name: pkg,
            func: pkg
          }
        ]
      });
    };

    FullPackages.prototype.expand = function(packages) {
      var list, pkg, silent, type, _i, _len;
      list = [];
      for (_i = 0, _len = packages.length; _i < _len; _i++) {
        pkg = packages[_i];
        if (silent = '&' === pkg.charAt(0)) {
          pkg = pkg.substr(1);
        }
        pkg = utils.doAlts(pkg);
        type = utils.getPackageType(pkg);
        if ('path' === type) {
          this.addSinglePackage(list, pkg);
        } else if ('plugin' === type) {
          this.addPluginPackage(list, pkg);
        } else {
          this.addDependencies(list, pkg);
          this.addModulePackage(list, pkg, silent);
        }
      }
      return list;
    };

    FullPackages.prototype.get = function() {
      return this.expand(this.packages);
    };

    return FullPackages;

  })();

  cache = {
    set: function(name, data) {
      var timestamp;
      if (!(config.cache && localStorage)) {
        return;
      }
      timestamp = +new Date();
      try {
        localStorage.setItem(config.prefix + name, timestamp + data);
      } catch (_error) {}
      return utils.log('Cached ', name);
    },
    get: function(name) {
      var data, timestamp;
      if (!(config.cache && localStorage && (data = localStorage.getItem(config.prefix + name)))) {
        return;
      }
      timestamp = +data.slice(0, 13);
      data = data.slice(13);
      if (+new Date() > timestamp + config.expiration * MILLISEC_DAY) {
        return;
      }
      utils.log('Loaded form cache', name);
      return data;
    },
    remove: function(name) {
      if (!localStorage) {
        return;
      }
      return localStorage.removeItem(config.prefix + utils.toUri(utils.doAlts(name)));
    },
    clear: function() {
      var key, _results;
      if (!localStorage) {
        return;
      }
      _results = [];
      for (key in localStorage) {
        if (key && key.indexOf(config.prefix) === 0) {
          _results.push(localStorage.removeItem(key));
        }
      }
      return _results;
    }
  };

  exports = {
    exports: {},
    unwrap: function(set) {
      var args, def, modules, name, _ref, _ref1;
      if (set.pkg) {
        def = (_ref = config.modules[set.pkg]) != null ? _ref : set;
        modules = (_ref1 = def.modules) != null ? _ref1 : [];
        if ($.isFunction(set.exports)) {
          args = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = modules.length; _i < _len; _i++) {
              name = modules[_i];
              name = utils.fixBase(utils.doAlts(name), set.pkg);
              _results.push(this.get((name === set.pkg ? '#' : '') + name));
            }
            return _results;
          }).call(this);
          try {
            return set.exports = set.exports.apply(def, args);
          } catch (_error) {}
        } else {
          return set.exports;
        }
      } else {
        return set.data;
      }
    },
    set: function(set) {
      var get, name, type, _name, _ref, _ref1, _ref2, _ref3;
      _name = (_ref = set.name) != null ? _ref : set.pkg;
      name = (set.name ? '#' : '') + _name;
      type = utils.getPackageType(_name);
      if (get = this.get(name)) {
        return;
      }
      this.exports[name] = (_ref1 = this.unwrap(set)) != null ? _ref1 : {};
      if ('package' === type) {
        this.exports[name] = (_ref2 = utils.useNamespace(_name, false, set.exports)) != null ? _ref2 : {};
      } else if ('plugin' !== type && set.pkg) {
        this.exports[_name] = (_ref3 = this.get('#' + _name)) != null ? _ref3 : {};
      }
      return utils.log('Exported', name);
    },
    get: function(name, like) {
      var key, val, _ref;
      if (like == null) {
        like = false;
      }
      if (this.exports[name]) {
        return this.exports[name];
      } else if (like) {
        _ref = this.exports;
        for (key in _ref) {
          val = _ref[key];
          if (key.indexOf(name === 0)) {
            break;
          }
          val = null;
        }
        return val;
      }
    },
    remove: function(name) {
      return this.exports[name] = void 0;
    }
  };

  loader = {
    status: {},
    getStatus: function(name, wrap) {
      var wrapper;
      if (wrap) {
        wrapper = $.Deferred();
        this.status[name].then((function() {
          return wrapper.resolve();
        }), wrapper.reject);
        return wrapper.promise();
      } else {
        return this.status[name];
      }
    },
    setStatus: function(name, status) {
      return this.status[name] = status;
    },
    getData: function(name, uri, opt) {
      var data, dfd, ext;
      if (opt == null) {
        opt = {};
      }
      dfd = $.Deferred();
      if (data = cache.get(uri)) {
        dfd.resolve({
          name: name,
          uri: uri,
          data: data,
          inject: true
        });
      } else {
        ext = utils.getFileExtension(uri);
        opt = $.extend({
          url: uri,
          timeout: config.timeout,
          cache: config.cache,
          dataType: 'function' === typeof config.injectors[ext] ? 'text' : void 0
        }, opt);
        $.ajax(opt).done(function(data) {
          utils.log('Ajax loaded', uri);
          cache.set(uri, data);
          if ('js' === ext && data.match(fileHasDefine)) {
            defQueue[defQueueId] = {
              name: name,
              dfd: dfd
            };
            return utils.inject(uri, data.replace(fileHasDefine, "require.defineByQueue(" + (defQueueId++) + ","));
          } else {
            return dfd.resolve({
              name: name,
              uri: uri,
              data: data,
              inject: true
            });
          }
        }).fail(function(xhr, status) {
          dfd.reject(name, status);
          return utils.error('Ajax', status, uri);
        });
      }
      return dfd.promise();
    },
    invokeFunction: function(name, pkg) {
      var arg, dfd, func, _ref;
      dfd = $.Deferred();
      _ref = pkg.split('!'), func = _ref[0], arg = _ref[1];
      new Require([func]).then(function() {
        var plugin, _ref1;
        if (plugin = (_ref1 = config.modules[func]) != null ? _ref1.plugin : void 0) {
          return plugin(dfd, name, arg != null ? arg : '');
        } else {
          return dfd.resolve(name, 'noplugin');
        }
      }, dfd.reject);
      dfd.done(function(set) {
        if (set) {
          return exports.set(set);
        }
      });
      return dfd.promise();
    },
    loadPackage: function(pkg) {
      var func, name, queues, uri;
      queues = (function() {
        var _i, _len, _ref, _ref1, _results;
        _ref = pkg.modules;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          _ref1 = _ref[_i], name = _ref1.name, uri = _ref1.uri, func = _ref1.func;
          if (this.getStatus(name)) {
            _results.push(this.getStatus(name, true));
          } else if (func) {
            _results.push(this.setStatus(name, this.invokeFunction(name, func)));
          } else {
            _results.push(this.setStatus(name, this.getData(name, uri)));
          }
        }
        return _results;
      }).call(this);
      return $.when.apply($, queues);
    },
    load: function(modules) {
      var dfd, packages, pkg, promises,
        _this = this;
      packages = utils.getFullPackages(modules);
      dfd = $.Deferred();
      promises = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = packages.length; _i < _len; _i++) {
          pkg = packages[_i];
          if (this.getStatus(pkg.pkg)) {
            _results.push(this.getStatus(pkg.pkg, true));
          } else {
            _results.push(this.setStatus(pkg.pkg, this.loadPackage(pkg)));
          }
        }
        return _results;
      }).call(this);
      $.when.apply($, promises).done(function() {
        return _this.finish(promises, packages, dfd.resolve);
      }).fail(dfd.reject);
      return dfd.promise();
    },
    finish: function(promises, packages, resolve) {
      var promise,
        _this = this;
      if (!(promise = promises.shift())) {
        return resolve();
      }
      return promise.done(function() {
        var args, name, pkg, set, _i, _len;
        pkg = packages.shift();
        for (_i = 0, _len = arguments.length; _i < _len; _i++) {
          set = arguments[_i];
          if (!set) {
            continue;
          }
          if (set.inject) {
            utils.inject(set.uri, set.data);
          }
          if (set.name) {
            exports.set(set);
          }
        }
        exports.set(pkg);
        args = (function() {
          var _j, _len1, _ref, _ref1, _ref2, _results;
          _ref2 = (_ref = (_ref1 = config.modules[pkg.pkg]) != null ? _ref1.modules : void 0) != null ? _ref : [];
          _results = [];
          for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
            name = _ref2[_j];
            _results.push(exports.get(utils.fixBase(utils.doAlts(name), pkg.pkg)));
          }
          return _results;
        })();
        if (typeof pkg.init === "function") {
          pkg.init.apply(pkg, args);
        }
        if (!pkg.silent) {
          if (typeof pkg.runs === "function") {
            pkg.runs.apply(pkg, args);
          }
        }
        return _this.finish(promises, packages, resolve);
      });
    }
  };

  Require = (function() {

    function Require(modules) {
      this.modules = modules;
      this.loader = loader.load(this.modules);
    }

    Require.prototype._fn = function() {
      var fn, method, _ref;
      method = arguments[0], fn = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      (_ref = this.loader)[method].apply(_ref, fn);
      return this;
    };

    Require.prototype.get = function(name) {
      var _i, _len, _ref, _results;
      if (name == null) {
        name = false;
      }
      if (name !== false) {
        if ($.isNumeric(name)) {
          name = this.modules[name];
        }
        return exports.get(utils.doAlts(name), true);
      } else {
        _ref = this.modules;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          name = _ref[_i];
          _results.push(exports.get(utils.doAlts(name)));
        }
        return _results;
      }
    };

    Require.prototype.done = function(callback) {
      var _this = this;
      return this._fn('done', function() {
        return callback.apply(_this, _this.get());
      });
    };

    Require.prototype.fail = function(callback) {
      return this._fn('fail', callback);
    };

    Require.prototype.progress = function(callback) {
      return this._fn('progress', callback);
    };

    Require.prototype.always = function(callback) {
      return this._fn('always', callback);
    };

    Require.prototype.then = function(done, fail, progress) {
      var _this = this;
      return this._fn('then', (function() {
        return done.apply(_this, _this.get());
      }), fail, progress);
    };

    return Require;

  })();

  require = function(x, y, z) {
    if ($.isFunction(y)) {
      return new Require(x).then(y, z);
    } else {
      return new Require(arguments);
    }
  };

  define = function(x, y, z, override) {
    var _ref;
    if (override == null) {
      override = false;
    }
    if (x == null) {
      return config.modules;
    }
    _ref = $.isArray(y) && (z != null) ? [y, z] : y != null ? [[], y] : void 0, y = _ref[0], z = _ref[1];
    if (config.modules[x] && !(override || config.override)) {
      return;
    }
    undef(x);
    return config.modules[x] = {
      modules: y,
      exports: z
    };
  };

  undef = function(name) {
    var _name;
    _name = utils.doAlts(name);
    loader.setStatus(_name, null);
    exports.remove(_name);
    return config.modules[name] = void 0;
  };

  $.extend(require, utils, {
    cache: cache,
    exports: exports,
    loader: loader,
    main: function() {
      var main;
      main = $('script[data-main]').eq(0);
      if (main.length !== 1) {
        return;
      }
      main = utils.toUri(main.data('main'));
      return loader.getData('__main', main, {
        async: false
      }).done(function(_arg) {
        var data, uri;
        data = _arg.data, uri = _arg.uri;
        return utils.inject(uri, data);
      });
    },
    config: function(settings) {
      if ($.isPlainObject(settings)) {
        if (settings.modules) {
          settings.modules = $.extend(config.modules, settings.modules);
        }
        if (settings.alts) {
          settings.alts = $.extend(config.alts, settings.alts);
        }
        if (settings.maps) {
          settings.maps = $.extend(config.maps, settings.maps);
        }
        return $.extend(config, settings);
      } else {
        return config;
      }
    },
    undef: undef,
    define: define,
    defineByQueue: function() {
      var args, id, queue;
      id = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      queue = defQueue[id];
      if (!queue) {
        return false;
      }
      if ('string' !== typeof args[0]) {
        args.unshift(queue.name);
      }
      define.apply(null, __slice.call(args).concat([true]));
      if (queue) {
        loader.load([args[0]]).then(queue.dfd.resolve, queue.dfd.reject);
      }
      defQueue[id] = void 0;
      return true;
    },
    injectors: function(settings) {
      if ($.isPlainObject(settings)) {
        return $.extend(config.injectors, settings);
      } else {
        return config.injectors;
      }
    },
    alts: function(x) {
      if (x) {
        return $.extend(config.alts, arguments);
      } else {
        return config.alts;
      }
    },
    maps: function(x) {
      if (x) {
        return $.extend(config.maps, arguments);
      } else {
        return config.maps;
      }
    },
    toUri: function(pkg) {
      return utils.toUri(utils.doAlts(pkg != null ? pkg : ''));
    }
  });

  fired = {};

  $(document).ready(function() {
    return fired.ready = true;
  });

  $(window).load(function() {
    return fired.load = true;
  });

  define('jquery', function() {
    return $;
  });

  define('ready', function() {
    var ready;
    ready = function(fn) {
      if (fired.ready) {
        return fn();
      } else {
        return $(document).ready(fn);
      }
    };
    this.plugin = function(dfd, pkg) {
      return ready(function() {
        return dfd.resolve({
          pkg: pkg,
          exports: document
        });
      });
    };
    return ready;
  });

  define('load', function() {
    var load;
    load = function(fn) {
      if (fired.load) {
        return fn();
      } else {
        return $(window).load(fn);
      }
    };
    this.plugin = function(dfd, pkg) {
      return load(function() {
        return dfd.resolve({
          pkg: pkg,
          exports: window
        });
      });
    };
    return load;
  });

  require.injectors({
    css: function(data, uri) {
      var base;
      base = uri.replace(/[^\/]*$/, '');
      data = data.replace(/url\(('|"|)(?!\/|(https?:)?\/\/)(.+?)\1\)/g, "url(" + base + "$3)");
      $head.append("<style>" + data + "</style>");
      return utils.log('Injected CSS', uri);
    },
    js: function(data, uri) {
      data = data.replace(/<\/script>/g, '<\\/script>');
      $.globalEval(data);
      return utils.log('Injected JavaScript', uri);
    },
    json: true
  });

  require.main();

  window.require = require;

  window.define = define;

}).call(this);
