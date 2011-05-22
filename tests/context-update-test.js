function parseContext(text) {
  var parts = text.split(" ");
  var state;
  var el = ELEMENT_TYPE_NONE;
  var attr = ATTR_TYPE_NONE;
  var delim = DELIM_TYPE_NONE;
  var slash = JS_FOLLOWING_SLASH_NONE;
  var uriPart = URI_PART_NONE;

  var i = 0;
  switch (parts[i++]) {
    case "HTML_PCDATA": state = STATE_HTML_PCDATA; break;
    case "HTML_RCDATA": state = STATE_HTML_RCDATA; break;
    case "HTML_BEFORE_TAG_NAME": state = STATE_HTML_BEFORE_TAG_NAME; break;
    case "HTML_TAG_NAME": state = STATE_HTML_TAG_NAME; break;
    case "HTML_TAG": state = STATE_HTML_TAG; break;
    case "HTML_ATTRIBUTE_NAME": state = STATE_HTML_ATTRIBUTE_NAME; break;
    case "HTML_BEFORE_ATTRIBUTE_VALUE":
      state = STATE_HTML_BEFORE_ATTRIBUTE_VALUE;
      break;
    case "HTML_COMMENT": state = STATE_HTML_COMMENT; break;
    case "HTML_NORMAL_ATTR_VALUE": state = STATE_HTML_NORMAL_ATTR_VALUE; break;
    case "CSS": state = STATE_CSS; break;
    case "CSS_COMMENT": state = STATE_CSS_COMMENT; break;
    case "CSS_DQ_STRING": state = STATE_CSS_DQ_STRING; break;
    case "CSS_SQ_STRING": state = STATE_CSS_SQ_STRING; break;
    case "CSS_URI": state = STATE_CSS_URI; break;
    case "CSS_DQ_URI": state = STATE_CSS_DQ_URI; break;
    case "CSS_SQ_URI": state = STATE_CSS_SQ_URI; break;
    case "JS": state = STATE_JS; break;
    case "JS_LINE_COMMENT": state = STATE_JS_LINE_COMMENT; break;
    case "JS_BLOCK_COMMENT": state = STATE_JS_BLOCK_COMMENT; break;
    case "JS_DQ_STRING": state = STATE_JS_DQ_STRING; break;
    case "JS_SQ_STRING": state = STATE_JS_SQ_STRING; break;
    case "JS_REGEX": state = STATE_JS_REGEX; break;
    case "URI": state = STATE_URI; break;
    case "ERROR": state = STATE_ERROR; break;
    default: throw new Error(parts[--i]);
  }

  switch (parts[i++]) {
    case "NONE": el = ELEMENT_TYPE_NONE; break;
    case "SCRIPT": el = ELEMENT_TYPE_SCRIPT; break;
    case "STYLE": el = ELEMENT_TYPE_STYLE; break;
    case "TEXTAREA": el = ELEMENT_TYPE_TEXTAREA; break;
    case "TITLE": el = ELEMENT_TYPE_TITLE; break;
    case "LISTING": el = ELEMENT_TYPE_LISTING; break;
    case "XMP": el = ELEMENT_TYPE_XMP; break;
    case "NORMAL": el = ELEMENT_TYPE_NORMAL; break;
    default: --i; break;
  }

  switch (parts[i++]) {
    case "NONE": attr = ATTR_TYPE_NONE; break;
    case "SCRIPT": attr = ATTR_TYPE_SCRIPT; break;
    case "STYLE": attr = ATTR_TYPE_STYLE; break;
    case "URI": attr = ATTR_TYPE_URI; break;
    case "PLAIN_TEXT": attr = ATTR_TYPE_PLAIN_TEXT; break;
    default: --i; break;
  }

  switch (parts[i++]) {
    case "NONE": delim = DELIM_TYPE_NONE; break;
    case "DOUBLE_QUOTE": delim = DELIM_TYPE_DOUBLE_QUOTE; break;
    case "SINGLE_QUOTE": delim = DELIM_TYPE_SINGLE_QUOTE; break;
    case "SPACE_OR_TAG_END": delim = DELIM_TYPE_SPACE_OR_TAG_END; break;
    default: --i; break;
  }

  switch (parts[i++]) {
    case "NONE": slash = JS_FOLLOWING_SLASH_NONE; break;
    case "REGEX": slash = JS_FOLLOWING_SLASH_REGEX; break;
    case "DIV_OP": slash = JS_FOLLOWING_SLASH_DIV_OP; break;
    case "UNKNOWN": slash = JS_FOLLOWING_SLASH_UNKNOWN; break;
    default: --i; break;
  }

  switch (parts[i++]) {
    case "NONE": uriPart = URI_PART_NONE; break;
    case "START": uriPart = URI_PART_START; break;
    case "PRE_QUERY": uriPart = URI_PART_PRE_QUERY; break;
    case "QUERY": uriPart = URI_PART_QUERY; break;
    case "FRAGMENT": uriPart = URI_PART_FRAGMENT; break;
    case "UNKNOWN_PRE_FRAGMENT": uriPart = URI_PART_UNKNOWN_PRE_FRAGMENT; break;
    case "UNKNOWN": uriPart = URI_PART_UNKNOWN; break;
    default: --i; break;
  }

  assertTrue(
      "Got [" + text + "] but didn't use [" + parts.slice(i).join(' ') + "]",
      parts.length === i);
  return state | el | attr | delim | slash | uriPart;
}

function assertTransition(from, rawText, to) {
  var after = processRawText(rawText, parseContext(from));
  assertEquals(rawText + ' in ' + from, contextToString(parseContext(to)),
               contextToString(after));
}

