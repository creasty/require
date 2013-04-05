# require

AMD に対応していないモジュールの依存解決も簡単で、より高速な、新しいモジュールローダーライブラリ。


# 特徴

## 1. 高速

RequireJS は読み込みをずらして依存関係を解決しますが、  
require は読み込みは並列で行い、**実行のタイミングだけをずらす**ので、より高速です。

**RequireJS の場合**

	a: [------------]***
	b:                  [--------]***
	c:                               [------]***
	d:                                          [----------]***

`[-]`: 読み込み, `***`: 実行

**require の場合**

	a: [------------]***
	b: [--------]       ***
	c: [------]            ***
	d: [----------]           ***


`[-]`: 読み込み, `***`: 実行


## 2. モジュール名(パス)による依存関係の解決

スラッシュで区切られたモジュール名は依存関係を表し、
頭から順番に展開されます。

	foo/bar/baz

という名前で定義されたモジュールは次のように展開されます。

	foo
	foo/bar      # foo/bar は foo に依存
	foo/bar/baz  # foo/bar/baz は foo と foo/bar に依存

これは、AMD に対応していないモジュールが大量にあるときに役立ちます。


### 例

```js
require.config({
  shim: {
    'abc': ['a', 'b', 'c'] // a.js -> b.js -> c.js の順に実行される
  }
})

// ------

require(['abc/x'], function (x) {
  // a.js
  // b.js
  // c.js
  // abc/x.js
  // の順で読み込み完了
});
require(['abc/y/z'], function (z) {
  // a.js
  // b.js
  // c.js
  // abc/y.js
  // abc/y/z.js
  // の順で読み込み完了
});
```

## 3. スマート Exports

`exports` が特に指定されていない場合、モジュール名を名前空間のようにみなしたオブジェクトが exports されます。
例えば、モジュール `foo/bar` は、自動的に `window.foo.bar` を exports します。


## 4. キャッシュ機能

require は標準で localStorage にキャッシュする機能を持っています。

```js
// キャッシュ機能をオン (デフォルトではオフ)
require.config({
  cache: true
});

// すべてのキャッシュを消去
require.cache.clear();
```


## 5. CSS の読み込み対応

標準で対応しています。
CSS ファイルないの相対パスも読み込みディレクトリに合わせて最適化されます。



# 基本的な使い方

API の詳しい説明は今度ちゃんと wiki 作ります。  
それまでは、spec でも見といて。


## ディレクトリ構成

	|-- index.html
	|-- lib/
	|   |-- main.js
	|   |-- app.js
	|   |-- app/
	|   |   |-- cart/
	|   |   |   |-- cart.js
	|   |   |   `-- cart.css
	|   |   `-- sub.js
	|   `-- modules/
	|       |-- foo.js
	|       `-- bar.js
	`-- vendors/
	    |-- require.js
	    `-- jquery.js

## index.html

```html
<!-- 注意: require は jquery に依存しています！ -->
<script src="vendors/jquery.js"></script>
<script src="vendors/require.js" data-main="lib/main.js"></script>
```

## main.js

```js
require.config({
  baseUrl: './lib/modules',
  paths: {
    'app': '../app'
  }
  cache: true, // localStorage にキャッシュする
  shim: {
    'app/cart': ['./cart', './cart.css'] // .js と .css を読み込む
  }
});
```


## モジュール呼び出し

```js
require(['foo'], function (foo) {
  // ./lib/modules/bar.js
  // ./lib/modules/foo.js
  // の読み込み完了

  console.log(foo.bar);
});

require(['app'], function (app) {
  // ./lib/app.js
  // の読み込み完了

  console.log(app.version);
});

require(['app/sub'], function (sub) {
  // ./lib/app.js
  // ./lib/app/sub.js
  // の順で読み込み完了

  sub();
});

require(['app/cart'], function (cart) {
  // ./lib/app.js
  // ./lib/app/cart/cart.js
  // ./lib/app/cart/cart.css
  // の順で読み込み完了

  cart.add('an apple');
});
```

## 各ファイル(モジュール)の中身

### foo.js (AMD 対応)

```js
define(['bar'], function (bar) {
  // ./lib/module/bar.js に依存したモジュールの定義

  return {
    bar: bar.toString() // bar が使える
  };
});
```

### bar.js (AMD 対応)

```js
define({
	toString: function () {
		return 'this is bar'
	}
});
```

### app.js (AMD 非対応)

```js
app = {
  version: '1.0'
};
```

### sub.js (AMD 非対応)

```js
app.sub = function () {
  alert('Hi, there!');
};
```

### cart.js (AMD 非対応)

```js
app.cart = {
  add: function (item) {
    console.log('added', item);
  }
};
```

# TODO

- jQuery 非依存に書き換えるか、独立版を作るつもり


# License

MIT
