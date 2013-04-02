(function() {

  beforeEach(function() {
    var flag, spy;
    flag = false;
    spy = function(name) {
      return jasmine.createSpy(name).andCallFake(function() {
        return flag = true;
      });
    };
    this.done = spy('Async done');
    this.fail = spy('Async fail');
    this.stop = spy('Async stop');
    return this.async = function(fn) {
      waitsFor(function() {
        return flag;
      });
      return runs(fn);
    };
  });

}).call(this);