function testPcdata() {
  assertTransition("HTML_PCDATA", "", "HTML_PCDATA");
  assertTransition("HTML_PCDATA", "Hello, World!", "HTML_PCDATA");
  assertTransition(
      "HTML_PCDATA", "Jad loves ponies <3 <3 <3 !!!", "HTML_PCDATA");
  assertTransition(
      "HTML_PCDATA", "OMG! Ponies, Ponies, Ponies &lt;3", "HTML_PCDATA");
  // Entering a tag
  assertTransition("HTML_PCDATA", "<", "HTML_BEFORE_TAG_NAME");
  assertTransition("HTML_PCDATA", "Hello, <", "HTML_BEFORE_TAG_NAME");
  assertTransition("HTML_PCDATA", "<h", "HTML_TAG_NAME");
  // Make sure that encoded HTML doesn't enter TAG.
  assertTransition("HTML_PCDATA", "&lt;a", "HTML_PCDATA");
  assertTransition("HTML_PCDATA", "<!--", "HTML_COMMENT");
  // Test special tags.
  assertTransition(
      "HTML_PCDATA", "<script type='text/javascript'", "HTML_TAG SCRIPT");
  assertTransition(
      "HTML_PCDATA", "<SCRIPT type='text/javascript'", "HTML_TAG SCRIPT");
  assertTransition("HTML_PCDATA", "<style type='text/css'", "HTML_TAG STYLE");
  assertTransition("HTML_PCDATA", "<sTyLe type='text/css'", "HTML_TAG STYLE");
  assertTransition("HTML_PCDATA", "<textarea name='text'", "HTML_TAG TEXTAREA");
  assertTransition("HTML_PCDATA", "<Title lang='en'", "HTML_TAG TITLE");
  assertTransition("HTML_PCDATA", "<xmp id='x'", "HTML_TAG XMP");
  // Into tag
  assertTransition("HTML_PCDATA", "<script>", "JS REGEX");
  assertTransition("HTML_PCDATA", "<script >", "JS REGEX");
  assertTransition(
      "HTML_PCDATA", "<script type=\"text/javascript\">", "JS REGEX");
  assertTransition("HTML_PCDATA", "<a ", "HTML_TAG NORMAL");
  assertTransition("HTML_PCDATA", "<a title=foo id='x'", "HTML_TAG NORMAL");
  assertTransition("HTML_PCDATA", "<a title=\"foo\"", "HTML_TAG NORMAL");
  assertTransition("HTML_PCDATA", "<a title='foo'", "HTML_TAG NORMAL");
  // Into attributes
  assertTransition("HTML_PCDATA", "<a onclick=\"",
                   "JS NORMAL SCRIPT DOUBLE_QUOTE REGEX");
  assertTransition("HTML_PCDATA", "<a onclick=\'",
                   "JS NORMAL SCRIPT SINGLE_QUOTE REGEX");
  assertTransition("HTML_PCDATA", "<a onclick=\'alert(&apos;",
                   "JS_SQ_STRING NORMAL SCRIPT SINGLE_QUOTE");
  assertTransition("HTML_PCDATA", "<a onclick=\'alert(&#x27;",
                   "JS_SQ_STRING NORMAL SCRIPT SINGLE_QUOTE");
  assertTransition("HTML_PCDATA", "<a onclick=\'alert(&#34;",
                   "JS_DQ_STRING NORMAL SCRIPT SINGLE_QUOTE");
  assertTransition("HTML_PCDATA", "<a onclick=\'alert(&#034;",
                   "JS_DQ_STRING NORMAL SCRIPT SINGLE_QUOTE");
  assertTransition("HTML_PCDATA", "<a onclick=",
                   "HTML_BEFORE_ATTRIBUTE_VALUE NORMAL SCRIPT");
  assertTransition(
      "HTML_PCDATA", "<a onclick=\"</script>",
      "JS_REGEX NORMAL SCRIPT DOUBLE_QUOTE");
  assertTransition(
      "HTML_PCDATA", "<xmp style=\"", "CSS XMP STYLE DOUBLE_QUOTE");
  assertTransition(
      "HTML_PCDATA", "<xmp style='/*", "CSS_COMMENT XMP STYLE SINGLE_QUOTE");
  assertTransition(
      "HTML_PCDATA", "<script src=", "HTML_BEFORE_ATTRIBUTE_VALUE SCRIPT URI");
  assertTransition(
      "HTML_PCDATA", "<script src=/search?q=",
      "URI SCRIPT URI SPACE_OR_TAG_END QUERY");
  assertTransition(
      "HTML_PCDATA", "<script src=/foo#",
      "URI SCRIPT URI SPACE_OR_TAG_END FRAGMENT");
  assertTransition(
      "HTML_PCDATA", "<img src=", "HTML_BEFORE_ATTRIBUTE_VALUE NORMAL URI");
  assertTransition(
      "HTML_PCDATA", "<a href=mailto:",
      "URI NORMAL URI SPACE_OR_TAG_END PRE_QUERY");
  assertTransition(
      "HTML_PCDATA", "<input type=button value= onclick=",
      "HTML_BEFORE_ATTRIBUTE_VALUE NORMAL SCRIPT");
  assertTransition("HTML_PCDATA", "<input type=button value=>", "HTML_PCDATA");
}

