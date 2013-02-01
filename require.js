/*!
 * Require v1.4
 *
 * @author ykiwng
 */

(function($, window, document) {
  var $head, MILLISEC_DAY, cache, existObject, inject, loader, require;
  $head = $('head');
  MILLISEC_DAY = 1000 * 60 * 60 * 24;
  inject = function(_arg) {
    var base, data, ext, uri, _ref, _ref1;
    uri = _arg.uri, data = _arg.data;
    ext = (_ref = /(\w+)([\?#].+)?$/.exec(uri)) != null ? (_ref1 = _ref[1]) != null ? _ref1.toLowerCase() : void 0 : void 0;
    if ('css' === ext) {
      base = uri.replace(/[^\/]*$/, '');
      data = data.replace(/url\(('|"|)(?!\/|(https?:)?\/\/)(.+?)\1\)/g, "url(" + base + "$3)");
      $head.append($('<style/>').html(data));
    }
    if ('js' === ext) {
      return $.globalEval(data);
    }
  };
  existObject = function(symbol, callback) {
    var check, timer;
    symbol = symbol.replace(/[^\w\$\.]/g, '').replace(/(^|\.)([0-9\.]+|$)/g, '');
    check = new Function("return window." + symbol + " != null");
    return timer = setInterval(function() {
      if (check()) {
        clearInterval(timer);
        return callback();
      }
    }, 10);
  };
  cache = {
    docache: true,
    prefix: 'require-',
    expiration: 30 * MILLISEC_DAY,
    set: function(uri, data) {
      var timestamp;
      if (!(this.docache && window.localStorage)) {
        return;
      }
      timestamp = +new Date();
      return localStorage.setItem(this.prefix + uri, timestamp + data);
    },
    get: function(uri) {
      var data, timestamp;
      if (!(this.docache && window.localStorage && (data = localStorage.getItem(this.prefix + uri)))) {
        return;
      }
      timestamp = +data.slice(0, 13);
      data = data.slice(13);
      if (+new Date() > timestamp + this.expiration) {
        return;
      }
      return data;
    },
    remove: function() {
      var key;
      for (key in localStorage) {
        if (key.indexOf(this.prefix) === 0) {
          localStorage.removeItem(key);
        }
      }
      return true;
    }
  };
  loader = {
    path: '',
    abbr: {},
    assets: {},
    status: {},
    getStatus: function(name) {
      return this.status[name];
    },
    setStatus: function(name, status) {
      return this.status[name] = status;
    },
    expandAbbr: function(path) {
      var _this = this;
      return path.replace(/^~(\w*)\//, function(_0, _1) {
        var dir, s, _i, _len, _ref, _ref1;
        dir = _this.path;
        _ref = _1.split('');
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          s = _ref[_i];
          dir += (_ref1 = _this.abbr[s]) != null ? _ref1 : '';
        }
        return dir;
      });
    },
    getData: function(uri) {
      var cue, data;
      cue = $.Deferred();
      if (data = cache.get(uri)) {
        cue.resolve({
          uri: uri,
          data: data
        });
      } else {
        $.ajax({
          url: uri,
          processData: false
        }).then(function(data) {
          cache.set(uri, data);
          return cue.resolve({
            uri: uri,
            data: data
          });
        }, cue.reject);
      }
      return cue.promise();
    },
    _load: function(dfd, pkg, files) {
      var cues, init, path;
      init = $.noop;
      cues = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          path = files[_i];
          if ($.isFunction(path)) {
            init = path;
            continue;
          }
          if (this.getStatus(path)) {
            _results.push(this.getStatus(path));
          } else {
            _results.push(this.setStatus(path, this.getData(this.expandAbbr(path))));
          }
        }
        return _results;
      }).call(this);
      return $.when.apply($, cues).then(function() {
        var arg, _i, _len;
        for (_i = 0, _len = arguments.length; _i < _len; _i++) {
          arg = arguments[_i];
          inject(arg);
        }
        init();
        return dfd.resolve();
      }, dfd.reject);
    },
    load: function(assets) {
      var dfd, files, path, pkg, promises;
      promises = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = assets.length; _i < _len; _i++) {
          pkg = assets[_i];
          if ($.isArray(pkg)) {
            _results.push(this.load(pkg));
          } else if (this.getStatus(pkg)) {
            _results.push(this.getStatus(pkg));
          } else {
            files = this.assets[pkg];
            dfd = $.Deferred();
            switch (true) {
              case !!files:
                this._load(dfd, pkg, files);
                break;
              case !!pkg.match(/^[\.\w\$]+$/):
                path = this.path + pkg.replace(/([^\.])\.([^\.])/g, '$1/$2').replace(/\.\./g, '.') + '.js';
                this._load(dfd, pkg, [path]);
                break;
              case pkg.indexOf('/') >= 0:
                this._load(dfd, pkg, [pkg]);
                break;
              case '@' === pkg.charAt(0):
                existObject(pkg, dfd.resolve);
                break;
              case '!ready' === pkg:
                $(document).ready(dfd.resolve);
                break;
              case '!load' === pkg:
                $(window).load(dfd.resolve);
                break;
              default:
                dfd.resolve();
            }
            _results.push(this.setStatus(pkg, dfd.promise()));
          }
        }
        return _results;
      }).call(this);
      return $.when.apply($, promises);
    }
  };
  require = function() {
    return loader.load(arguments);
  };
  $.extend(require, {
    setPath: function(path, abbr) {
      if (path && typeof path === 'string') {
        loader.path = path;
      }
      if ($.isPlainObject(abbr)) {
        $.extend(loader.abbr, abbr);
      }
      return loader.path;
    },
    setExpiration: function(day) {
      return cache.expiration = (day >> 0) * MILLISEC_DAY;
    },
    define: function(assets) {
      if ($.isPlainObject(assets)) {
        $.extend(loader.assets, assets);
      }
      return loader.assets;
    },
    path: function(path) {
      return loader.path + (path != null ? path : '');
    },
    cache: function(bool) {
      return cache.docache = !!bool;
    },
    removeCache: function() {
      return cache.remove();
    },
    ready: $(document).ready,
    load: $(window).load
  });
  return window.require = require;
})(jQuery, window, document);
