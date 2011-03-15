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

      // Some epsilon transitions need to be delayed until we get into a branch.
      // For example, we do not transition into an unquoted attribute value
      // context just because the raw text node that contained the "=" did
      // not contain a quote character because the quote character may appear
      // inside branches as in
      //     <a href={if ...}"..."{else}"..."{/if}>
      // which was derived from production code.
      
      // But we need to force epsilon transitions to happen consistentky before
      // a dynamic value is considered as in
      //    <a href={print $x}>
      // where we consider $x as happening in an unquoted attribute value context,
      // not as occuring before an attribute value.
      var state = stateOf(context);
      if (state == STATE_HTML_BEFORE_ATTRIBUTE_VALUE) {
	context = computeContextAfterAttributeDelimiter(
	    elementTypeOf(context), attrTypeOf(context), DELIM_TYPE_SPACE_OR_TAG_END);
      }

      var sanitizerContext = context;
      var escMode = ESC_MODE_FOR_STATE[stateOf(context)];
      switch (uriPartOf(context)) {
        case URI_PART_START:
	  escMode = ESC_MODE_FILTER_NORMALIZE_URI;
          context = (context & ~URI_PART_ALL) | URI_PART_PRE_QUERY;
	  break;
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
      if (sanitizer == null) {
	throw new Error(
	    'Interpolation in illegal position after '
	    + htmlTextChunks.slice(0, i + 1).join('${...}'));
      }
      if (secondEscMode !== null) {
        sanitizer = compose(SANITIZER_FOR_ESC_MODE[secondEscMode], sanitizer);
      }
      sanitizer.context = sanitizerContext;
      sanitizerFunctions.push(sanitizer);
    }
  
    var lastIndex = nChunks - 1;

    var interpolator;
    if (typeof prettyQuasi !== 'undefined') {
      // HACK to allow pretty printing in demo REPL.
      var details = [];
      for (var i = sanitizerFunctions.length; --i >= 0;) {
	details[i] = contextToString(sanitizerFunctions[i].context);
      }
      interpolator = function (var_args) {
	var originals = [];
        var escapedArgs = [];
        for (var i = 0; i < lastIndex; ++i) {
	  var thunk = arguments[i];
          escapedArgs[i] = (0, sanitizerFunctions[i])(originals[i] = thunk());
        }
        return prettyQuasi(
	    htmlTextChunks, escapedArgs, originals, details, SanitizedHtml);
      };
    } else {
      var lastChunk = htmlTextChunks[lastIndex];
      interpolator = function (var_args) {
        var outputBuffer = [];
        for (var i = 0, j = -1; i < lastIndex; ++i) {
          outputBuffer[++j] = htmlTextChunks[i];
	  var thunk = arguments[i];
          outputBuffer[++j] = (0, sanitizerFunctions[i])(thunk());
        }
        outputBuffer[++j] = lastChunk;
        return new SanitizedHtml(outputBuffer.join(''));
      };
    }

    if (++cacheSize == 50) {
      cache = {};
      cacheSize = 0;
    }
    return cache[key] = interpolator;
  };
})();

window['safehtml'] = safehtml;