function testBeforeTagName() {
  assertTransition("HTML_BEFORE_TAG_NAME", "", "HTML_BEFORE_TAG_NAME");
  assertTransition("HTML_BEFORE_TAG_NAME", "h", "HTML_TAG_NAME");
  assertTransition(
      "HTML_BEFORE_TAG_NAME", "svg:font-face id='x'", "HTML_TAG NORMAL");
  assertTransition("HTML_BEFORE_TAG_NAME", ">", "HTML_PCDATA");
  assertTransition("HTML_BEFORE_TAG_NAME", "><", "HTML_BEFORE_TAG_NAME");
}

function testTagName() {
  assertTransition("HTML_TAG_NAME", "", "HTML_TAG_NAME");
  assertTransition("HTML_TAG_NAME", "1", "HTML_TAG_NAME");
  assertTransition("HTML_TAG_NAME", "-foo", "HTML_TAG_NAME");
  assertTransition("HTML_TAG_NAME", " id='x'", "HTML_TAG NORMAL");
  assertTransition("HTML_TAG_NAME", "\rid='x'", "HTML_TAG NORMAL");
  assertTransition("HTML_TAG_NAME", "\tid='x'", "HTML_TAG NORMAL");
  assertTransition("HTML_TAG_NAME", ">", "HTML_PCDATA");
  assertTransition("HTML_TAG_NAME", "/>", "HTML_PCDATA");
  assertTransition(
      "HTML_TAG_NAME", " href=", "HTML_BEFORE_ATTRIBUTE_VALUE NORMAL URI");
  assertTransition(
      "HTML_TAG_NAME", " href=\"", "URI NORMAL URI DOUBLE_QUOTE START");
  assertTransition(
      "HTML_TAG_NAME", " href='", "URI NORMAL URI SINGLE_QUOTE START");
  assertTransition(
      "HTML_TAG_NAME", " href=#", "URI NORMAL URI SPACE_OR_TAG_END FRAGMENT");
  assertTransition(
      "HTML_TAG_NAME", " href=>", "HTML_PCDATA");
  assertTransition(
      "HTML_TAG_NAME", " onclick=\"", "JS NORMAL SCRIPT DOUBLE_QUOTE REGEX");
  assertTransition(
      "HTML_TAG_NAME", " style=\"", "CSS NORMAL STYLE DOUBLE_QUOTE");
  assertTransition(
      "HTML_TAG_NAME", " stylez=\"",
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT DOUBLE_QUOTE");
  assertTransition(
      "HTML_TAG_NAME", " title=\"",
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT DOUBLE_QUOTE");
  assertTransition("HTML_TAG_NAME", "=foo>", "ERROR");
}

function testTag() {
  assertTransition("HTML_TAG NORMAL", "", "HTML_TAG NORMAL");
  assertTransition("HTML_TAG NORMAL", ">", "HTML_PCDATA");
  assertTransition("HTML_TAG TEXTAREA", ">", "HTML_RCDATA TEXTAREA");
  assertTransition("HTML_TAG TITLE", ">", "HTML_RCDATA TITLE");
  assertTransition("HTML_TAG SCRIPT", ">", "JS REGEX");
  assertTransition("HTML_TAG STYLE", ">", "CSS");
  assertTransition("HTML_TAG NORMAL", "-->", "ERROR");
  assertTransition("HTML_TAG NORMAL", " -->", "ERROR");
  assertTransition("HTML_TAG NORMAL", "=foo>", "ERROR");
  // As in <foo on{$handlerType}="jsHere()">
  assertTransition(
      "HTML_TAG NORMAL", " on", "HTML_ATTRIBUTE_NAME NORMAL SCRIPT");
  assertTransition(
      "HTML_TAG NORMAL", " ONCLICK", "HTML_ATTRIBUTE_NAME NORMAL SCRIPT");
  assertTransition(
      "HTML_TAG NORMAL", " style", "HTML_ATTRIBUTE_NAME NORMAL STYLE");
  assertTransition(
      "HTML_TAG NORMAL", " HREF", "HTML_ATTRIBUTE_NAME NORMAL URI");
  assertTransition(
      "HTML_TAG XMP", " title", "HTML_ATTRIBUTE_NAME XMP PLAIN_TEXT");
  assertTransition("HTML_TAG NORMAL", " checked ", "HTML_TAG NORMAL");
}

function testHtmlComment() {
  assertTransition("HTML_COMMENT", "", "HTML_COMMENT");
  assertTransition("HTML_COMMENT", " ", "HTML_COMMENT");
  assertTransition("HTML_COMMENT", "\r", "HTML_COMMENT");
  assertTransition("HTML_COMMENT", "/", "HTML_COMMENT");
  assertTransition("HTML_COMMENT", "x", "HTML_COMMENT");
  assertTransition("HTML_COMMENT", ">", "HTML_COMMENT");
  assertTransition("HTML_COMMENT", "-", "HTML_COMMENT");
  assertTransition("HTML_COMMENT", "-- >", "HTML_COMMENT");
  assertTransition("HTML_COMMENT", "->", "HTML_COMMENT");
  assertTransition("HTML_COMMENT", "-->", "HTML_PCDATA");
  assertTransition("HTML_COMMENT", "--->", "HTML_PCDATA");
  assertTransition("HTML_COMMENT", "<!--", "HTML_COMMENT");
}

function testAttrName() {
  assertTransition(
      "HTML_ATTRIBUTE_NAME XMP URI", "=",
      "HTML_BEFORE_ATTRIBUTE_VALUE XMP URI");
  assertTransition(
      "HTML_ATTRIBUTE_NAME TEXTAREA PLAIN_TEXT", "=",
      "HTML_BEFORE_ATTRIBUTE_VALUE TEXTAREA PLAIN_TEXT");
  assertTransition(
      "HTML_ATTRIBUTE_NAME NORMAL PLAIN_TEXT", " = ",
      "HTML_BEFORE_ATTRIBUTE_VALUE NORMAL PLAIN_TEXT");
}

function testBeforeAttrValue() {
  assertTransition(
      "HTML_BEFORE_ATTRIBUTE_VALUE NORMAL URI", "\"",
      "URI NORMAL URI DOUBLE_QUOTE START");
  assertTransition(
      "HTML_BEFORE_ATTRIBUTE_VALUE NORMAL SCRIPT", "'",
      "JS NORMAL SCRIPT SINGLE_QUOTE REGEX");
  assertTransition(
      "HTML_BEFORE_ATTRIBUTE_VALUE NORMAL STYLE", "\"",
      "CSS NORMAL STYLE DOUBLE_QUOTE");
  assertTransition(
      "HTML_BEFORE_ATTRIBUTE_VALUE TEXTAREA STYLE", "color",
      "CSS TEXTAREA STYLE SPACE_OR_TAG_END");
  assertTransition(
      "HTML_BEFORE_ATTRIBUTE_VALUE NORMAL URI", "/",
      "URI NORMAL URI SPACE_OR_TAG_END PRE_QUERY");
  assertTransition(
      "HTML_BEFORE_ATTRIBUTE_VALUE TITLE PLAIN_TEXT", "\"",
      "HTML_NORMAL_ATTR_VALUE TITLE PLAIN_TEXT DOUBLE_QUOTE");
  assertTransition(
      "HTML_BEFORE_ATTRIBUTE_VALUE NORMAL PLAIN_TEXT", ">", "HTML_PCDATA");
  assertTransition(
      "HTML_BEFORE_ATTRIBUTE_VALUE TITLE PLAIN_TEXT", ">",
      "HTML_RCDATA TITLE");
}

function testAttr() {
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT DOUBLE_QUOTE", "",
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT DOUBLE_QUOTE");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SINGLE_QUOTE", "",
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SINGLE_QUOTE");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SPACE_OR_TAG_END", "",
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SPACE_OR_TAG_END");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT DOUBLE_QUOTE", "foo",
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT DOUBLE_QUOTE");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SINGLE_QUOTE", "foo",
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SINGLE_QUOTE");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SPACE_OR_TAG_END", "foo",
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SPACE_OR_TAG_END");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT DOUBLE_QUOTE", "\"",
      "HTML_TAG NORMAL");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SINGLE_QUOTE", "'",
      "HTML_TAG NORMAL");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE SCRIPT PLAIN_TEXT SINGLE_QUOTE", "'",
      "HTML_TAG SCRIPT");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SPACE_OR_TAG_END", " x='",
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SINGLE_QUOTE");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SPACE_OR_TAG_END", " x='y'",
      "HTML_TAG NORMAL");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE NORMAL PLAIN_TEXT SPACE_OR_TAG_END", ">",
      "HTML_PCDATA");
  assertTransition(
      "HTML_NORMAL_ATTR_VALUE SCRIPT PLAIN_TEXT SPACE_OR_TAG_END", ">",
      "JS REGEX");
}

