/**
 * Requires that the given template text parses to the given tree.
 */
function assertParsedJqueryTemplate(goldenTree, jqueryTemplateText) {
  var blockDirectives = $.extend(
      guessBlockDirectives(jqueryTemplateText), DEFAULT_BLOCK_DIRECTIVES);
  var parseTree = parseTemplate(jqueryTemplateText, blockDirectives);
  assertEquals(jqueryTemplateText, JSON.stringify(goldenTree),
               JSON.stringify(parseTree));
  var rendered = renderParseTree(parseTree, blockDirectives);
  assertEquals(
      "reparse: " + jqueryTemplateText + " -> " + rendered,
      JSON.stringify(goldenTree),
      JSON.stringify(parseTemplate(rendered, blockDirectives)));
}

function testParseSimpleText() {
  assertParsedJqueryTemplate(["", ""], "");
  assertParsedJqueryTemplate(["", "", "foo"], "foo");
  assertParsedJqueryTemplate(["", "", "<b>foo</b>"], "<b>foo</b>");
}

function testSubstitutions() {
  assertParsedJqueryTemplate(["", "", ["=", "foo"]], "${foo}");
  assertParsedJqueryTemplate(["", "", ["=", "foo + 1"]], "${foo + 1}");
  assertParsedJqueryTemplate(["", "", "foo", ["=", "bar"], "baz"],
                             "foo${bar}baz");
}

function testMalformedSubstitutions() {
  // Unclosed ${...}
  assertParsedJqueryTemplate(["", "", "foo${bar"], "foo${bar");
  assertParsedJqueryTemplate(["", "", "(", ["=", "x"], ", ", ["=", "y"], ")"],
                             "(${x}, ${y})");
}

function testInlineDirectives() {
  assertParsedJqueryTemplate(
      ["", "", "Hello, ", ["panic", ""], " World!"],
      "Hello, {{panic}} World!");
  assertParsedJqueryTemplate(
      ["", "", "Hello, ", ["panic", " true"], " World!"],
      "Hello, {{panic true}} World!");
}

function testIf() {
  assertParsedJqueryTemplate(
      ["", "",
       "<",
       ["if", " cond1",
        "foo",
        ["else", " cond2"],
        "bar",
        ["else", ""],
        "baz"
       ],
       ">"
      ],
      "<{{if cond1}}foo{{else cond2}}bar{{else}}baz{{/if}}>");
}

function testCustomTags() {
  assertParsedJqueryTemplate(
      ["", "",
       ["custom1", " foo",
        "bar",
        ["custom2", " baz"]
       ],
       ["custom3", ""],
       "boo",
       ["custom3", ""]
      ],
      "{{custom1 foo}}bar{{custom2 baz}}{{/custom1}}{{custom3}}boo{{custom3}}");
}

function testMisplacedEndMarker() {
  try {
    parseTemplate("foo{{/if}}", DEFAULT_BLOCK_DIRECTIVES);
  } catch (ex) {
    return;
  }
  throw new Error("Parsing did not fail for extra end marker.");
}

function testPartialMarker() {
  assertParsedJqueryTemplate(
      ["", "", "{{html xyz}"], "{{html xyz}");
}

function testJavaScriptCurlies() {
  assertParsedJqueryTemplate(
      ["", "", "if (foo) {{ foo() }}"], "if (foo) {{ foo() }}");
}
