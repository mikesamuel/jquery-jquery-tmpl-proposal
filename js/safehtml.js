// A safe HTML interpolation scheme that uses contextual autoescaping to
// choose appropriate escapers for dynamic values.

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
    var prettyPrintDetails = typeof prettyQuasi !== 'undefined' ? [] : void 0;
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
      // HACK to allow pretty printing in demo REPL.
      if (prettyPrintDetails) { prettyPrintDetails.push(contextToString(sanitizerContext)); }
      sanitizerFunctions.push(sanitizer);
    }

    if (prettyPrintDetails) {
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

    if (sanitizers.prettyPrintDetails) {
      var originals = [];
      var escapedArgs = [];
      for (var i = 0; i < n; ++i) {
        escapedArgs[i] = (0, sanitizers[i])(originals[i] = parts[(i << 1) | 1]);
      }
      return prettyQuasi(
          literalParts, escapedArgs, originals, sanitizers.prettyPrintDetails,
          SanitizedHtml);
    } else {
      var outputBuffer = [];
      for (var i = 0, j = -1; i < n; ++i) {
        outputBuffer[++j] = literalParts[i];
        outputBuffer[++j] = (0, sanitizers[i])(parts[j]);
      }
      outputBuffer[++j] = literalParts[n];
      return new SanitizedHtml(outputBuffer.join(''));
    }
  };
})();

window['safehtml'] = safehtml;