function testCss() {
  assertTransition("CSS", "", "CSS");
  assertTransition("CSS", " p { color: red; }", "CSS");
  assertTransition("CSS", "p.clazz#id {\r\n  border: 2px;\n}", "CSS");
  assertTransition("CSS", "/*\nHello, World! */", "CSS");
  assertTransition("CSS", "/*", "CSS_COMMENT");
  assertTransition("CSS", "/**", "CSS_COMMENT");
  assertTransition("CSS", "/** '", "CSS_COMMENT");
  assertTransition("CSS", "/** \"foo", "CSS_COMMENT");
  assertTransition("CSS", "'", "CSS_SQ_STRING");
  assertTransition("CSS", "\"", "CSS_DQ_STRING");
  assertTransition("CSS", "\" /* hello", "CSS_DQ_STRING");
  assertTransition("CSS", "url(", "CSS_URI START");
  assertTransition("CSS", "url(/search?q=", "CSS_URI QUERY");
  assertTransition("CSS", "url(  ", "CSS_URI START");
  assertTransition("CSS", "url('", "CSS_SQ_URI START");
  assertTransition("CSS", "url('//", "CSS_SQ_URI PRE_QUERY");
  assertTransition("CSS", "url('/search?q=", "CSS_SQ_URI QUERY");
  assertTransition("CSS", "url(\"", "CSS_DQ_URI START");
  assertTransition("CSS", "url(\"/search?q=", "CSS_DQ_URI QUERY");
  assertTransition("CSS", "url(\"/foo#bar", "CSS_DQ_URI FRAGMENT");
  // Not a start tag so NORMAL.
  assertTransition("CSS", "</style", "HTML_TAG NORMAL");
  assertTransition("CSS", "</Style", "HTML_TAG NORMAL");
  // Close style tag in attribute value is not a break.  Ok to transition to
  // ERROR.
  assertTransition("CSS NORMAL STYLE DOUBLE_QUOTE", "</style",
                   "CSS NORMAL STYLE DOUBLE_QUOTE");
}

function testCssComment() {
  assertTransition("CSS_COMMENT", "", "CSS_COMMENT");
  assertTransition("CSS_COMMENT", "\r\n\n\r", "CSS_COMMENT");
  assertTransition("CSS_COMMENT", " * /", "CSS_COMMENT");
  assertTransition("CSS_COMMENT", " */", "CSS");
  assertTransition("CSS_COMMENT", "**/", "CSS");
  assertTransition("CSS_COMMENT", "\\*/", "CSS");
  assertTransition(
      "CSS_COMMENT NORMAL STYLE SPACE_OR_TAG_END", "*/",
      "CSS NORMAL STYLE SPACE_OR_TAG_END");
}

