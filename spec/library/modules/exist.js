define(function () {
	var config = require.config();

	var waitsFor = function (latch, done, fail) {
		var cycle = 0;

		if (config.interval <= 0)
			require.error('Config::interval should be grater than 0');

		var limit = config.timeout / config.interval;

		(function call() {
			if (++cycle > limit) {
				if (fail) fail();
				return;
			}

			if (latch()) {
				if (done) done();
			} else {
				setTimeout(call, config.interval);
			}
		})();
	};

	// Actual implementation
	var exist = function (ns, done, fail) {
		ns = require.sanitizeNamespace('window.' + ns);

		var latch = new Function('return ' + ns + ' != null');

		var _done = function () {
			if (done) done(require.useNamespace(ns));
		};

		waitsFor(latch, _done, fail);
	};

	// Plugin handler
	this.plugin = function (dfd, pkg, arg) {
		exist(arg, function (ns) {
			dfd.resolve({
				pkg: pkg,
				exports: function (){
					return ns;
				}
			});
		}, function () {
			dfd.reject(pkg, 'timeout');
		});
	};

	// Export module
	return exist;
});
