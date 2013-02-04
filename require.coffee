###!
 * Require v1.4.2
 *
 * @author ykiwng
###


do ($ = jQuery, window, document) ->
	$head = $ 'head'
	MILLISEC_DAY = 1000 * 60 * 60 * 24 # 1000 milisec * 60 sec * 60 min * 24 hr = 1 d

	inject = ({uri, data}) ->
		ext = /(\w+)([\?#].+)?$/.exec(uri)?[1]?.toLowerCase()

		if 'css' == ext
			base = uri.replace /[^\/]*$/, ''
			data = data.replace /url\(('|"|)(?!\/|(https?:)?\/\/)(.+?)\1\)/g, "url(#{base}$3)"
			$head.append $('<style/>').html(data)

		if 'js' == ext
			$.globalEval data

	existObject = (symbol, callback) ->
		symbol = symbol.replace(/[^\w\$\.]/g, '').replace(/(^|\.)([0-9\.]+|$)/g, '') # sanitizing
		check = new Function "return window.#{symbol} != null"

		timer = setInterval ->
			if check()
				clearInterval timer
				callback()
		, 10

	cache =
		docache: true
		prefix: 'require-'
		expiration: 30 * MILLISEC_DAY

		set: (uri, data) ->
			return unless @docache and window.localStorage

			timestamp = +new Date()
			localStorage.setItem @prefix + uri, timestamp + data

		get: (uri) ->
			return unless @docache and window.localStorage and data = localStorage.getItem @prefix + uri

			timestamp = +data[0...13]
			data = data[13..]

			return if +new Date() > timestamp + @expiration

			data

		clear: ->
			for key of localStorage
				localStorage.removeItem key if key.indexOf(@prefix) == 0

			true

	loader =
		path: ''
		abbr: {}
		assets: {}
		status: {}

		getStatus: (name) -> @status[name]
		setStatus: (name, status) -> @status[name] = status

		expandAbbr: (path) ->
			path.replace /^~(\w*)\//, (_0, _1) =>
				dir = @path
				dir += @abbr[s] ? '' for s in _1.split ''
				dir

		getData: (uri) ->
			cue = $.Deferred()

			if data = cache.get uri
				cue.resolve {uri, data}
			else
				$.ajax
					url: uri
					processData: false
				.then (data) ->
					cache.set uri, data
					cue.resolve {uri, data}
				, cue.reject

			cue.promise()

		_load: (dfd, pkg, files, silent) ->
			init = $.noop

			cues = for path in files
				if $.isFunction path
					init = path
					continue

				if @getStatus path
					@getStatus path
				else
					@setStatus path, @getData @expandAbbr path

			$.when(cues...)
			.then ->
				inject arg for arg in arguments
				init(silent)
				dfd.resolve()
			, dfd.reject

		load: (assets) ->
			promises = for pkg in assets
				if $.isArray pkg
					@load pkg
				else if @getStatus pkg
					@getStatus pkg
				else
					if 'string' == typeof pkg && '&' == pkg.charAt 0
						silent = true
						pkg = pkg.substr 1

					files = @assets[pkg]
					dfd = $.Deferred()

					switch true
						# package
						when !!files
							@_load dfd, pkg, files, !!silent
						# dot notation
						when !!pkg.match /^[\.\w\$]+$/
							path = @path + pkg.replace(/([^\.])\.([^\.])/g, '$1/$2').replace(/\.\./g, '.') + '.js'
							@_load dfd, pkg, [path]
						# normal path
						when pkg.indexOf('/') >= 0
							@_load dfd, pkg, [pkg]
						# object
						when '@' == pkg.charAt(0)
							existObject pkg, dfd.resolve
						# dom ready
						when '!ready' == pkg
							$(document).ready dfd.resolve
						# load
						when '!load' == pkg
							$(window).load dfd.resolve
						# fallback
						else
							dfd.resolve()

					@setStatus pkg, dfd.promise()

			$.when promises...

	require = -> loader.load arguments

	$.extend require,
		setPath: (path, abbr) ->
			if path && typeof path == 'string'
				loader.path = path

			if $.isPlainObject abbr
				$.extend loader.abbr, abbr

			loader.path

		setExpiration: (day) -> cache.expiration = (day >> 0) * MILLISEC_DAY

		define: (assets) ->
			if $.isPlainObject assets
				$.extend loader.assets, assets

			loader.assets

		path: (path) -> loader.path + (path ? '')

		cache: (bool) -> cache.docache = !!bool
		clearCache: -> cache.clear()

		ready: $(document).ready
		load: $(window).load

	# expose to the global
	window.require = require
