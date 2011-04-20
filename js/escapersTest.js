var ASCII_CHARS = '';
for (var i = 0; i < 0x80; ++i) {
  ASCII_CHARS += String.fromCharCode(i);
}

/**
 * Strings that might change the parsing mode of scripts in which they are
 * embedded.
 */
var EMBEDDING_HAZARDS = [
      "</script", "</style", "<!--", "-->", "<![CDATA[", "]]>"];

function testEscapeJsString() {
  // The minimal escapes.
  // Do not remove anything from this set without talking to your friendly local
  // security-team@.
  assertEquals(
      "\\x00 \\x22 \\x27 \\\\ \\r \\n \\u2028 \\u2029",
      escapeJsString("\u0000 \" \' \\ \r \n \u2028 \u2029"));

  for (var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i) {
    var hazard = EMBEDDING_HAZARDS[i];
    assertFalse(hazard, escapeJsString(hazard).indexOf(hazard) >= 0);
  }

  // Check correctness of other Latins.
  var escapedAscii = (
      "\\x00\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
      "\\x08\\t\\n\\x0b\\f\\r\u000e\u000f" +
      "\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
      "\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
      " !\\x22#$%\\x26\\x27()*+,-.\\/" +
      "0123456789:;\\x3c\\x3d\\x3e?" +
      "@ABCDEFGHIJKLMNO" +
      "PQRSTUVWXYZ[\\\\]^_" +
      "`abcdefghijklmno" +
      "pqrstuvwxyz{|}~\u007f");
  assertEquals(escapedAscii, escapeJsString(ASCII_CHARS));
}

function testEscapeJsRegExpString() {
  // The minimal escapes.
  // Do not remove anything from this set without talking to your friendly local
  // security-team@.
  assertEquals(
      "\\x00 \\x22 \\x27 \\\\ \\/ \\r \\n \\u2028 \\u2029" +
      // RegExp operators.
      " \\x24\\x5e\\x2a\\x28\\x29\\x2d\\x2b\\x7b" +
      "\\x7d\\x5b\\x5d\\x7c\\x3f",
      escapeJsRegex(
          "\u0000 \" \' \\ / \r \n \u2028 \u2029" +
          " $^*()-+{}[]|?"));

  for (var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i) {
    var hazard = EMBEDDING_HAZARDS[i];
    assertFalse(hazard, escapeJsRegex(hazard).indexOf(hazard) >= 0);
  }

  var escapedAscii = (
      "\\x00\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
      "\\x08\\t\\n\\x0b\\f\\r\u000e\u000f" +  // \b means word-break in JS.
      "\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
      "\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
      " !\\x22#\\x24%\\x26\\x27\\x28\\x29" +
      "\\x2a\\x2b\\x2c\\x2d\\x2e\\/" +
      "0123456789\\x3a;\\x3c\\x3d\\x3e\\x3f" +
      "@ABCDEFGHIJKLMNO" +
      "PQRSTUVWXYZ\\x5b\\\\\\x5d\\x5e_" +
      "`abcdefghijklmno" +
      "pqrstuvwxyz\\x7b\\x7c\\x7d~\u007f");
  assertEquals(escapedAscii, escapeJsRegex(ASCII_CHARS));
}

function testEscapeJsValue() {
  assertEquals(  // Adds quotes.
      "'Don\\x27t run with \\x22scissors\\x22.\\n'",
      escapeJsValue("Don't run with \"scissors\".\n"));
  assertEquals(" 4 ", escapeJsValue(4));
  assertEquals(" 4.5 ", escapeJsValue(4.5));
  assertEquals(" true ", escapeJsValue(true));
  assertEquals(" null ", escapeJsValue(null));
}

function testEscapeCssString() {
  // The minimal escapes.
  // Do not remove anything from this set without talking to your friendly local
  // security-team@.
  assertEquals(
      "\\0  \\22  \\27  \\5c  \\a  \\c  \\d ",
      escapeCssString("\u0000 \" \' \\ \n \u000c \r"));

  for (var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i) {
    var hazard = EMBEDDING_HAZARDS[i];
    assertFalse(hazard, escapeCssString(hazard).indexOf(hazard) >= 0);
  }

  var escapedAscii = (
      "\\0 \u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
      "\\8 \\9 \\a \\b \\c \\d \u000e\u000f" +
      "\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
      "\u0018\u0019\u001A\u001B\u001C\u001D\u001E\u001F" +
      " !\\22 #$%\\26 \\27 \\28 \\29 \\2a +,-.\\2f " +
      "0123456789\\3a \\3b \\3c \\3d \\3e ?" +
      "\\40 ABCDEFGHIJKLMNO" +
      "PQRSTUVWXYZ[\\5c ]^_" +
      "`abcdefghijklmno" +
      "pqrstuvwxyz\\7b |\\7d ~\u007f");
  assertEquals(escapedAscii, escapeCssString(ASCII_CHARS));
}

