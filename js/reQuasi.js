// A quasi handler for building regular expressions.

function re(staticParts) {
  var buffer = [];
  var n = staticParts.length;
  for (var i = n; --i >= 0;) {
    buffer[i << 1] = staticParts[i];
  }
  var lastIndex = n - 1;
  var lastPart = staticParts[lastIndex];
  var flags = lastPart.match(/:([gim]+)$/);
  if (flags) {
    buffer[buffer.length - 1] = lastPart.substring(
        0, lastPart.length - flags[0].length);
    flags = flags[1];
  }
  // TODO: maybe fake the 's' flag by rewriting '.'.
  var specials = /[^A-Za-z0-9\s]/g;

  return function (substitutions) {
    for (var i = lastIndex; --i >= 0;) {
      var substitution = substitutions[i];
      substitution = substitution();
      if (substitution instanceof RegExp) {
	var patternText = substitution.toString();
	substitution = patternText.substring(1, patternText.lastIndexOf('/'));
	// TODO: if flags includes i, then expand all letters to character classes.
      } else {
	substitution = String(substitution).replace(specials, '\\$&');
      }
      buffer[(i << 1) | 1] = substitution;
    }
    var re = buffer.join('');
    for (var i = lastIndex; --i >= 0;) {
      buffer[(i << 1) | 1] = null;
    }
    return new RegExp(re, flags);
  };
}
