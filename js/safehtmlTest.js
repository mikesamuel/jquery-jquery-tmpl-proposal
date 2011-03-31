function interleave(literalParts, values) {
  var arr = [literalParts[0]];
  var n = values.length;
  for (var i = 0, j = 0; i < n;) {
    arr[++j] = values[i];
    arr[++j] = literalParts[++i];
  }
  return arr;
}


function testSafeHtmlGoodInputs() {
  var template = [
      '<a href="', '?q=', '" onclick=alert(', ') style="color: ', '">', '</a>'];
  var values = [
      'http://www.google.com/search',
      'Hello World',
      'Hello World',
      'red',
      'Hello & Goodbye'];
  assertEquals(
      '<a href="http://www.google.com/search?q=Hello%20World"'
      + ' onclick=alert(&#39;Hello&#32;World&#39;)'
      + ' style="color: red">Hello &amp; Goodbye</a>',
      safehtml(interleave(template, values)).toString());
}


function testSafeHtmlBadInputs() {
  var template = [
      '<a href="', '?q=', '" onclick=alert(', ') style="color: ', '">', '</a>'];
  var values = [
      'javascript:alert(1337)//',
      '"><script>alert(13)</script>',
      '"Hello World',
      'expression(alert(1337))',
      '<script>alert(1337)</script>'];
  assertEquals(
      '<a href="#zSafehtmlz?q=%22%3E%3Cscript%3Ealert%2813%29%3C%2Fscript%3E"'
      + ' onclick=alert(&#39;\\x22Hello&#32;World&#39;)'
      + ' style="color: zSafehtmlz">&lt;script&gt;alert(1337)&lt;/script&gt;</a>',
      safehtml(interleave(template, values)).toString());
}