function testCssDqString() {
  assertTransition("CSS_DQ_STRING", "", "CSS_DQ_STRING");
  assertTransition("CSS_DQ_STRING", "Hello, World!", "CSS_DQ_STRING");
  assertTransition("CSS_DQ_STRING", "Don't", "CSS_DQ_STRING");
  assertTransition("CSS_DQ_STRING", "\"", "CSS");
  assertTransition("CSS_DQ_STRING", "\\22", "CSS_DQ_STRING");
  assertTransition("CSS_DQ_STRING", "\\22 ", "CSS_DQ_STRING");
  assertTransition("CSS_DQ_STRING", "\\27", "CSS_DQ_STRING");
  assertTransition("CSS_DQ_STRING", "\r", "ERROR");
  assertTransition("CSS_DQ_STRING", "\n", "ERROR");
  assertTransition("CSS_DQ_STRING", "</style>", "HTML_PCDATA");  // Or error.
}

function testCssSqString() {
  assertTransition("CSS_SQ_STRING", "", "CSS_SQ_STRING");
  assertTransition("CSS_SQ_STRING", "Hello, World!", "CSS_SQ_STRING");
  assertTransition(
      "CSS_SQ_STRING", "M. \"The Greatest!\" Ali", "CSS_SQ_STRING");
  assertTransition("CSS_SQ_STRING", "'", "CSS");
  assertTransition("CSS_SQ_STRING", "\\22", "CSS_SQ_STRING");
  assertTransition("CSS_SQ_STRING", "\\22 ", "CSS_SQ_STRING");
  assertTransition("CSS_SQ_STRING", "\\27", "CSS_SQ_STRING");
  assertTransition("CSS_SQ_STRING", "\r", "ERROR");
  assertTransition("CSS_SQ_STRING", "\n", "ERROR");
  assertTransition("CSS_SQ_STRING", "</style>", "HTML_PCDATA");  // Or error.
  assertTransition(
      "CSS_SQ_STRING NORMAL STYLE SPACE_OR_TAG_END", "'",
      "CSS NORMAL STYLE SPACE_OR_TAG_END");
}

function testCssUri() {
  assertTransition("CSS_URI START", "", "CSS_URI START");
  assertTransition("CSS_URI START", "/search?q=cute+bunnies", "CSS_URI QUERY");
  assertTransition("CSS_URI START", "#anchor)", "CSS");
  assertTransition("CSS_URI START", "#anchor )", "CSS");
  assertTransition("CSS_URI START", "/do+not+panic", "CSS_URI PRE_QUERY");
  assertTransition(
      "CSS_SQ_URI START", "/don%27t+panic", "CSS_SQ_URI PRE_QUERY");
  assertTransition("CSS_SQ_URI START", "Muhammed+\"The+Greatest!\"+Ali",
                   "CSS_SQ_URI PRE_QUERY");
  assertTransition(
      "CSS_SQ_URI START", "(/don%27t+panic)", "CSS_SQ_URI PRE_QUERY");
  assertTransition(
      "CSS_DQ_URI START", "Muhammed+%22The+Greatest!%22+Ali",
      "CSS_DQ_URI PRE_QUERY");
  assertTransition("CSS_DQ_URI START", "/don't+panic", "CSS_DQ_URI PRE_QUERY");
  assertTransition("CSS_SQ_URI START", "#foo'", "CSS");
  assertTransition(
      "CSS_URI NORMAL STYLE SPACE_OR_TAG_END START", ")",
      "CSS NORMAL STYLE SPACE_OR_TAG_END");
  assertTransition(
      "CSS_DQ_URI NORMAL STYLE SINGLE_QUOTE PRE_QUERY", "\"",
      "CSS NORMAL STYLE SINGLE_QUOTE");
  assertTransition(
      "CSS_SQ_URI NORMAL STYLE DOUBLE_QUOTE FRAGMENT", "#x'",
      "CSS NORMAL STYLE DOUBLE_QUOTE");
}