function testFilterCssValue() {
  assertEquals("33px", filterCssValue("33px"));
  assertEquals("-.5em", filterCssValue("-.5em"));
  assertEquals("inherit", filterCssValue("inherit"));
  assertEquals("display", filterCssValue("display"));
  assertEquals("none", filterCssValue("none"));
  assertEquals("#id", filterCssValue("#id"));
  assertEquals(".class", filterCssValue(".class"));
  assertEquals("red", filterCssValue("red"));
  assertEquals("#aabbcc", filterCssValue("#aabbcc"));
  assertEquals("zSafehtmlz", filterCssValue("expression"));
  assertEquals("zSafehtmlz", filterCssValue("Expression"));
  assertEquals("zSafehtmlz", filterCssValue("\\65xpression"));
  assertEquals("zSafehtmlz", filterCssValue("\\65 xpression"));
  assertEquals("zSafehtmlz", filterCssValue("-moz-binding"));
  assertEquals(
      "zSafehtmlz", filterCssValue("</style><script>alert('foo')</script>/*"));

  for (var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i) {
    var hazard = EMBEDDING_HAZARDS[i];
    assertFalse(hazard, filterCssValue(hazard).indexOf(hazard) >= 0);
  }
}

function testFilterHtmlAttribute() {
  assertEquals("dir", filterHtmlAttribute("dir"));
  assertEquals(
      "zSafehtmlz", filterHtmlAttribute("><script>alert('foo')</script"));
  assertEquals("zSafehtmlz", filterHtmlAttribute("style"));
  assertEquals("zSafehtmlz", filterHtmlAttribute("onclick"));
  assertEquals("zSafehtmlz", filterHtmlAttribute("href"));
  assertEquals("dir=\"ltr\"", filterHtmlAttribute("dir=ltr"));

  for (var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i) {
    var hazard = EMBEDDING_HAZARDS[i];
    assertFalse(hazard, filterHtmlAttribute(hazard).indexOf(hazard) >= 0);
  }
}

function testFilterHtmlElementName() {
  assertEquals("h1", filterHtmlElementName("h1"));
  assertEquals("zSafehtmlz", filterHtmlElementName("script"));
  assertEquals("zSafehtmlz", filterHtmlElementName("style"));
  assertEquals("zSafehtmlz", filterHtmlElementName("SCRIPT"));
  assertEquals(
      "zSafehtmlz", filterHtmlElementName("><script>alert('foo')</script"));
  assertEquals("zSafehtmlz", filterHtmlElementName("<h1>"));

  for (var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i) {
    var hazard = EMBEDDING_HAZARDS[i];
    assertFalse(hazard, filterHtmlElementName(hazard).indexOf(hazard) >= 0);
  }
}

function testEscapeUri() {
  // The minimal escapes.
  // Do not remove anything from this set without talking to your friendly local
  // security-team@.
  assertEquals(
      "%00%0A%0C%0D%22%23%26%27%2F%3A%3D%3F%40%28%29%3B%5B%5D%7B%7D",
      escapeUri("\u0000\n\f\r\"#&'/:=?@();[]{}"));

  for (var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i) {
    var hazard = EMBEDDING_HAZARDS[i];
    assertFalse(hazard, escapeUri(hazard).indexOf(hazard) >= 0);
  }

  var escapedAscii = (
      "%00%01%02%03%04%05%06%07%08%09%0A%0B%0C%0D%0E%0F" +
      "%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F" +
      "%20!%22%23%24%25%26%27%28%29*%2B%2C-.%2F" +
      "0123456789%3A%3B%3C%3D%3E%3F" +
      "%40ABCDEFGHIJKLMNO" +
      "PQRSTUVWXYZ%5B%5C%5D%5E_" +
      "%60abcdefghijklmno" +
      "pqrstuvwxyz%7B%7C%7D~%7F");
  assertEquals(escapedAscii, escapeUri(ASCII_CHARS));
  // Test full-width.  The two characters at the right are a full-width '#' and
  // ':'.
  assertEquals("%EF%BC%83%EF%BC%9A", escapeUri("\uff03\uff1a"));
  // Test other unicode codepoints.
  assertEquals("%C2%85%E2%80%A8", escapeUri("\u0085\u2028"));
}

