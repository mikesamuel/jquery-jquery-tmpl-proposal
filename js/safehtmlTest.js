function thunk(x) {
  return function () { return x; };
}


function testSafeHtmlGoodInputs() {
  var template = safehtml(
      ['<a href="', '?q=', '" onclick=alert(', ') style="color: ', '">', '</a>']);
  assertEquals(
      '<a href="http://www.google.com/search?q=Hello%20World"'
      + ' onclick=alert(&#39;Hello&#32;World&#39;)'
      + ' style="color: red">Hello &amp; Goodbye</a>',
      template([
          thunk('http://www.google.com/search'),
          thunk('Hello World'),
          thunk('Hello World'),
          thunk('red'),
          thunk('Hello & Goodbye')]).toString());
}


function testSafeHtmlBadInputs() {
  var template = safehtml(
      ['<a href="', '?q=', '" onclick=alert(', ') style="color: ', '">', '</a>']);
  assertEquals(
      '<a href="#zSafehtmlz?q=%22%3E%3Cscript%3Ealert%2813%29%3C%2Fscript%3E"'
      + ' onclick=alert(&#39;\\x22Hello&#32;World&#39;)'
      + ' style="color: zSafehtmlz">&lt;script&gt;alert(1337)&lt;/script&gt;</a>',
      template([
          thunk('javascript:alert(1337)//'),
          thunk('"><script>alert(13)</script>'),
          thunk('"Hello World'),
          thunk('expression(alert(1337))'),
          thunk('<script>alert(1337)</script>')]).toString());
}
