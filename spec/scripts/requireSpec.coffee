
#=== Config
#==============================================================================================
require.config
  baseUrl: './spec/library/modules'
  paths:
    'app': '../app'
  cache: false
  debug: true
  shim:
    'abc': ['.', 'def', 'ghi']

    'xyz':
      deps: ['.']
      exports: (xyz) -> xyz.toString

    'app': ['.', './app.css']

    'app/foo': ['.', './foo.css']

    'app/bar':
      deps: ['.']
      init: (appBar) ->
        return if @called
        appBar.init()
        @called = true

# /\bjquery(?!\/)\b/ -- only for file
# /\bjquery\// -- only for folder


#=== Utils
#==============================================================================================
describe 'require.toUri(pkg)', ->
  config = require.config()

  it '`pkg` が "/", "../" ではじまるとき、相対パスとみなしてそのままの値を返す', ->
    x1 = '/dir/file.js'
    x2 = '../dir/file.js'

    expect(require.toUri x1).toEqual x1
    expect(require.toUri x2).toEqual x2

  it '`pkg` が "./" で始まる場合は、これ以降を返す', ->
    x = './dir/file.js'
    y = 'dir/file.js'

    expect(require.toUri x).toEqual y

  it '`pkg` が "~/" ではじまるとき、base からの URL を返す', ->
    x = require.toUri '~/dir/file.js'
    y = 'spec/library/modules/dir/file.js'

    expect(x).toEqual y

  it '`pkg` が "~/path" ではじまるとき、base + paths からの URL を返す', ->
    x = require.toUri '~/app/dir/file.js'
    y = 'spec/library/app/dir/file.js'

    expect(x).toEqual y

  it '`pkg` が上のいずれにも当てはまらず拡張子を含まないとき、パッケージとみなして base + paths からの URL を返す', ->
    x = require.toUri 'foo/bar/baz'
    y = 'spec/library/modules/foo/bar/baz.js'

    expect(x).toEqual y

describe 'require.getFullPackages(packages)', ->
  it '依存関係にあるすべてのモジュールを含めた配列を返す', ->
    x = require.getFullPackages [ # modules
      'app/foo'
      '&xyz'
      'aaa/bbb'
    ]

    y = [ # packages
      { # pkg
        pkg: 'app'
        silent: false
        deps: [ # deps
          { # module
            name: 'app'
            uri: require.toUri 'app'
          }
          {
            name: require.fixBase './app.css', 'app'
            uri: require.toUri '~/app/app.css'
          }
        ]
      }
      {
        pkg: 'app/foo'
        silent: false
        deps: [
          {
            name: 'app/foo'
            uri: require.toUri 'app/foo'
          }
          {
            name: require.fixBase './foo.css', 'app/foo'
            uri: require.toUri '~/app/foo/foo.css'
          }
        ]
      }
      {
        pkg: 'xyz'
        silent: true
        deps: [
          {
            name: 'xyz'
            uri: require.toUri 'xyz'
          }
        ]
      }
      {
        pkg: 'aaa'
        deps: [
          {
            name: 'aaa'
            uri: require.toUri 'aaa'
          }
        ]
      }
      {
        pkg: 'aaa/bbb'
        deps: [
          {
            name: 'aaa/bbb'
            uri: require.toUri 'aaa/bbb'
          }
        ]
      }
    ]

    expect(JSON.stringify x).toEqual JSON.stringify y


#=== Loader
#==============================================================================================
describe 'require(args...)', ->
  # Defined Module
  #-----------------------------------------------
  describe 'パッケージ読み込み', ->
    it 'パッケージは並列非同期で読み込まれ、定義された順番でインジェクトされる', ->
      require('abc')
      .always(@stop)
      .done @done

      @async =>
        expect(@done).toHaveBeenCalled()
        expect(abc.order).toEqual 0
        expect(def.order).toEqual 1
        expect(ghi.order).toEqual 2

    it '各モジュールは .done 関数の中で `this.get(name)` を使って取得するか、引数で受け取る', ->
      x = {}

      require('xyz')
      .always(@stop)
      .done(@done)
      .done (arg) ->
        x.arg = arg
        x.get = @get 0

      @async =>
        expect(@done).toHaveBeenCalled()
        expect(x.get).toBe x.arg
        expect(x.get()).toEqual 'xyz'

    it 'パッケージは名前空間のペアレントから順番に依存するパッケージを読み込む', ->
      require('app/foo')
      .always(@stop)
      .done @done

      @async =>
        expect(@done).toHaveBeenCalled()
        expect(app.foo).toBeDefined()

    it '`init` はパッケージの読み込みが終わったら直ぐ呼ばれる', ->
      require('app/bar')
      .always(@stop)
      .done @done

      @async =>
        expect(@done).toHaveBeenCalled()
        expect(app.bar.called).toBeTruthy()

    it 'json ファイルはパースされた結果が export される', ->
      require('~/sample.json')
      .always(@stop)
      .done(@done)
      .done (@json) =>

      @async =>
        expect(@done).toHaveBeenCalled()
        expect(@json.file).toEqual 'sample.json'

    it 'ファイル内で定義したモジュールを利用する', ->
      require('fileModule')
      .always(@stop)
      .done(@done)
      .done (@fileModule) =>

      @async =>
        expect(@done).toHaveBeenCalled()
        expect(@fileModule.abc).toEqual 'abc'
        expect(@fileModule.toString()).toEqual 'fileModule'

  # Function Invoke
  #-----------------------------------------------
  describe 'プラグイン "func!arg"', ->
    it 'ready! は DOM が利用可能になった時点で resolve する', ->
      require('ready!')
      .always(@stop)
      .done @done

      @async => expect(@done).toHaveBeenCalled()

    it 'load! はページが完全に読み込まれた時点で resolve する', ->
      require('load!')
      .always(@stop)
      .done @done

      @async => expect(@done).toHaveBeenCalled()

    it 'ファイル内で定義したモジュールをプラグインとして利用する', ->
      require('exist!testNamespace')
      .always(@stop)
      .done @done
      .done (@ns) =>

      setTimeout ->
        window.testNamespace = {}
      , 1000

      @async =>
        expect(@done).toHaveBeenCalled()
        expect(window.testNamespace).toBeDefined()
        expect(@ns).toBe window.testNamespace


#=== Define / Create
#==============================================================================================
describe '単一モジュールの定義', ->
  it '`define(name, obj)` は、モジュールを定義する', ->
    define 'my_name', -> -> 'John Smith'

    require('my_name')
    .always(@stop)
    .done(@done)
    .done (@my_name) =>

    @async =>
      expect(@done).toHaveBeenCalled()
      expect(@my_name()).toEqual 'John Smith'

  it '`define(name, depencencies, obj)` は、依存のあるモジュールを定義する', ->
    define 'my_abc', ['abc'], (abc) -> abc.toString

    require('my_abc')
    .always(@stop)
    .done(@done)
    .done (@my_abc) =>

    @async =>
      expect(@done).toHaveBeenCalled()
      expect(@my_abc()).toEqual 'abc'

