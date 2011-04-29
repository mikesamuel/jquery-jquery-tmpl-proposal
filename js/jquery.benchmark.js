var queue = [];

$.benchmarkRunning = false;

$.runBenchmark = function () {
  if (queue.length === 0) {
    $.benchmarkRunning = false;
    try {
      // Call out to template-benchmarks.html to run next.
      window.parent.signalDone();
    } catch (ex) {
      // ok
    }
    return; 
  }

  var task = queue[0];
  queue.splice(0, 1);

  var times = task[0], result_selector = task[1], func = task[2];

  var i = times;
  var startTime = +new Date;
  while (--i >= 0) { func(); }

  // Intentionally delay sampling endTime until after DOM has been rendered.
  setTimeout(function () {
    var endTime = +new Date;
    if (times !== 1) { output.empty(); }
    var result = (endTime-startTime)/times;
    $(result_selector).append(result.toFixed(3) + "/run for " + times + ". ");

    setTimeout($.runBenchmark, 100);
  },10);
};

// based on methodology developed by PPK:
// http://www.quirksmode.org/blog/archives/2009/08/when_to_read_ou.html
$.benchmark = function(times, result_selector, func){
  var kickoff = queue.length == 0;

  queue.push([times, result_selector, func]);
  if (!$.benchmarkRunning) {
    $.benchmarkRunning = true;
    $.runBenchmark();
  }
};

$.benchmarks = {};
