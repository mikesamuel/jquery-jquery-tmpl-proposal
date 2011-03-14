var safehtml = (function () {
  var cacheSize = 0;
  var cache = {};

  function compose(f, g) {
    return function (x) { return f(g(x)); };
  }

  return function safehtml(chunksIn) {
    var htmlTextChunks = chunksIn.splice(0);
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
    for (var i = 0; i < nChunks - 1; ++i) {
      var htmlTextChunk = htmlTextChunks[i];
      context = processRawText(htmlTextChunk, context);
      if (context === STATE_ERROR) { throw new Error(htmlTextChunk); }
      var state = stateOf(context);
      var escMode = ESC_MODE_FOR_STATE[stateOf(context)];
      switch (uriPartOf(context)) {
        case URI_PART_START: escMode = ESC_MODE_FILTER_NORMALIZE_URI; break;
        case URI_PART_QUERY: case URI_PART_FRAGMENT: escMode = ESC_MODE_ESCAPE_URI; break;
      }
      var secondEscMode = null;
      var delimType = delimTypeOf(context);
      if (delimType !== DELIM_TYPE_NONE) {
        switch (escMode) {
          case ESC_MODE_ESCAPE_HTML: break;
          case ESC_MODE_ESCAPE_HTML_ATTRIBUTE:
            if (delimType === DELIM_TYPE_SPACE_OR_TAG_END) {
              escMode = ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE;
            }
            break;
          case ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE: break;
          default:
            if (!IS_ESC_MODE_HTML_EMBEDDABLE[escMode]) {
              secondEscMode = delimType === DELIM_TYPE_SPACE_OR_TAG_END
                  ? ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE : ESC_MODE_ESCAPE_HTML_ATTRIBUTE;
            }
            break;
        }
      }
      var sanitizer = SANITIZER_FOR_ESC_MODE[escMode];
      if (secondEscMode !== null) {
        sanitizer = compose(SANITIZER_FOR_ESC_MODE[secondEscMode], sanitizer);
      }
      sanitizerFunctions.push(sanitizer);
    }
  
    var lastIndex = nChunks - 1;
    var lastChunk = htmlTextChunks[lastIndex];
  
    var interpolator = function (var_args) {
      var outputBuffer = [];
      for (var i = 0, j = -1; i < lastIndex; ++i) {
        outputBuffer[++j] = htmlTextChunks[i];
        outputBuffer[++j] = sanitizerFunctions[i](arguments[i]);
      }
      outputBuffer[++j] = lastChunk;
      return outputBuffer.join('');
    };

    if (++cacheSize == 50) {
      cache = {};
      cacheSize = 0;
    }
    return cache[key] = interpolator;
  };
})();

window['safehtml'] = safehtml;