function testNormalizeUriAndFilterNormalizeUri() {
  // The minimal escapes.
  // Do not remove anything from this set without talking to your friendly local
  // security-team@.
  var minimal = "\u0000\n\f\r\"'(){}";
  for (var i = 0, n = minimal.length; i < n; ++i) {
    var ch = minimal.charAt(i);
    assertTrue(ch + ' -> ' + normalizeUri(ch),
               /^%[0-9a-f]{2}$/i.test(normalizeUri(ch)));
  }

  for (var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i) {
    var hazard = EMBEDDING_HAZARDS[i];
    assertFalse(hazard, normalizeUri(hazard).indexOf(hazard) >= 0);
    assertFalse(hazard, filterNormalizeUri(hazard).indexOf(hazard) >= 0);
  }

  var escapedAscii = (
      "%00%01%02%03%04%05%06%07%08%09%0A%0B%0C%0D%0E%0F" +
      "%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F" +
      "%20!%22#$%25&%27%28%29*+,-./" +
      "0123456789:;%3C=%3E?" +
      "@ABCDEFGHIJKLMNO" +
      "PQRSTUVWXYZ[%5C]%5E_" +
      "%60abcdefghijklmno" +
      "pqrstuvwxyz%7B%7C%7D~%7F");
  assertEquals(escapedAscii, normalizeUri(ASCII_CHARS));
  assertEquals("#" + escapedAscii, filterNormalizeUri("#" + ASCII_CHARS));

  // Test full-width.  The two characters at the right are a full-width '#'
  // and ':'.
  var escapedFullWidth = "%EF%BC%83%EF%BC%9A";
  var fullWidth = "\uff03\uff1a";
  assertEquals(escapedFullWidth, normalizeUri(fullWidth));
  assertEquals(escapedFullWidth, filterNormalizeUri(fullWidth));
  // Test malformed escape sequences
  assertEquals("%20%2A%2a%252G%25", normalizeUri("%20%2A%2a%2G%"));
  assertEquals("%20%2A%2a%252G%25", filterNormalizeUri("%20%2A%2a%2G%"));

  // Test filtering of URI starts.
  assertEquals("#zSafehtmlz", filterNormalizeUri("javascript:"));
  assertEquals("#zSafehtmlz", filterNormalizeUri("javascript:alert(1337)"));
  assertEquals("#zSafehtmlz", filterNormalizeUri("vbscript:alert(1337)"));
  assertEquals("#zSafehtmlz", filterNormalizeUri("livescript:alert(1337)"));
  assertEquals("#zSafehtmlz", filterNormalizeUri("data:,alert(1337)"));
  assertEquals(
      "#zSafehtmlz", filterNormalizeUri("data:text/javascript,alert%281337%29"));
  assertEquals("#zSafehtmlz", filterNormalizeUri("file:///etc/passwd"));
  assertFalse(
      filterNormalizeUri("javascript\uff1aalert(1337);")
      .indexOf("javascript\uff1a") >= 0);

  // Testcases from http://ha.ckers.org/xss.html
  assertEquals("#zSafehtmlz", filterNormalizeUri("JaVaScRiPt:alert(1337)"));
  assertEquals(
      "#zSafehtmlz",
      filterNormalizeUri(
          // Using HTML entities to obfuscate javascript:alert('XSS');
          "&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;" +
          "&#58;&#97;&#108;&#101;&#114;&#116;" +
          "&#40;&#39;&#88;&#83;&#83;&#39;&#41;"));
  assertEquals(
      "#zSafehtmlz",
      filterNormalizeUri(  // Using longer HTML entities to obfuscate the same.
          "&#0000106&#0000097&#0000118&#0000097" +
          "&#0000115&#0000099&#0000114&#0000105" +
          "&#0000112&#0000116&#0000058&#0000097" +
          "&#0000108&#0000101&#0000114&#0000116" +
          "&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041"));
  assertEquals(
      "#zSafehtmlz",
      filterNormalizeUri(  // Using hex HTML entities to obfuscate the same.
          "&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74" +
          "&#x3A&#x61&#x6C&#x65&#x72&#x74&#x28&#x27&#x58&#x53&#x53&#x27&#x29"));
  assertEquals(
      "#zSafehtmlz", filterNormalizeUri("jav\tascript:alert('XSS');"));
  assertEquals(
      "#zSafehtmlz", filterNormalizeUri("jav&#x09;ascript:alert('XSS');"));
  assertEquals(
      "#zSafehtmlz", filterNormalizeUri("jav&#x0A;ascript:alert('XSS');"));
  assertEquals(
      "#zSafehtmlz", filterNormalizeUri("jav&#x0D;ascript:alert('XSS');"));
  assertEquals(
      "#zSafehtmlz",
      filterNormalizeUri(
          "\nj\n\na\nv\na\ns\nc\nr\ni\np\nt\n:" +
          "\na\nl\ne\nr\nt\n(\n1\n3\n3\n7\n)"));
  assertEquals(
      "#zSafehtmlz", filterNormalizeUri("\u000e  javascript:alert('XSS');"));

  // Things we should accept.
  assertEquals("http://google.com/", filterNormalizeUri("http://google.com/"));
  assertEquals("https://google.com/", filterNormalizeUri("https://google.com/"));
  assertEquals("HTTP://google.com/", filterNormalizeUri("HTTP://google.com/"));
  assertEquals("?a=b&c=d", filterNormalizeUri("?a=b&c=d"));
  assertEquals("?a=b:c&d=e", filterNormalizeUri("?a=b:c&d=e"));
  assertEquals("//foo.com:80/", filterNormalizeUri("//foo.com:80/"));
  assertEquals("//foo.com/", filterNormalizeUri("//foo.com/"));
  assertEquals("/foo:bar/", filterNormalizeUri("/foo:bar/"));
  assertEquals("#a:b", filterNormalizeUri("#a:b"));
  assertEquals("#", filterNormalizeUri("#"));
  assertEquals("/", filterNormalizeUri("/"));
  assertEquals("", filterNormalizeUri(""));
}

