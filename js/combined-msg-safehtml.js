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