function testJsBeforeRegex() {
  assertTransition("JS REGEX", "", "JS REGEX");
  assertTransition("JS REGEX", "/*", "JS_BLOCK_COMMENT REGEX");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END REGEX", "/*",
      "JS_BLOCK_COMMENT NORMAL SCRIPT SPACE_OR_TAG_END REGEX");
  assertTransition("JS REGEX", "//", "JS_LINE_COMMENT REGEX");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END REGEX", "//",
      "JS_LINE_COMMENT NORMAL SCRIPT SPACE_OR_TAG_END REGEX");
  assertTransition("JS REGEX", "'", "JS_SQ_STRING");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END REGEX", "'",
      "JS_SQ_STRING NORMAL SCRIPT SPACE_OR_TAG_END");
  assertTransition("JS REGEX", "\"", "JS_DQ_STRING");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END REGEX", "\"",
      "JS_DQ_STRING NORMAL SCRIPT SPACE_OR_TAG_END");
  assertTransition("JS REGEX", "42", "JS DIV_OP");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END REGEX", "42",
      "JS NORMAL SCRIPT SPACE_OR_TAG_END DIV_OP");
  assertTransition("JS REGEX", "0.", "JS DIV_OP");
  assertTransition("JS REGEX", "x", "JS DIV_OP");
  assertTransition("JS REGEX", "-", "JS REGEX");
  assertTransition("JS REGEX", "--", "JS DIV_OP");
  assertTransition("JS REGEX", " \t \n ", "JS REGEX");
  assertTransition("JS REGEX", ")", "JS DIV_OP");
  assertTransition("JS REGEX", "/", "JS_REGEX");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END REGEX", "/",
      "JS_REGEX NORMAL SCRIPT SPACE_OR_TAG_END");
  assertTransition("JS REGEX", "/[xy]/", "JS DIV_OP");
  assertTransition("JS REGEX", "</script>", "HTML_PCDATA");
}

function testJsBeforeDivOp() {
  assertTransition("JS DIV_OP", "", "JS DIV_OP");
  assertTransition("JS DIV_OP", "/*", "JS_BLOCK_COMMENT DIV_OP");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END DIV_OP", "/*",
      "JS_BLOCK_COMMENT NORMAL SCRIPT SPACE_OR_TAG_END DIV_OP");
  assertTransition("JS DIV_OP", "//", "JS_LINE_COMMENT DIV_OP");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END DIV_OP", "//",
      "JS_LINE_COMMENT NORMAL SCRIPT SPACE_OR_TAG_END DIV_OP");
  assertTransition("JS DIV_OP", "'", "JS_SQ_STRING");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END DIV_OP", "'",
      "JS_SQ_STRING NORMAL SCRIPT SPACE_OR_TAG_END");
  assertTransition("JS DIV_OP", "\"", "JS_DQ_STRING");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END DIV_OP", "\"",
      "JS_DQ_STRING NORMAL SCRIPT SPACE_OR_TAG_END");
  assertTransition("JS DIV_OP", "42", "JS DIV_OP");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END DIV_OP", "42",
      "JS NORMAL SCRIPT SPACE_OR_TAG_END DIV_OP");
  assertTransition("JS DIV_OP", "0.", "JS DIV_OP");
  assertTransition("JS DIV_OP", "x", "JS DIV_OP");
  assertTransition("JS DIV_OP", "-", "JS REGEX");
  assertTransition("JS DIV_OP", "--", "JS DIV_OP");
  assertTransition("JS DIV_OP", "  \n ", "JS DIV_OP");
  assertTransition("JS DIV_OP", ")", "JS DIV_OP");
  assertTransition("JS DIV_OP", "/", "JS REGEX");
  assertTransition(
      "JS NORMAL SCRIPT SPACE_OR_TAG_END DIV_OP", "/",
      "JS NORMAL SCRIPT SPACE_OR_TAG_END REGEX");
  assertTransition("JS DIV_OP", "/[xy]/", "JS REGEX");
  assertTransition("JS DIV_OP", "</script>", "HTML_PCDATA");
}

function testJsLineComment() {
  assertTransition("JS_LINE_COMMENT DIV_OP", "", "JS_LINE_COMMENT DIV_OP");
  assertTransition("JS_LINE_COMMENT DIV_OP", "*/", "JS_LINE_COMMENT DIV_OP");
  assertTransition("JS_LINE_COMMENT DIV_OP", "Hello, World!",
                   "JS_LINE_COMMENT DIV_OP");
  assertTransition("JS_LINE_COMMENT DIV_OP", "\"'/", "JS_LINE_COMMENT DIV_OP");
  assertTransition("JS_LINE_COMMENT DIV_OP", "\n", "JS DIV_OP");
  assertTransition(
      "JS_LINE_COMMENT NORMAL SCRIPT DOUBLE_QUOTE DIV_OP", "\n",
      "JS NORMAL SCRIPT DOUBLE_QUOTE DIV_OP");
  assertTransition("JS_LINE_COMMENT DIV_OP", "</script>", "HTML_PCDATA");
  assertTransition("JS_LINE_COMMENT REGEX", "", "JS_LINE_COMMENT REGEX");
  assertTransition("JS_LINE_COMMENT REGEX", "*/", "JS_LINE_COMMENT REGEX");
  assertTransition("JS_LINE_COMMENT REGEX", "Hello, World!",
                   "JS_LINE_COMMENT REGEX");
  assertTransition("JS_LINE_COMMENT REGEX", "\"'/", "JS_LINE_COMMENT REGEX");
  assertTransition("JS_LINE_COMMENT REGEX", "\n", "JS REGEX");
  assertTransition("JS_LINE_COMMENT REGEX", "</script>", "HTML_PCDATA");
}

function testJsBlockComment() {
  assertTransition("JS_BLOCK_COMMENT DIV_OP", "", "JS_BLOCK_COMMENT DIV_OP");
  assertTransition("JS_BLOCK_COMMENT DIV_OP", "\n", "JS_BLOCK_COMMENT DIV_OP");
  assertTransition("JS_BLOCK_COMMENT DIV_OP", "Hello, World!",
                   "JS_BLOCK_COMMENT DIV_OP");
  assertTransition(
      "JS_BLOCK_COMMENT DIV_OP", "\"'/", "JS_BLOCK_COMMENT DIV_OP");
  assertTransition("JS_BLOCK_COMMENT DIV_OP", "*/", "JS DIV_OP");
  assertTransition(
      "JS_BLOCK_COMMENT NORMAL SCRIPT DOUBLE_QUOTE DIV_OP", "*/",
      "JS NORMAL SCRIPT DOUBLE_QUOTE DIV_OP");
  assertTransition("JS_BLOCK_COMMENT DIV_OP", "</script>", "HTML_PCDATA");
  assertTransition("JS_BLOCK_COMMENT REGEX", "", "JS_BLOCK_COMMENT REGEX");
  assertTransition("JS_BLOCK_COMMENT REGEX", "\r\n", "JS_BLOCK_COMMENT REGEX");
  assertTransition("JS_BLOCK_COMMENT REGEX", "Hello, World!",
                   "JS_BLOCK_COMMENT REGEX");
  assertTransition("JS_BLOCK_COMMENT REGEX", "\"'/", "JS_BLOCK_COMMENT REGEX");
  assertTransition("JS_BLOCK_COMMENT REGEX", "*/", "JS REGEX");
  // Or error.
  assertTransition("JS_BLOCK_COMMENT REGEX", "</script>", "HTML_PCDATA");
}

