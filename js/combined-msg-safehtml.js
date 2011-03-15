// Provides a quasi handler that can be used, after desuagring,
// via the syntax html_msg`...`.
// This quasi handler applies the msg`...` quasi handler first
// to handle I18N/L10N concerns, and then the safehtml handler
// to handle security concerns.


function html_msg(staticParts) {
  var decomposed = msgPartsDecompose(staticParts);
  var inputXforms = decomposed.inputXforms;

  var safeHtmlProducer = safehtml(decomposed.literalParts);
  var lastIndex = inputXforms.length;

  return function (var_args) {
    var formattedArgs = [];
    for (var i = 0; i < lastIndex; ++i) {
      var thunk = arguments[i];
      var value = thunk();
      // Exempt sanitized content from formatting.
      formattedArgs[i] = thunk && typeof thunk.contentKind === 'number'
          ? thunk : (
            function (value, xform) {
              return function () { return xform(value); };
            })(value, inputXforms[i]);
    }
    return safeHtmlProducer.apply(null, formattedArgs);
  };
}