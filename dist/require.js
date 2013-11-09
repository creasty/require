/*!
 * require - v2.0.1 (2013-04-07)
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
    baseUrl: '',
    paths: {},
    injectors: {},
    shim: {},
    map: {},
    cache: true,
    debug: false,
    override: false,
    expiration: 30,
    interval: 10,
    timeout: 6000
  };

  utils = {
    inject: function(uri, data) {
      var _base, _name;
      return typeof (_base = config.injectors)[_name = this.getFileExtension(uri)] === "function" ? _base[_name](data, uri) : void 0;
    },
    getFileExtension: function(file) {
      var _ref;
      return (_ref = /(\w+)([\?#].+)?$/.exec(file.toLowerCase())) != null ? _ref[1] : void 0;
    },
    getPackageType: function(pkg) {
      var _ref;
      if (pkg.indexOf('!') > 0) {
        return 'plugin';
      } else if (pkg.match(/^(|\.\.|\~|https?:)\//) || config.injectors[(_ref = /\w+$/.exec(pkg)) != null ? _ref[0] : void 0]) {
        return 'path';
      } else {
        return 'package';
      }
    },
    getFullPackages: function(packages, base) {
      return new FullPackages(packages, base).get();
    },
    doMap: function(name, base) {
      var _ref, _ref1, _ref2;
      if (base == null) {
        base = '*';
      }
      return (_ref = (_ref1 = (_ref2 = config.map[base]) != null ? _ref2 : config.map['*']) != null ? _ref1[name] : void 0) != null ? _ref : name;
    },
    fixBase: function(name, base) {
      var _ref;
      if (!base) {
        return name;
      }
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
    regulateName: function(name, base) {
      return this.fixBase(this.doMap(name, base), base);
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
    toUrl: function(pkg) {
      pkg = (function() {
        var _this = this;
        switch (this.getPackageType(pkg)) {
          case 'path':
            return pkg.replace(/^\~\/((\w*)\/)?/, function(_0, _1, _2) {
              var p;
              p = config.paths[_2];
              return config.baseUrl + '/' + (p ? p + '/' : _1 != null ? _1 : '');
            });
          case 'package':
            pkg = pkg.replace(/^\w+/, function(_0) {
              var _ref;
              return (_ref = config.paths[_0]) != null ? _ref : _0;
            });
            return config.baseUrl + '/' + pkg + '.js';
          default:
            return pkg;
        }
      }).call(this);
      return this.trimDots(pkg);
    },
    sanitizeNamespace: function(ns) {
      return ns.replace(/\//g, '.').replace(/[^\w\.\$]+/g, '_').replace(/\b(\d+)/g, '_$1').replace(/\.+/g, '.').replace(/^\.*(.+?)\.*$/, '$1');
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

    function FullPackages(packages, base) {
      this.packages = packages;
      this.base = base != null ? base : '*';
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
        if (config.shim[ns]) {
          list.push.apply(list, this.expand([ns]));
          this.checkAdded(ns);
        } else {
          this.addSinglePackage(list, ns);
        }
      }
      return list;
    };

    FullPackages.prototype.addModulePackage = function(list, pkg, silent) {
      var def, fallback, i, m, ns;
      if (def = config.shim[pkg]) {
        if (this.checkAdded(pkg)) {
          return;
        }
        if ($.isArray(def)) {
          def = config.shim[pkg] = {
            deps: def
          };
        }
        if ('string' === typeof def.exports) {
          ns = config.shim[pkg].exports;
          config.shim[pkg].exports = function() {
            return utils.useNamespace(ns);
          };
        }
        def = $.extend({
          pkg: pkg,
          silent: silent,
          deps: [],
          fallbacks: []
        }, def);
        i = -1;
        def.deps = (function() {
          var _i, _len, _ref, _results;
          _ref = def.deps;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            m = _ref[_i];
            m = utils.regulateName(m, pkg);
            fallback = def.fallbacks[++i] != null ? (def.fallbacks[i] = utils.regulateName(def.fallbacks[i], pkg), [def.fallbacks[i], utils.toUrl(def.fallbacks[i])]) : void 0;
            if ('package' === utils.getPackageType(m)) {
              this.addDependencies(list, m);
            }
            if (m !== pkg && config.shim[m]) {
              list.push.apply(list, this.expand([m]));
              continue;
            } else {
              _results.push({
                name: m,
                uri: utils.toUrl(m),
                fallback: fallback
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
        deps: [
          {
            name: pkg,
            uri: utils.toUrl(utils.regulateName(pkg, this.base))
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
        deps: [
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
        pkg = utils.regulateName(pkg, this.base);
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
      var args, def, deps, name, _ref, _ref1;
      if (set.pkg) {
        def = (_ref = config.shim[set.pkg]) != null ? _ref : set;
        deps = (_ref1 = def.deps) != null ? _ref1 : [];
        if ($.isFunction(set.exports)) {
          args = (function() {
            var _i, _len, _results;
            _results = [];
            for (_i = 0, _len = deps.length; _i < _len; _i++) {
              name = deps[_i];
              name = utils.fixBase(utils.regulateName(name), set.pkg);
              _results.push(this.get((name === set.pkg ? '#' : '') + name));
            }
            return _results;
          }).call(this);
          def.global = window;
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
      var get, name, type, _name, _ref, _ref1, _ref2, _ref3, _ref4;
      _name = (_ref = (_ref1 = set.name) != null ? _ref1 : set.pkg) != null ? _ref : '';
      name = (set.name ? '#' : '') + _name;
      type = utils.getPackageType(_name);
      if (get = this.get(name)) {
        return;
      }
      if ('package' === type && typeof set.exports === 'string') {
        _name = set.exports;
      }
      this.exports[name] = (_ref2 = this.unwrap(set)) != null ? _ref2 : {};
      if ('package' === type) {
        this.exports[name] = (_ref3 = utils.useNamespace(_name, false, set.exports)) != null ? _ref3 : {};
      } else if ('plugin' !== type && set.pkg) {
        this.exports[_name] = (_ref4 = this.get('#' + _name)) != null ? _ref4 : {};
      }
      return utils.log('Exported', name);
    },
    get: function(name) {
      return this.exports[name];
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
    getData: function(name, uri, opt, fail) {
      var data, dfd, ext,
        _this = this;
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
          if ($.isArray(fail)) {
            return _this.getData.apply(_this, fail).then(dfd.resolve, dfd.reject);
          } else {
            dfd.reject(name, status);
            return utils.error('Ajax', status, uri);
          }
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
        if (plugin = (_ref1 = config.shim[func]) != null ? _ref1.plugin : void 0) {
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
      var fallback, func, name, queues, uri;
      queues = (function() {
        var _i, _len, _ref, _ref1, _results;
        _ref = pkg.deps;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          _ref1 = _ref[_i], name = _ref1.name, uri = _ref1.uri, func = _ref1.func, fallback = _ref1.fallback;
          if (this.getStatus(name)) {
            _results.push(this.getStatus(name, true));
          } else if (func) {
            _results.push(this.setStatus(name, this.invokeFunction(name, func)));
          } else {
            _results.push(this.setStatus(name, this.getData(name, uri, {}, fallback)));
          }
        }
        return _results;
      }).call(this);
      return $.when.apply($, queues);
    },
    load: function(modules, base) {
      var dfd, packages, pkg, promises,
        _this = this;
      packages = utils.getFullPackages(modules, base);
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
          _ref2 = (_ref = (_ref1 = config.shim[pkg.pkg]) != null ? _ref1.deps : void 0) != null ? _ref : [];
          _results = [];
          for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
            name = _ref2[_j];
            _results.push(exports.get(utils.regulateName(name, pkg.pkg)));
          }
          return _results;
        })();
        pkg.global = window;
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

    Require.prototype.require = function(name) {
      var _i, _j, _len, _len1, _name, _ref, _ref1, _results;
      if (name != null) {
        if ($.isNumeric(name)) {
          name = this.modules[name];
        } else {
          _ref = this.modules;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            _name = _ref[_i];
            if (_name.indexOf(name) >= 0) {
              break;
            }
          }
          name = _name;
        }
        return exports.get(utils.regulateName(name));
      } else {
        _ref1 = this.modules;
        _results = [];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          name = _ref1[_j];
          _results.push(exports.get(utils.regulateName(name)));
        }
        return _results;
      }
    };

    Require.prototype._wrapCallback = function(fn) {
      var _this = this;
      return function() {
        return fn.apply(_this, _this.require());
      };
    };

    Require.prototype.global = window;

    Require.prototype.done = function(callback) {
      return this._fn('done', this._wrapCallback(callback));
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
      return this._fn('then', this._wrapCallback(done), fail, progress);
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
      return config.shim;
    }
    _ref = $.isArray(y) && (z != null) ? [y, z] : y != null ? [[], y] : void 0, y = _ref[0], z = _ref[1];
    if (config.shim[x] && !(override || config.override)) {
      return;
    }
    undef(x);
    return config.shim[x] = {
      deps: y,
      exports: z
    };
  };

  undef = function(name) {
    var _name;
    _name = utils.regulateName(name);
    loader.setStatus(_name, null);
    exports.remove(_name);
    return config.shim[name] = void 0;
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
      main = utils.toUrl(main.data('main'));
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
        if (settings.shim) {
          settings.shim = $.extend(config.shim, settings.shim);
        }
        if (settings.map) {
          settings.map = $.extend(config.map, settings.map);
        }
        return $.extend(config, settings);
      } else {
        return config;
      }
    },
    undef: undef,
    define: define,
    defineByQueue: function() {
      var args, id, q;
      id = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      q = defQueue[id];
      if (!q) {
        return;
      }
      if ('string' !== typeof args[0]) {
        args.unshift(q.name);
      }
      define.apply(null, __slice.call(args).concat([true]));
      loader.load([args[0]], q.name).then(q.dfd.resolve, q.dfd.reject);
      return defQueue[id] = void 0;
    },
    injectors: function(settings) {
      if ($.isPlainObject(settings)) {
        return $.extend(config.injectors, settings);
      } else {
        return config.injectors;
      }
    },
    map: function(x) {
      if (x != null) {
        return $.extend(config.map, x);
      } else {
        return config.map;
      }
    },
    toUrl: function(pkg, base) {
      return utils.toUrl(utils.regulateName(pkg, base));
    }
  });

  fired = {};

  $(document).ready(function() {
    return fired.ready = true;
  });

  $(window).load(function() {
    return fired.load = true;
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

  define('jquery', function() {
    return $;
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
