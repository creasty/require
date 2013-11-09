(function() {

  require.config({
    cache: false,
    debug: true,
    baseUrl: './spec/library/modules',
    paths: {
      'app': '../app'
    },
    map: {
      '*': {
        'map-test': 'map-test-1'
      },
      'com': {
        'map-test': 'map-test-2'
      }
    },
    shim: {
      'com': {
        deps: ['../com.js'],
        fallbacks: ['~/com.js']
      },
      'abc': ['.', 'def', 'ghi'],
      'xyz': {
        deps: ['.'],
        exports: function(xyz) {
          return xyz.toString;
        }
      },
      'app': ['.', './app.css'],
      'app/foo': ['.', './foo.css'],
      'app/bar': {
        deps: ['.'],
        init: function(appBar) {
          if (this.called) {
            return;
          }
          appBar.init();
          return this.called = true;
        }
      }
    }
  });

  describe('require.toUrl(pkg)', function() {
    var config;
    config = require.config();
    it('`pkg` が "~/" ではじまるとき、base からの URL を返す', function() {
      var x1, x2, y1, y2;
      x1 = require.toUrl('~/dir/file.js');
      y1 = 'spec/library/modules/dir/file.js';
      x2 = require.toUrl('~/app/dir/file.js');
      y2 = 'spec/library/app/dir/file.js';
      expect(x1).toEqual(y1);
      return expect(x2).toEqual(y2);
    });
    it('`pkg` が "/", "../", "http[s]://" で始まるか、拡張子を含むとき、一般的なパスとみなしてそのままの値を返す', function() {
      var x1, x2, x3;
      x1 = '/dir/file.js';
      x2 = '../dir/file.js';
      x3 = 'http://www.example.com/dir/file.js';
      expect(require.toUrl(x1)).toEqual(x1);
      expect(require.toUrl(x2)).toEqual(x2);
      return expect(require.toUrl(x3)).toEqual(x3);
    });
    it('`pkg` がそれ以外の場合パッケージとみなして base からの URL を返す', function() {
      var x, y;
      x = require.toUrl('foo/bar/baz');
      y = 'spec/library/modules/foo/bar/baz.js';
      return expect(x).toEqual(y);
    });
    return it('map が正しく機能する', function() {
      var x1, x2, y1, y2;
      x1 = require.toUrl('map-test');
      y1 = require.toUrl('map-test-1');
      x2 = require.toUrl('map-test', 'com');
      y2 = require.toUrl('map-test-2');
      expect(x1).toEqual(y1);
      return expect(x2).toEqual(y2);
    });
  });

  describe('require.getFullPackages(packages)', function() {
    return it('依存関係にあるすべてのモジュールを含めた配列を返す', function() {
      var x, y;
      x = require.getFullPackages(['app/foo', '&xyz', 'aaa/bbb']);
      y = [
        {
          pkg: 'app',
          silent: false,
          deps: [
            {
              name: 'app',
              uri: require.toUrl('app')
            }, {
              name: require.fixBase('./app.css', 'app'),
              uri: require.toUrl('~/app/app.css')
            }
          ],
          fallbacks: []
        }, {
          pkg: 'app/foo',
          silent: false,
          deps: [
            {
              name: 'app/foo',
              uri: require.toUrl('app/foo')
            }, {
              name: require.fixBase('./foo.css', 'app/foo'),
              uri: require.toUrl('~/app/foo/foo.css')
            }
          ],
          fallbacks: []
        }, {
          pkg: 'xyz',
          silent: true,
          deps: [
            {
              name: 'xyz',
              uri: require.toUrl('xyz')
            }
          ],
          fallbacks: []
        }, {
          pkg: 'aaa',
          deps: [
            {
              name: 'aaa',
              uri: require.toUrl('aaa')
            }
          ]
        }, {
          pkg: 'aaa/bbb',
          deps: [
            {
              name: 'aaa/bbb',
              uri: require.toUrl('aaa/bbb')
            }
          ]
        }
      ];
      return expect(JSON.stringify(x)).toEqual(JSON.stringify(y));
    });
  });

  describe('require(args...)', function() {
    describe('パッケージ読み込み', function() {
      it('パッケージは並列非同期で読み込まれ、定義された順番でインジェクトされる', function() {
        var _this = this;
        require('abc').always(this.stop).done(this.done);
        return this.async(function() {
          expect(_this.done).toHaveBeenCalled();
          expect(abc.order).toEqual(0);
          expect(def.order).toEqual(1);
          return expect(ghi.order).toEqual(2);
        });
      });
      it('各モジュールは .done 関数の中で `this.require(name)` を使って取得するか、引数で受け取る', function() {
        var x,
          _this = this;
        x = {};
        require('xyz').always(this.stop).done(this.done).done(function(arg) {
          x.arg = arg;
          return x.get = this.require(0);
        });
        return this.async(function() {
          expect(_this.done).toHaveBeenCalled();
          expect(x.get).toBe(x.arg);
          return expect(x.get()).toEqual('xyz');
        });
      });
      it('パッケージは名前空間のペアレントから順番に依存するパッケージを読み込む', function() {
        var _this = this;
        require('app/foo').always(this.stop).done(this.done);
        return this.async(function() {
          expect(_this.done).toHaveBeenCalled();
          return expect(app.foo).toBeDefined();
        });
      });
      it('`init` はパッケージの読み込みが終わったら直ぐ呼ばれる', function() {
        var _this = this;
        require('app/bar').always(this.stop).done(this.done);
        return this.async(function() {
          expect(_this.done).toHaveBeenCalled();
          return expect(app.bar.called).toBeTruthy();
        });
      });
      it('json ファイルはパースされた結果が export される', function() {
        var _this = this;
        require('~/sample.json').always(this.stop).done(this.done).done(function(json) {
          _this.json = json;
        });
        return this.async(function() {
          expect(_this.done).toHaveBeenCalled();
          return expect(_this.json.file).toEqual('sample.json');
        });
      });
      it('`deps` の URL で読み込みエラーが起きた場合、`fallbacks` の方にある URL で再トライする', function() {
        var _this = this;
        require('com').always(this.stop).done(this.done).done(function(com) {
          _this.com = com;
        });
        return this.async(function() {
          expect(_this.done).toHaveBeenCalled();
          return expect(_this.com()).toEqual('com');
        });
      });
      return it('ファイル内で定義したモジュールを利用する', function() {
        var _this = this;
        require('fileModule').always(this.stop).done(this.done).done(function(fileModule) {
          _this.fileModule = fileModule;
        });
        return this.async(function() {
          expect(_this.done).toHaveBeenCalled();
          expect(_this.fileModule.abc).toEqual('abc');
          return expect(_this.fileModule.toString()).toEqual('fileModule');
        });
      });
    });
    return describe('プラグイン "func!arg"', function() {
      it('ready! は DOM が利用可能になった時点で resolve する', function() {
        var _this = this;
        require('ready!').always(this.stop).done(this.done);
        return this.async(function() {
          return expect(_this.done).toHaveBeenCalled();
        });
      });
      it('load! はページが完全に読み込まれた時点で resolve する', function() {
        var _this = this;
        require('load!').always(this.stop).done(this.done);
        return this.async(function() {
          return expect(_this.done).toHaveBeenCalled();
        });
      });
      return it('ファイル内で定義したモジュールをプラグインとして利用する', function() {
        var _this = this;
        require('exist!testNamespace').always(this.stop).done(this.done.done(function(ns) {
          _this.ns = ns;
        }));
        setTimeout(function() {
          return window.testNamespace = {};
        }, 1000);
        return this.async(function() {
          expect(_this.done).toHaveBeenCalled();
          expect(window.testNamespace).toBeDefined();
          return expect(_this.ns).toBe(window.testNamespace);
        });
      });
    });
  });

  describe('単一モジュールの定義', function() {
    it('`define(name, obj)` は、モジュールを定義する', function() {
      var _this = this;
      define('my_name', function() {
        return function() {
          return 'John Smith';
        };
      });
      require('my_name').always(this.stop).done(this.done).done(function(my_name) {
        _this.my_name = my_name;
      });
      return this.async(function() {
        expect(_this.done).toHaveBeenCalled();
        return expect(_this.my_name()).toEqual('John Smith');
      });
    });
    return it('`define(name, depencencies, obj)` は、依存のあるモジュールを定義する', function() {
      var _this = this;
      define('my_abc', ['abc'], function(abc) {
        return abc.toString;
      });
      require('my_abc').always(this.stop).done(this.done).done(function(my_abc) {
        _this.my_abc = my_abc;
      });
      return this.async(function() {
        expect(_this.done).toHaveBeenCalled();
        return expect(_this.my_abc()).toEqual('abc');
      });
    });
  });

}).call(this);
