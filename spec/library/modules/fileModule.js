define(['abc'], function (abc) {
	return {
		abc: abc.toString(),
		toString: function () {
			return 'fileModule';
		}
	};
});