function testJsDqString() {
  assertTransition("JS_DQ_STRING", "", "JS_DQ_STRING");
  assertTransition("JS_DQ_STRING", "Hello, World!", "JS_DQ_STRING");
  assertTransition("JS_DQ_STRING", "\"", "JS DIV_OP");
  assertTransition(
      "JS_DQ_STRING NORMAL SCRIPT SINGLE_QUOTE", "Hello, World!",
      "JS_DQ_STRING NORMAL SCRIPT SINGLE_QUOTE");
  assertTransition(
      "JS_DQ_STRING NORMAL SCRIPT SINGLE_QUOTE", "\"",
      "JS NORMAL SCRIPT SINGLE_QUOTE DIV_OP");
  assertTransition("JS_DQ_STRING", "</script>", "HTML_PCDATA");  // Or error.
  assertTransition("JS_DQ_STRING", "</p>", "JS_DQ_STRING");
}

function testJsSqString() {
  assertTransition("JS_SQ_STRING", "", "JS_SQ_STRING");
  assertTransition("JS_SQ_STRING", "Hello, World!", "JS_SQ_STRING");
  assertTransition("JS_SQ_STRING", "/*", "JS_SQ_STRING");
  assertTransition("JS_SQ_STRING", "\"", "JS_SQ_STRING");
  assertTransition("JS_SQ_STRING", "\\x27", "JS_SQ_STRING");
  assertTransition("JS_SQ_STRING", "\\'", "JS_SQ_STRING");
  assertTransition("JS_SQ_STRING", "\r", "ERROR");
  assertTransition("JS_SQ_STRING", "\\\rn", "JS_SQ_STRING");
  assertTransition("JS_SQ_STRING", "'", "JS DIV_OP");
  assertTransition(
      "JS_SQ_STRING NORMAL SCRIPT DOUBLE_QUOTE", "Hello, World!",
      "JS_SQ_STRING NORMAL SCRIPT DOUBLE_QUOTE");
  assertTransition(
      "JS_SQ_STRING NORMAL SCRIPT DOUBLE_QUOTE", "'",
      "JS NORMAL SCRIPT DOUBLE_QUOTE DIV_OP");
  assertTransition("JS_SQ_STRING", "</script>", "HTML_PCDATA");  // Or error.
  assertTransition("JS_SQ_STRING", "</s>", "JS_SQ_STRING");
}

function testJsRegex() {
  assertTransition("JS_REGEX", "", "JS_REGEX");
  assertTransition("JS_REGEX", "Hello, World!", "JS_REGEX");
  assertTransition("JS_REGEX", "\\/*", "JS_REGEX");
  assertTransition("JS_REGEX", "[/*]", "JS_REGEX");
  assertTransition("JS_REGEX", "\"", "JS_REGEX");
  assertTransition("JS_REGEX", "\\x27", "JS_REGEX");
  assertTransition("JS_REGEX", "\\'", "JS_REGEX");
  assertTransition("JS_REGEX", "\r", "ERROR");
  // Line continuations not allowed in RegExps.
  assertTransition("JS_REGEX", "\\\rn", "ERROR");
  assertTransition("JS_REGEX", "/", "JS DIV_OP");
  assertTransition(
      "JS_REGEX NORMAL SCRIPT DOUBLE_QUOTE", "Hello, World!",
      "JS_REGEX NORMAL SCRIPT DOUBLE_QUOTE");
  assertTransition(
      "JS_REGEX NORMAL SCRIPT DOUBLE_QUOTE", "/",
      "JS NORMAL SCRIPT DOUBLE_QUOTE DIV_OP");
  assertTransition("JS_REGEX", "</script>", "HTML_PCDATA");  // Or error.
}

function testUri() {
  assertTransition("URI START", "", "URI START");
  assertTransition("URI START", ".", "URI PRE_QUERY");
  assertTransition("URI START", "/", "URI PRE_QUERY");
  assertTransition("URI START", "#", "URI FRAGMENT");
  assertTransition("URI START", "x", "URI PRE_QUERY");
  assertTransition("URI START", "?", "URI QUERY");
  assertTransition("URI QUERY", "", "URI QUERY");
  assertTransition("URI QUERY", ".", "URI QUERY");
  assertTransition("URI QUERY", "/", "URI QUERY");
  assertTransition("URI QUERY", "#", "URI FRAGMENT");
  assertTransition("URI QUERY", "x", "URI QUERY");
  assertTransition("URI QUERY", "&", "URI QUERY");
  assertTransition("URI FRAGMENT", "", "URI FRAGMENT");
  assertTransition("URI FRAGMENT", "?", "URI FRAGMENT");
}

function testError() {
  assertTransition("ERROR", "/*//'\"\r\n\f\n\rFoo", "ERROR");
}

