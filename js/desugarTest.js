function assertDesugarsToSelf(js) {
  assertEquals(js, desugar(js));
}

function testSimpleJs() {
  assertDesugarsToSelf('');
  assertDesugarsToSelf('42');
  assertDesugarsToSelf('-1.0');
  assertDesugarsToSelf('-.333');
  assertDesugarsToSelf('1e6');
  assertDesugarsToSelf('1e-6');
  assertDesugarsToSelf('"foo bar"');
  assertDesugarsToSelf("'foo bar'");
  assertDesugarsToSelf("for (var i = 0; i < 10; ++i) { alert('I love to \\'count\\''); }");
  assertDesugarsToSelf("foo");
}

function testBackquotesInStringsAndRegexs() {
  assertDesugarsToSelf("'`'");
  assertDesugarsToSelf("'\\`'");
  assertDesugarsToSelf('"`"');
  assertDesugarsToSelf('"\\`"');
  assertDesugarsToSelf('/`/');
  assertDesugarsToSelf('1, /`/');
  assertDesugarsToSelf('1, /[`]/');
  assertDesugarsToSelf('n /= /`/i');
}

function testSimpleQuasi() {
  assertEquals('(foo(["foo"]))', desugar('foo`foo`'));
}

function testQuasiOneInterp() {
  assertEquals(
      '(foo(["foo ", (x), " bar"]))',
      desugar('foo`foo ${x} bar`'));
}

function testQuasiOneAbbreviatedInterp() {
  assertEquals(
      '(foo(["foo ", (x), " bar"]))',
      desugar('foo`foo $x bar`'));
}

function testQuasiEscape() {
  assertEquals(
      '(foo(["foo ", (x), "\\nbar"]))',
      desugar('foo`foo ${x}$\\nbar`')
      // There are multiple legal ways to encode a quasi quote.
      .replace('\\u000a', '\\n'));
}

function testQuasiRawEscape() {
  assertEquals(
      '(foo(["foo ", (x), "\\\\nbar"]))',
      desugar('foo`foo ${x}\\nbar`'));
}

function testBracketsInQuasiInterp() {
  assertEquals(
      '(foo(["foo ", (f({a: b})), "\\\\nbar"]))',
      desugar('foo`foo ${f({a: b})}\\nbar`'));
}

function testStringInQuasiInterp() {
  assertEquals(
      '(foo(["foo ", (f("`")), "\\\\nbar"]))',
      desugar('foo`foo ${f("`")}\\nbar`'));
}

function testNestedQuasi() {
  assertEquals(
      '(foo(["foo ", (f((bar(["-", (x), "-"])))), "\\\\nbar"]))',
      desugar('foo`foo ${f(bar`-${x}-`)}\\nbar`'));
}

if (THUNKED) {
  testAssignableQuasiHole = function testAssignableQuasiHole() {
    assertEquals(
        '(foo(["foo ", "\\\\nbar"])' +
        '([function () { return arguments.length ? (x.y) = arguments[0] : (x.y); }]))',
        desugar('foo`foo ${=x.y}\\nbar`'));
  };
}