function testEscapeHtml() {
  var escapedAscii = (
      "&#0;\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
      "\b\t\n\u000b\f\r\u000e\u000f" +
      "\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
      "\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
      " !&quot;#$%&amp;&#39;()*+,-./" +
      "0123456789:;&lt;=&gt;?" +
      "@ABCDEFGHIJKLMNO" +
      "PQRSTUVWXYZ[\\]^_" +
      "`abcdefghijklmno" +
      "pqrstuvwxyz{|}~\u007f");
  assertEquals(escapedAscii, escapeHtml(ASCII_CHARS));
}

function testEscapeHtmlAttributeNospace() {
  // The minimal escapes.
  // Do not remove anything from this set without talking to your friendly local
  // security-team@.
  assertEquals(
      "&#9;&#10;&#11;&#12;&#13;&#32;&quot;&#39;&#96;&lt;&gt;&amp;",
      escapeHtmlAttributeNospace("\u0009\n\u000B\u000C\r \"'\u0060<>&"));

  var escapedAscii = (
      "&#0;\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
      "\b&#9;&#10;&#11;&#12;&#13;\u000e\u000f" +
      "\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
      "\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
      "&#32;!&quot;#$%&amp;&#39;()*+,&#45;.&#47;" +
      "0123456789:;&lt;&#61;&gt;?" +
      "@ABCDEFGHIJKLMNO" +
      "PQRSTUVWXYZ[\\]^_" +
      "&#96;abcdefghijklmno" +
      "pqrstuvwxyz{|}~\u007f");
  assertEquals(escapedAscii, escapeHtmlAttributeNospace(ASCII_CHARS));
}

if (!COMPILED) this.testNormalizeHtml = function () {

  // The minimal escapes.
  // Do not remove anything from this set without talking to your friendly local
  // security-team@.
  assertEquals(
      "&quot;&#39;&lt;&gt;",
      normalizeHtmlHelper("\"'<>"));

  var escapedAscii = (
      "&#0;\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
      "\b\t\n\u000b\u000c\r\u000e\u000f" +
      "\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
      "\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
      " !&quot;#$%&&#39;()*+,-./" +
      "0123456789:;&lt;=&gt;?" +
      "@ABCDEFGHIJKLMNO" +
      "PQRSTUVWXYZ[\\]^_" +
      "`abcdefghijklmno" +
      "pqrstuvwxyz{|}~\u007f");
  assertEquals(escapedAscii, normalizeHtmlHelper(ASCII_CHARS));
};

if (!COMPILED) this.testNormalizeHtmlNospace = function () {
  // The minimal escapes.
  // Do not remove anything from this set without talking to your friendly local
  // security-team@.
  assertEquals(
      "&#9;&#10;&#11;&#12;&#13;&#32;&quot;&#39;&#96;&lt;&gt;",
      normalizeHtmlNospaceHelper("\u0009\n\u000B\u000C\r \"'\u0060<>"));

  var escapedAscii = (
      "&#0;\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
      "\b&#9;&#10;&#11;&#12;&#13;\u000e\u000f" +
      "\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
      "\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
      "&#32;!&quot;#$%&&#39;()*+,&#45;.&#47;" +
      "0123456789:;&lt;&#61;&gt;?" +
      "@ABCDEFGHIJKLMNO" +
      "PQRSTUVWXYZ[\\]^_" +
      "&#96;abcdefghijklmno" +
      "pqrstuvwxyz{|}~\u007f");
  assertEquals(escapedAscii, normalizeHtmlNospaceHelper(ASCII_CHARS));
};

function testStripHtmlTags() {
  assertEquals("", stripHtmlTags(""));
  assertEquals("Hello, World!", stripHtmlTags("Hello, World!"));
  assertEquals("Hello, World!", stripHtmlTags("<b>Hello, World!</b>"));
  assertEquals(
      "Hello, \"World!\"",
      stripHtmlTags("<b>Hello, \"World!\"</b>"));
  assertEquals("42", stripHtmlTags("42"));
}
