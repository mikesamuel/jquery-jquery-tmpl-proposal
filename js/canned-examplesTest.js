(function () {
  for (var i = 0, n = cannedExamples.length; i < n; ++i) {
    var exampleName = cannedExamples[i].name.replace(/\W+/g, '_');
    this['testExample' + i + '_' + exampleName] = (
        function (example) {
          return function () {
            assertEquals(
                example.name,
                example.result,
                String(eval(desugar(example.sugaryJs))));
            // Run it twice to make sure any caching survives
            // at least one repeat.
            assertEquals(
                example.name,
                example.result,
                String(eval(desugar(example.sugaryJs))));
          };
        })(cannedExamples[i]);
  }
})();
