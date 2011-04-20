/**
 * @fileoverview
 * Provides a quasi handler that can be used, after desuagring,
 * via the syntax html_msg`...`.
 * This quasi handler applies the msg`...` quasi handler first
 * to handle I18N/L10N concerns, and then the safehtml handler
 * to handle security concerns.
 *
 * <p>
 * This shows how quasi handlers can be effectively chained
 * while leaving most of the complex implementation details
 * elsewhere.
 */

// Requires safehtml.js and messageQuasi.js

// Obeys quasi handler calling conventions.
function html_msg(parts) {
  var literalParts = [];
  var n = parts.length >> 1;
  for (var i = n + 1; --i >= 0;) {
    literalParts[i] = parts[i << 1];
  }

  var decomposed = msgPartsDecompose(literalParts);
  var inputXforms = decomposed.inputXforms;
  literalParts = decomposed.literalParts;

  var sanitizers = safeHtmlChooseEscapers(literalParts);
  var lastIndex = inputXforms.length;

  if (sanitizers.prettyPrintDetails) {
    var originals = [];
    var escapedArgs = [];
    for (var i = 0; i < n; ++i) {
      var value = parts[(i << 1) | 1];
      originals[i] = value;
      if (value && typeof value['contentKind'] === 'number') {
        // Exempt sanitized content from formatting.
      } else {
        var inputXform = inputXforms[i];
        value = inputXform(value);
      }
      escapedArgs[i] = (0, sanitizers[i])(value);
    }
    return prettyQuasi(
        literalParts, escapedArgs, originals, sanitizers.prettyPrintDetails,
        SanitizedHtml);
  } else {
    var outputBuffer = [];
    for (var i = 0, j = -1; i < n; ++i) {
      outputBuffer[++j] = literalParts[i];

      var value = parts[j];
      if (value && typeof value['contentKind'] === 'number') {
        // Exempt sanitized content from formatting.
      } else {
        var inputXform = inputXforms[i];
        value = inputXform(value);
      }
      outputBuffer[++j] = (0, sanitizers[i])(value);
    }
    outputBuffer[++j] = literalParts[n];
    return new SanitizedHtml(outputBuffer.join(''));
  }
}
