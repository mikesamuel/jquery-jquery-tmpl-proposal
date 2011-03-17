// A very simple quasi handler that acts like r'...' strings in python.

function raw(rawParts) {
  if (rawParts.length === 1) {
    var s = rawParts[0];
    return function raw() { return s; };
  }
  var lastIndex = rawParts.length - 1;
  return function raw(interpolations) {
    var buffer = [rawParts[0]];
    for (var i = 0, k = 0; i < lastIndex;) {
      buffer[++k] = (0,interpolations[i])();
      buffer[++k] = rawParts[++i];
    }
    return buffer.join('');
  };
}