function testRcdata() {
  assertTransition("HTML_RCDATA XMP", "", "HTML_RCDATA XMP");
  assertTransition("HTML_RCDATA XMP", "Hello, World!", "HTML_RCDATA XMP");
  assertTransition("HTML_RCDATA XMP", "<p", "HTML_RCDATA XMP");
  assertTransition("HTML_RCDATA XMP", "<p ", "HTML_RCDATA XMP");
  assertTransition("HTML_RCDATA XMP", "</textarea>", "HTML_RCDATA XMP");
  assertTransition("HTML_RCDATA XMP", "</xmp>", "HTML_PCDATA");
  assertTransition("HTML_RCDATA XMP", "</xMp>", "HTML_PCDATA");
  assertTransition("HTML_RCDATA TEXTAREA", "</xmp>", "HTML_RCDATA TEXTAREA");
  assertTransition("HTML_RCDATA TEXTAREA", "</textarea>", "HTML_PCDATA");
}

function assertContextUnion(golden, a, b) {
  var actual = contextUnion(a, b);
  if (contextUnion(b, a) !== actual) {
    fail('union( ' + contextToString(a) + ', ' + contextToString(b)
         + ') not symmetric');
  }
  if (golden !== actual) {
    fail('union( ' + contextToString(a) + ', ' + contextToString(b)
         + ') = ' + contextToString(actual)
         + ', not ' + contextToString(golden));
  }
}

function testContextUnion() {
  assertContextUnion(STATE_HTML_PCDATA, STATE_HTML_PCDATA, STATE_HTML_PCDATA);
  assertContextUnion(
      STATE_JS | JS_FOLLOWING_SLASH_UNKNOWN,
      STATE_JS | JS_FOLLOWING_SLASH_DIV_OP,
      STATE_JS | JS_FOLLOWING_SLASH_REGEX);
  assertContextUnion(
      STATE_JS | JS_FOLLOWING_SLASH_UNKNOWN | ATTR_TYPE_SCRIPT,
      STATE_JS | JS_FOLLOWING_SLASH_DIV_OP | ATTR_TYPE_SCRIPT,
      STATE_JS | JS_FOLLOWING_SLASH_REGEX | ATTR_TYPE_SCRIPT);
  assertContextUnion(
      STATE_URI | ATTR_TYPE_URI | URI_PART_START,
      STATE_URI | ATTR_TYPE_URI | URI_PART_START,
      STATE_URI | ATTR_TYPE_URI | URI_PART_START);
  assertContextUnion(
      STATE_URI | ATTR_TYPE_URI | URI_PART_UNKNOWN_PRE_FRAGMENT,
      STATE_URI | ATTR_TYPE_URI | URI_PART_PRE_QUERY,
      STATE_URI | ATTR_TYPE_URI | URI_PART_START);
  assertContextUnion(
      STATE_URI | ATTR_TYPE_URI | URI_PART_UNKNOWN_PRE_FRAGMENT,
      STATE_URI | ATTR_TYPE_URI | URI_PART_PRE_QUERY,
      STATE_URI | ATTR_TYPE_URI | URI_PART_QUERY);
  assertContextUnion(
      STATE_URI | ATTR_TYPE_URI | URI_PART_UNKNOWN,
      STATE_URI | ATTR_TYPE_URI | URI_PART_FRAGMENT,
      STATE_URI | ATTR_TYPE_URI | URI_PART_QUERY);
  assertContextUnion(
      STATE_HTML_TAG | ELEMENT_TYPE_SCRIPT,
      STATE_HTML_TAG | ELEMENT_TYPE_SCRIPT,
      STATE_HTML_TAG_NAME);
  assertContextUnion(
      STATE_HTML_TAG | ELEMENT_TYPE_STYLE,
      STATE_HTML_TAG | ELEMENT_TYPE_STYLE,
      STATE_HTML_ATTRIBUTE_NAME | ELEMENT_TYPE_STYLE |
      DELIM_TYPE_SPACE_OR_TAG_END);
  assertContextUnion(
      STATE_ERROR,
      STATE_HTML_PCDATA, STATE_HTML_RCDATA | ELEMENT_TYPE_TITLE);
}

function testIsRegexPreceder() {
  function assertIsRegexPreceder(jsTokens) {
    assertTruthy(jsTokens, isRegexPreceder(jsTokens));
  }

  function assertIsDivOpPreceder(jsTokens) {
    assertFalsey(jsTokens, isRegexPreceder(jsTokens));
  }

  // Statement terminators precede regexs.
  assertIsRegexPreceder(";");
  assertIsRegexPreceder("}");
  // But expression terminators precede div ops.
  assertIsDivOpPreceder(")");
  assertIsDivOpPreceder("]");
  // At the start of an expression or statement, expect a regex.
  assertIsRegexPreceder("(");
  assertIsRegexPreceder("[");
  assertIsRegexPreceder("{");
  // Assignment operators precede regexs.
  assertIsRegexPreceder("=");
  assertIsRegexPreceder("+=");
  assertIsRegexPreceder("*=");
  // Whether the + or - is infix or prefix, it cannot precede a div op.
  assertIsRegexPreceder("+");
  assertIsRegexPreceder("-");
  // An incr/decr op precedes a div operator.
  assertIsDivOpPreceder("--");
  assertIsDivOpPreceder("++");
  assertIsDivOpPreceder("x--");
  // When we have many dashes or pluses, then they are grouped left to right.
  assertIsRegexPreceder("x---");  // A postfix -- then a -.
  // return followed by a slash returns the regex literal.
  assertIsRegexPreceder("return");
  // Identifiers can be divided by.
  assertIsDivOpPreceder("x");
  assertIsDivOpPreceder("preturn");
  // Dots precede regexs.
  assertIsRegexPreceder("..");
  assertIsRegexPreceder("...");
  // But not if part of a number.
  assertIsDivOpPreceder("0.");
  // Numbers precede div ops.
  assertIsDivOpPreceder("0");
}
