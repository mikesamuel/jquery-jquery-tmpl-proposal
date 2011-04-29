var output = $("#output").empty();

var nRunning = 0;

// based on methodology developed by PPK:
// http://www.quirksmode.org/blog/archives/2009/08/when_to_read_ou.html
$.benchmark = function(times, result_selector, func){
  ++nRunning;

  var i = times;
  var startTime = +new Date;
  while (--i >= 0) { func(); }

  // Intentionally delay sampling endTime until after DOM has been rendered.
  setTimeout(function () {
    var endTime = +new Date;
    var result = (endTime-startTime)/times;
    $(result_selector).text(result.toFixed(3));
    output.empty();
    if (!--nRunning) {
      // Call out to template-benchmarks.html to run next.
      window.parent.signalDone();
    }
  },10);
};

$.benchmarks = {};
