
function assertParsedJQueryTemplate(goldenTree, jqueryTemplateText) {
  var parseTree = parseJqueryTemplate(jqueryTemplateText);
  assertEquals(jqueryTemplateText, JSON.stringify(goldenTree),
               JSON.stringify(parseTree));
  var rendered = renderJQueryTemplate(parseTree);
  assertEquals(
      'reparse: ' + jqueryTemplateText + ' -> ' + rendered,
      JSON.stringify(goldenTree),
      JSON.stringify(parseJqueryTemplate(rendered)));
}

function testParseSimpleText() {
  assertParsedJQueryTemplate(['T', ''], '');
  assertParsedJQueryTemplate(['T', '', 'foo'], 'foo');
  assertParsedJQueryTemplate(['T', '', '<b>foo</b>'], '<b>foo</b>');
}

function testSubstitutions() {
  assertParsedJQueryTemplate(['T', '', ['$', 'foo']], '${foo}');
  assertParsedJQueryTemplate(['T', '', ['$', 'foo + 1']], '${foo + 1}');
  assertParsedJQueryTemplate(['T', '', 'foo', ['$', 'bar'], 'baz'],
                             'foo${bar}baz');
  // Unclosed ${...}
  assertParsedJQueryTemplate(['T', '', 'foo${bar'], 'foo${bar');
  assertParsedJQueryTemplate(['T', '', '(', ['$', 'x'], ', ', ['$', 'y'], ')'],
                             '(${x}, ${y})');
}

function testInlineDirectives() {
  assertParsedJQueryTemplate(
      ['T', '', 'Hello, ', ['panic', ''], ' World!'],
      'Hello, {{panic}} World!');
  assertParsedJQueryTemplate(
      ['T', '', 'Hello, ', ['panic', ' true'], ' World!'],
      'Hello, {{panic true}} World!');
}

function testIf() {
  assertParsedJQueryTemplate(
      ['T', '',
       '<',
       ['if', ' cond1',
        'foo',
        ['else', ' cond2'],
        'bar',
        ['else', ''],
        'baz'
       ],
       '>'
      ],
      '<{{if cond1}}foo{{else cond2}}bar{{else}}baz{{/if}}>');
}

function testCustomTags() {
  assertParsedJQueryTemplate(
      ['T', '',
       ['custom1', ' foo',
        'bar',
        ['custom2', ' baz']
       ],
       ['custom3', ''],
       'boo',
       ['custom3', '']
      ],
      '{{custom1 foo}}bar{{custom2 baz}}{{/custom1}}{{custom3}}boo{{custom3}}');
}

function testMisplacedEndMarker() {
  assertParsedJQueryTemplate(
      ['T', '', 'foo'], 'foo{{/if}}');
}

function testPartialMarker() {
  assertParsedJQueryTemplate(
      ['T', '', '{{html xyz}'], '{{html xyz}');
}

function testJavaScriptCurlies() {
  assertParsedJQueryTemplate(
      ['T', '', 'if (foo) {{ foo() }}'], 'if (foo) {{ foo() }}');
}

function assertTypedJQueryTemplates(golden, input) {
  var templates = contextuallyEscapeTemplates(input);
  var actual = {};
  for (var k in templates) {
    if (Object.hasOwnProperty.call(templates, k)) {
      actual[k] = renderJQueryTemplate(templates[k]);
    }
  }
  assertEquals(JSON.stringify(golden), JSON.stringify(actual));
}

function testAutoescapeSimpleHtml() {
  assertTypedJQueryTemplates(
      {
        foo: "Hello, ${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](world)}!"
      },
      {
        foo: "Hello, ${world}!"
      });
}

function testAutoescapeSimpleScript() {
  assertTypedJQueryTemplates(
      {
        foo: "<script>alert('Hello, ${SAFEHTML_ESC["
            + ESC_MODE_ESCAPE_JS_STRING + "](world)}!')</script>"
      },
      {
        foo: "<script>alert('Hello, ${world}!')</script>"
      });
}

function testAutoescapeSimpleLink() {
  assertTypedJQueryTemplates(
      {
        foo: "<a href=\"/Hello?world="
            + "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_URI + "](world)}\">"
            + "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](world)}</a>"
      },
      {
        foo: "<a href=\"/Hello?world=${world}\">${world}</a>"
      });
}
