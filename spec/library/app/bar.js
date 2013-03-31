// ~app/bar.js

app.bar = {
	called: false,
	init: function () {
		this.called = true;
	},
	toString: function () {
		return 'app.bar';
	}
};
