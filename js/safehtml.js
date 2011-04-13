// A safe HTML interpolation scheme that uses contextual autoescaping to
// choose appropriate escapers for dynamic values.

/** @define {boolean} See pretty-quasi-output.js */
var USE_PRETTY_QUASI;

var safehtml, safeHtmlChooseEscapers;

(function () {
  var cacheSize = 0;
  var cache = {};

  function compose(f, g) {
    return function (x) { return f(g(x)); };
  }

  safeHtmlChooseEscapers = function (htmlTextChunks) {
    var nChunks = htmlTextChunks.length;

    for (var i = nChunks; --i >= 0;) {
      htmlTextChunks[i] = String(htmlTextChunks[i]).replace(/\u0000+/g, '');
    }
    var key = htmlTextChunks.join('\u0000');
    if (cache.hasOwnProperty(key)) {
      return cache[key];
    }

    var context = STATE_HTML_PCDATA;

    var sanitizerFunctions = [];
    var prettyPrintDetails = USE_PRETTY_QUASI ? [] : void 0;
    for (var i = 0; i < nChunks - 1; ++i) {
      var htmlTextChunk = htmlTextChunks[i];
      context = processRawText(htmlTextChunk, context);
      if (context === STATE_ERROR) { throw new Error(htmlTextChunk); }

      var sanitizerContext = context;
      context = computeEscapingModeForSubst(context, sanitizerFunctions);
      var escMode = sanitizerFunctions.firstEscMode;
      var secondEscMode = sanitizerFunctions.secondEscMode;
      var sanitizer = SANITIZER_FOR_ESC_MODE[escMode];
      if (sanitizer == null) {
        throw new Error(
            'Interpolation in illegal position after '
            + htmlTextChunks.slice(0, i + 1).join('${...}'));
      }
      if (secondEscMode !== null) {
        sanitizer = compose(SANITIZER_FOR_ESC_MODE[secondEscMode], sanitizer);
      }
      // HACK to allow pretty printing in demo REPL.
      if (USE_PRETTY_QUASI) {
        prettyPrintDetails.push(contextToString(sanitizerContext));
      }
      sanitizerFunctions.push(sanitizer);
    }

    if (USE_PRETTY_QUASI) {
      sanitizerFunctions.prettyPrintDetails = prettyPrintDetails;
    }

    if (++cacheSize === 50) {
      cache = {};
      cacheSize = 0;
    }
    return cache[key] = sanitizerFunctions;
  };

  safehtml = function (parts) {
    var literalParts = [];
    var n = parts.length >> 1;
    for (var i = n + 1; --i >= 0;) {
      literalParts[i] = parts[i << 1];
    }
    var sanitizers = safeHtmlChooseEscapers(literalParts);

    if (USE_PRETTY_QUASI) {
      var originals = [];
      var escapedArgs = [];
      for (var i = 0; i < n; ++i) {
	var sanitizer = sanitizers[i];
        escapedArgs[i] = sanitizer(originals[i] = parts[(i << 1) | 1]);
      }
      return prettyQuasi(
          literalParts, escapedArgs, originals, sanitizers.prettyPrintDetails,
          SanitizedHtml);
    } else {
      var outputBuffer = [];
      for (var i = 0, j = -1; i < n; ++i) {
        outputBuffer[++j] = literalParts[i];
	var sanitizer = sanitizers[i];
        outputBuffer[++j] = sanitizer(parts[j]);
      }
      outputBuffer[++j] = literalParts[n];
      return new SanitizedHtml(outputBuffer.join(''));
    }
  };
})();

window['safehtml'] = safehtml;
