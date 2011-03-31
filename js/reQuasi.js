// A quasi handler for building regular expressions.

function re(parts) {
  var buffer = [];
  var n = parts.length;
  var lastIndex = n - 1;
  var lastPart = parts[lastIndex];
  var flags = lastPart.match(/:([gim]+)$/);
  if (flags) {
    lastPart = lastPart.substring(
        0, lastPart.length - flags[0].length);
    flags = flags[1];
  }
  // TODO: maybe fake the 's' flag by rewriting '.'.
  var specials = /[^A-Za-z0-9\s]/g;

  for (var i = 0; i < lastIndex;) {
    buffer[i] = parts[i];
    ++i;
    var substitution = parts[i];
    if (substitution instanceof RegExp) {
      var patternText = substitution.toString();
      substitution = patternText.substring(1, patternText.lastIndexOf('/'));
      // TODO: if flags includes i, then expand all letters to character classes.
    } else {
      substitution = String(substitution).replace(specials, '\\$&');
    }
    buffer[i] = substitution;
    ++i;
  }
  buffer[lastIndex] = lastPart;
  return new RegExp(buffer.join(''), flags);
}
