
'use strict'

$        = jQuery
window   = this
document = window.document
localStorage = window.localStorage
$head    = $ 'head'

defQueue = []
defQueueId = 0
fileHasDefine = /\bdefine\s*\(/

MILLISEC_DAY = 86400000 # 1000 msec * 60 sec * 60 min * 24 hr = 1 d

config =
  prefix:     'require-'
  base:       './'
  paths:      {}
  modules:    {}
  injectors:  {}
  alts:       []
  maps:       []
  cache:      true
  debug:      false
  override:   false
  expiration: 30 # day
  interval:   10 # msec
  timeout:    6000 # msec

# Utils
#-----------------------------------------------
utils =
  replace: (text, pattern, to) ->
    if typeof pattern == 'string'
      # simple replace all
      text.split(pattern).join to
    else
      # use regexp
      text.replace pattern, to

  doAlts: (name) ->
    type = @getPackageType name

    for r in config.alts when !r.type || r.type == type
      name = @replace name, r.pattern, r.to

    name

  doMaps: (uri) ->
    if path = /^(\~([a-z_\$]\w*)\/|[a-z_\$]\w*)/i.exec uri
      if path[2] && config.paths[path[2]]
        path = path[2]
      else
        path = path[1]

      for r in config.maps when !r.path || r.path == path
        uri = @replace uri, r.pattern, r.to

    uri

  inject: (uri, data) -> config.injectors[@getFileExtension uri]? data, uri

  getFileExtension: (file) -> /(\w+)([\?#].+)?$/.exec(file.toLowerCase())?[1]

  sanitizeNamespace: (ns) ->
    ns
    .replace(/\//g, '.')            # regard slashes as dot
    .replace(/[^\w\.\$]+/g, '_')    # invalid charators
    .replace(/\b(\d+)/g, '_$1')     # unexpected numeric token
    .replace(/\.+/g, '.')           # densed dots
    .replace(/^\.*(.+?)\.*$/, '$1') # trim head & tail dots

  getPackageType: (pkg) ->
    if pkg.indexOf('!') > 0
      'plugin'
    else if pkg.match(/^(\.\/|)/) && !config.injectors[/\w+$/.exec(pkg)?[0]]
      'package'
    else
      'path'

  fixBase: (name, base) ->
    if '.' == name
      base
    else if './' == name[0...2]
      if config.injectors[/\w+$/.exec(name)?[0]] # check if path
        '~/' + base + '/' + name[2..]
      else
        base + '/' + name[2..]
    else
      name

  trimDots: (uri) ->
    parts = []

    for part in uri.split '/'
      if '..' == part && _i != 0
        parts.pop()
      else if '.' != part
        parts.push part

    parts.join '/'

  toUri: (pkg) ->
    pkg = switch @getPackageType pkg
      when 'path'
        @doMaps(pkg).replace /^\~\/((\w*)\/)?/, (_0, _1, _2) =>
          p = config.paths[_2]
          config.base + '/' + (if p then p + '/' else _1 ? '')
      when 'package'
        pkg = @doMaps(pkg).replace /^\w+/, (_0) ->
          config.paths[_0] ? _0

        config.base + '/' + pkg + '.js'
      else
        pkg

    @trimDots pkg

  getFullPackages: (packages) -> new FullPackages(packages).get()

  useNamespace: (ns, create, set) ->
    parent = window
    ns = @sanitizeNamespace ns

    for space in ns.split '.'
      unless parent[space]?
        if create
          parent[spaces] = {}
        else
          return set

      pp = parent
      parent = parent[space]

    if set
      pp[space] = set
    else
      parent

  error: -> throw new Error [arguments...].join ' '
  log: -> console.log '[log]', arguments... if config.debug

# Resolve Package
#-----------------------------------------------
class FullPackages
  constructor: (@packages) -> @added = {}

  checkAdded: (pkg) ->
    @added[pkg] >>>= 0
    @added[pkg]++

  addDependencies: (list, pkg) ->
    spaces = pkg.split '/'

    for i in [1...spaces.length] by 1
      ns =  spaces[0...i].join '/'

      continue if @added[ns]

      if config.modules[ns]
        list.push @expand([ns])...
        @checkAdded ns
      else
        @addSinglePackage list, ns

    list

  addModulePackage: (list, pkg, silent) ->
    if def = config.modules[pkg]
      return if @checkAdded pkg

      def = $.extend { pkg, silent, modules: [] }, def

      def.modules =
        for m in def.modules
          m = utils.doAlts m
          m = utils.fixBase m, pkg

          @addDependencies list, m if 'package' == utils.getPackageType m

          if m != pkg && config.modules[m]
            list.push @expand([m])...
            continue
          else
            { name: m, uri: utils.toUri m }

      list.push def
    else
      @addSinglePackage list, pkg

  addSinglePackage: (list, pkg) ->
    return if @checkAdded pkg
    list.push { pkg, modules: [name: pkg, uri: utils.toUri pkg] }

  addPluginPackage: (list, pkg) ->
    return if @checkAdded pkg
    list.push { pkg, modules: [name: pkg, func: pkg] }

  expand: (packages) ->
    list = []

    for pkg in packages
      if silent = ('&' == pkg.charAt 0)
        pkg = pkg.substr 1

      pkg = utils.doAlts pkg
      type = utils.getPackageType pkg

      if 'path' == type
        @addSinglePackage list, pkg
      else if 'plugin' == type
        @addPluginPackage list, pkg
      else # package
        @addDependencies list, pkg
        @addModulePackage list, pkg, silent

    list

  get: -> @expand @packages

# Cache
#-----------------------------------------------
cache =
  set: (name, data) ->
    return unless config.cache && localStorage

    timestamp = +new Date()

    try localStorage.setItem config.prefix + name, timestamp + data

    utils.log 'Cached ', name

  get: (name) ->
    return unless config.cache && localStorage && data = localStorage.getItem config.prefix + name

    timestamp = +data[0...13]
    data = data[13..]

    return if +new Date() > timestamp + config.expiration * MILLISEC_DAY

    utils.log 'Loaded form cache', name

    data

  remove: (name) ->
    return unless localStorage

    localStorage.removeItem config.prefix + utils.toUri utils.doAlts name

  clear: ->
    return unless localStorage

    for key of localStorage when key && key.indexOf(config.prefix) == 0
      localStorage.removeItem key

# Exports
#-----------------------------------------------
exports =
  exports: {}

  unwrap: (set) ->
    if set.pkg
      def = config.modules[set.pkg] ? set
      modules = def.modules ? []

      if $.isFunction set.exports
        args = for name in modules
          name = utils.fixBase utils.doAlts(name), set.pkg
          @get (if name == set.pkg then '#' else '') + name

        try set.exports = set.exports.apply def, args
      else
        set.exports
    else
      set.data

  set: (set) ->
    _name = set.name ? set.pkg
    name = (if set.name then '#' else '') + _name
    type = utils.getPackageType _name

    return if get = @get name

    @exports[name] = @unwrap(set) ? {}

    if 'package' == type
      # note this set.exports has been affected by @unwrap
      @exports[name] = utils.useNamespace(_name, false, set.exports) ? {}
    else if 'plugin' != type && set.pkg
      @exports[_name] = @get('#' + _name) ? {}

    utils.log 'Exported', name

  get: (name, like = false) ->
    if @exports[name]
      @exports[name]
    else if like
      for key, val of @exports
        break if key.indexOf name == 0
        val = null

      val

  remove: (name) -> @exports[name] = undefined

# Loader
#-----------------------------------------------
loader =
  status: {}

  getStatus: (name, wrap) ->
    if wrap
      # prevent from re-inject and re-export
      wrapper = $.Deferred()
      @status[name].then (-> wrapper.resolve()), wrapper.reject
      wrapper.promise()
    else
      @status[name]

  setStatus: (name, status) -> @status[name] = status

  getData: (name, uri, opt = {}) ->
    dfd = $.Deferred()

    if data = cache.get uri
      dfd.resolve { name, uri, data, inject: true }
    else
      ext = utils.getFileExtension uri
      opt = $.extend
        url: uri
        timeout: config.timeout
        cache: config.cache
        dataType: if 'function' == typeof config.injectors[ext] then 'text'
      , opt

      $.ajax(opt)
      .done (data) ->
        utils.log 'Ajax loaded', uri
        cache.set uri, data

        if 'js' == ext && data.match fileHasDefine
          defQueue[defQueueId] = { name, dfd }
          utils.inject uri, data.replace(fileHasDefine, "require.defineByQueue(#{defQueueId++},")
        else
          dfd.resolve { name, uri, data, inject: true }

      .fail (xhr, status) ->
        dfd.reject name, status
        utils.error 'Ajax', status, uri

    dfd.promise()

  invokeFunction: (name, pkg) ->
    dfd = $.Deferred()

    [func, arg] = pkg.split '!'

    # get exports from its module
    # ensure that the module has been loaded
    new Require([func]).then ->
      if plugin = config.modules[func]?.plugin
        plugin dfd, name, (arg ? '')
      else
        dfd.resolve name, 'noplugin'
    , dfd.reject

    dfd.done (set) -> exports.set set if set

    dfd.promise()

  loadPackage: (pkg) ->
    queues = for { name, uri, func } in pkg.modules
      if @getStatus name
        @getStatus name, true
      else if func
        @setStatus name, @invokeFunction name, func
      else
        @setStatus name, @getData name, uri

    $.when queues...

  load: (modules) ->
    packages = utils.getFullPackages modules
    dfd = $.Deferred()

    promises = for pkg in packages
      if @getStatus pkg.pkg
        @getStatus pkg.pkg, true
      else
        @setStatus pkg.pkg, @loadPackage pkg

    $.when(promises...)
    .done =>
      # now each promises are called asynchronously
      # so we need to wrap them up in order to excute and inject sequentialy
      @finish promises, packages, dfd.resolve
    .fail dfd.reject

    dfd.promise()

  finish: (promises, packages, resolve) ->
    return resolve() unless promise = promises.shift()

    promise.done =>
      pkg = packages.shift()

      for set in arguments
        continue unless set

        utils.inject set.uri, set.data if set.inject
        exports.set set if set.name

      exports.set pkg

      args = for name in config.modules[pkg.pkg]?.modules ? []
        exports.get utils.fixBase utils.doAlts(name), pkg.pkg

      pkg.init? args...
      pkg.runs? args... unless pkg.silent

      @finish promises, packages, resolve

# Require
#-----------------------------------------------
class Require
  constructor: (@modules) -> @loader = loader.load @modules

  _fn: (method, fn...) ->
    @loader[method] fn...
    @

  get: (name = false) ->
    if name != false
      name = @modules[name] if $.isNumeric name
      exports.get utils.doAlts(name), true
    else
      exports.get utils.doAlts name for name in @modules

  done: (callback) -> @_fn 'done', => callback.apply @, @get()
  fail: (callback) -> @_fn 'fail', callback
  progress: (callback) -> @_fn 'progress', callback

  always: (callback) -> @_fn 'always', callback

  then: (done, fail, progress) ->
    @_fn 'then', (=> done.apply @, @get()), fail, progress

# Plugin Export
#-----------------------------------------------
require = (x, y, z) ->
  if $.isFunction y
    new Require(x).then y, z
  else
    new Require arguments

define = (x, y, z, override = false) ->
  return config.modules unless x?

  # swap args
  [y, z] =
    if $.isArray(y) && z?
      [y, z]
    else if y?
      [[], y]

  # exit if it cannot be overrided
  return if config.modules[x] && !(override || config.override)

  # define new module
  undef x
  config.modules[x] = modules: y, exports: z

undef = (name) ->
  _name = utils.doAlts name
  loader.setStatus _name, null
  exports.remove _name
  config.modules[name] = undefined

$.extend require, utils,
  cache: cache
  exports: exports
  loader: loader

  main: ->
    main = $('script[data-main]').eq 0

    return unless main.length == 1

    main = utils.toUri main.data 'main'
    loader.getData('__main', main, async: false).done ({data, uri}) ->
      utils.inject uri, data

  config: (settings) ->
    if $.isPlainObject settings
      # deep copy
      settings.modules = $.extend config.modules, settings.modules if settings.modules
      settings.alts = $.extend config.alts, settings.alts if settings.alts
      settings.maps = $.extend config.maps, settings.maps if settings.maps

      # sallow copy
      $.extend config, settings
    else
      config

  undef: undef

  define: define

  defineByQueue: (id, args...) ->
    queue = defQueue[id]

    return false unless queue

    args.unshift queue.name unless 'string' == typeof args[0]

    define args..., true

    loader.load([args[0]]).then queue.dfd.resolve, queue.dfd.reject if queue

    defQueue[id] = undefined

    true

  injectors: (settings) ->
    if $.isPlainObject settings
      $.extend config.injectors, settings
    else
      config.injectors

  alts: (x) ->
    if x
      $.extend config.alts, arguments
    else
      config.alts

  maps: (x) ->
    if x
      $.extend config.maps, arguments
    else
      config.maps

  toUri: (pkg) -> utils.toUri utils.doAlts pkg ? ''

# Default
#-----------------------------------------------
fired = {}
$(document).ready -> fired.ready = true
$(window).load -> fired.load = true

define 'jquery', -> $

define 'ready', ->
  ready = (fn) ->
    if fired.ready
      fn()
    else
      $(document).ready fn

  @plugin = (dfd, pkg) ->
    ready ->
      dfd.resolve { pkg, exports: document }

  ready

define 'load', ->
  load = (fn) ->
    if fired.load
      fn()
    else
      $(window).load fn

  @plugin = (dfd, pkg) ->
    load ->
      dfd.resolve { pkg, exports: window }

  load

require.injectors
  css: (data, uri) ->
    # in css relative urls are resolved by its loading path
    # use `uri` as a base path to convert them to absolute urls
    base = uri.replace /[^\/]*$/, ''
    data = data.replace /url\(('|"|)(?!\/|(https?:)?\/\/)(.+?)\1\)/g, "url(#{base}$3)"

    $head.append "<style>#{data}</style>"
    utils.log 'Injected CSS', uri

  js: (data, uri) ->
    # escape closing tag
    data = data.replace /<\/script>/g, '<\\/script>'

    # synchronized excution
    $.globalEval data
    utils.log 'Injected JavaScript', uri

  json: true

require.main()

# Expose to the global
#-----------------------------------------------
window.require = require
window.define = define

