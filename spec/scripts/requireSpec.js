(function() {

  require.config({
    base: './spec/library/modules',
    paths: {
      app: '../app'
    },
    cache: false,
    debug: true,
    modules: {
      'abc': {
        modules: ['.', 'def', 'ghi']
      },
      'xyz': {
        modules: ['.'],
        exports: function(xyz) {
          return xyz.toString;
        }
      },
      'app': {
        modules: ['.', './app.css']
      },
      'app/foo': {
        modules: ['.', './foo.css']
      },
      'app/bar': {
        modules: ['.'],
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

  describe('require.toUri(pkg)', function() {
    var config;
    config = require.config();
    it('`pkg` が "/", "../" ではじまるとき、相対パスとみなしてそのままの値を返す', function() {
      var x1, x2;
      x1 = '/dir/file.js';
      x2 = '../dir/file.js';
      expect(require.toUri(x1)).toEqual(x1);
      return expect(require.toUri(x2)).toEqual(x2);
    });
    it('`pkg` が "./" で始まる場合は、これ以降を返す', function() {
      var x, y;
      x = './dir/file.js';
      y = 'dir/file.js';
      return expect(require.toUri(x)).toEqual(y);
    });
    it('`pkg` が "~/" ではじまるとき、base からの URL を返す', function() {
      var x, y;
      x = require.toUri('~/dir/file.js');
      y = 'spec/library/modules/dir/file.js';
      return expect(x).toEqual(y);
    });
    it('`pkg` が "~/path" ではじまるとき、base + paths からの URL を返す', function() {
      var x, y;
      x = require.toUri('~/app/dir/file.js');
      y = 'spec/library/app/dir/file.js';
      return expect(x).toEqual(y);
    });
    return it('`pkg` が上のいずれにも当てはまらず拡張子を含まないとき、パッケージとみなして base + paths からの URL を返す', function() {
      var x, y;
      x = require.toUri('foo/bar/baz');
      y = 'spec/library/modules/foo/bar/baz.js';
      return expect(x).toEqual(y);
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
          modules: [
            {
              name: 'app',
              uri: require.toUri('app')
            }, {
              name: require.fixBase('./app.css', 'app'),
              uri: require.toUri('~/app/app.css')
            }
          ]
        }, {
          pkg: 'app/foo',
          silent: false,
          modules: [
            {
              name: 'app/foo',
              uri: require.toUri('app/foo')
            }, {
              name: require.fixBase('./foo.css', 'app/foo'),
              uri: require.toUri('~/app/foo/foo.css')
            }
          ]
        }, {
          pkg: 'xyz',
          silent: true,
          modules: [
            {
              name: 'xyz',
              uri: require.toUri('xyz')
            }
          ]
        }, {
          pkg: 'aaa',
          modules: [
            {
              name: 'aaa',
              uri: require.toUri('aaa')
            }
          ]
        }, {
          pkg: 'aaa/bbb',
          modules: [
            {
              name: 'aaa/bbb',
              uri: require.toUri('aaa/bbb')
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
      it('各モジュールは .done 関数の中で `this.get(name)` を使って取得するか、引数で受け取る', function() {
        var x,
          _this = this;
        x = {};
        require('xyz').always(this.stop).done(this.done).done(function(arg) {
          x.arg = arg;
          return x.get = this.get(0);
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
