function testSafeHtmlGoodInputs() {
  var template = safehtml(['<a href="', '?q=', '" onclick=alert(', ') style="color: ', '">', '</a>']);
  assertEquals(
     '<a href="http://www.google.com/search?q=Hello%20World" onclick=alert(&#39;Hello&#32;World&#39;)'
     + ' style="color: red">Hello &amp; Goodbye</a>',
     template('http://www.google.com/search', 'Hello World', 'Hello World', 'red', 'Hello & Goodbye'));
}


function testSafeHtmlBadInputs() {
  var template = safehtml(['<a href="', '?q=', '" onclick=alert(', ') style="color: ', '">', '</a>']);
  assertEquals(
     '<a href="#zSoyz?q=%22%3E%3Cscript%3Ealert%2813%29%3C%2Fscript%3E" onclick=alert(&#39;\\x22Hello&#32;World&#39;)'
     + ' style="color: zSoyz">&lt;script&gt;alert(1337)&lt;/script&gt;</a>',
     template('javascript:alert(1337)//', '"><script>alert(13)</script>', '"Hello World', 'expression(alert(1337))',
              '<script>alert(1337)</script>'));
}
