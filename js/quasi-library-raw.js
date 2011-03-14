// A very simple quasi handler that acts like r'...' strings in python.

function raw(rawParts) {
  if (rawParts.length === 1) {
    var s = rawParts[0];
    return function raw() { return s; };
  }
  var n = rawParts.length;
  return function raw() {
    var buffer = [], k = -1;
    buffer[++k] = rawParts[0];
    for (var i = 0; i < n;) {
      buffer[++k] = arguments[i];
      buffer[++k] = rawParts[++i];
    }
    return buffer.join('');
  };
}
