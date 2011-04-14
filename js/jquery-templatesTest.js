function join(var_args) {
  return Array.prototype.slice.call(arguments, 0).join('');
}

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

function rewrittenSource(input) {
  var templates = contextuallyEscapeTemplates(input);
  var actual = {};
  for (var k in templates) {
    if (Object.hasOwnProperty.call(templates, k)) {
      actual[k] = renderJQueryTemplate(templates[k]).replace(
          /(\{\{(else|noAutoescape|tmpl)(?:\}?[^}])*\}\})\{\{\/\2\}\}/g, '$1');
    }
  }
  return actual;
}

function assertContextualRewriting(expectedOutput, input) {
  var actualOutput = rewrittenSource(input);
  assertEquals(JSON.stringify(expectedOutput), JSON.stringify(actualOutput));
}

function assertContextualRewritingNoop(expectedOutput) {
  assertContextualRewriting(expectedOutput, expectedOutput);
}

/**
 * @param opt_msg Message that should be reported to the template author.
 *     Null means don't care.
 */
function assertRewriteFails(input, opt_msg) {
  var output;
  try {
    output = rewrittenSource(input);
  } catch (ex) {
    if (opt_msg !== void 0 && opt_msg !== (ex.description || ex.message)) {
      throw ex;
    }
    return;
  }
  fail("Expected failure but was " + JSON.stringify(output));
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

function testTrivialTemplate() {
  assertContextualRewritingNoop(
      {
        "foo": "Hello, World!"
      });
}

function testPrintInText() {
  assertContextualRewriting(
      {
        foo: "Hello, ${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](world)}!"
      },
      {
        foo: "Hello, ${world}!"
      });
}

function testPrintInTextAndLink() {
  assertContextualRewriting(
      {
        foo: "Hello, <a href=\"worlds?world="
            + "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_URI + "](world)}\">"
            + "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](world)}</a>!"
      },
      {
        foo: "Hello, <a href=\"worlds?world=${world}\">${world}</a>!"
      });
}

function testConditional() {
  assertContextualRewriting(
      {
        "bar": join(
          "Hello,",
          "{{if x == 1}}",
            "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](y)}",
          "{{else x == 2}}",
            "<script>foo(${SAFEHTML_ESC["
                + ESC_MODE_ESCAPE_JS_VALUE + "](z)})</script>",
          "{{else}}",
            "World!",
          "{{/if}}")
      },
      {
        "bar": join(
          "Hello,",
          "{{if x == 1}}",
            "${y}",
          "{{else x == 2}}",
            "<script>foo(${z})</script>",
          "{{else}}",
            "World!",
          "{{/if}}")
      });
}

function testConditionalEndsInDifferentContext() {
  // Make sure that branches that ends in consistently different contexts
  // transition to that different context.
  assertContextualRewriting(
      {
        "bar": join(
            "<a",
            "{{if $url}}",
              " href='${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML_ATTRIBUTE
                  + "](SAFEHTML_ESC[" + ESC_MODE_FILTER_NORMALIZE_URI
                  + "](url))}'>",
            "{{else $name}}",
              " name='${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML_ATTRIBUTE
                  + "](name)}'>",
            "{{else}}",
              ">",
            "{{/if}}",
            // Not escapeJsValue because we are not inside a tag.
            " onclick='alert(${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML
                + "](value)})'")
      },
      {
        "bar": join(
            "<a",
            // Each of these branches independently closes the tag.
            "{{if $url}}",
              " href='${url}'>",
            "{{else $name}}",
              " name='${name}'>",
            "{{else}}",
              ">",
            "{{/if}}",
            // So now make something that looks like a script attribute but
            // which actually appears in a PCDATA.  If the context merge has
            // properly happened is is escaped as PCDATA.
            " onclick='alert(${value})'")
      });
}

function testBrokenConditional() {
  assertRewriteFails(
      {
        "bar": join(
          "Hello,\n",
          "{{if x == 1}}\n",
            "${y}\n",
          "{{else x == 2}}\n",
            "<script>foo(${z})//</scrpit>\n",  // Not closed so ends inside JS.
          "{{else}}\n",
            "World!\n",
          "{{/if}}")
      },
      "bar:2:`{{if x == 1}} ${...} World! {{/if}}`:"
      + " Branch ends in irreconcilable contexts"
      + " [Context JS DIV_OP] and [Context HTML_PCDATA]");
}

function testPrintInsideScript() {
  assertContextualRewriting(
      {
        "bar": join(
            "<script>\n",
              "foo(${SAFEHTML_ESC["
                  + ESC_MODE_ESCAPE_JS_VALUE + "](a)});\n",
              "bar(\"${SAFEHTML_ESC["
                  + ESC_MODE_ESCAPE_JS_STRING + "](b)}\");\n",
              "baz(\'${SAFEHTML_ESC["
                  + ESC_MODE_ESCAPE_JS_STRING + "](c)}\');\n",
              "boo(/${SAFEHTML_ESC["
                  + ESC_MODE_ESCAPE_JS_REGEX
                  + "](d)}/.test(s) ? 1 / ${SAFEHTML_ESC["
                  + ESC_MODE_ESCAPE_JS_VALUE + "](e)}",
              " : /${SAFEHTML_ESC["
                  + ESC_MODE_ESCAPE_JS_REGEX + "](f)}/);\n",
            "</script>")
      },
      {
        "bar": join(
            "<script>\n",
              "foo(${a});\n",
              "bar(\"${b}\");\n",
              "baz(\'${c}\');\n",
              "boo(/${d}/.test(s) ? 1 / ${e} : /${f}/);\n",
            "</script>")
      });
}

function testPrintInsideJsCommentRejected() {
  assertRewriteFails(
      {
        "foo": "<script>// ${x}</script>"
      },
      "foo:1:`${x}`: Don't put ${...} inside comments");
}

function testEachLoop() {
  assertContextualRewriting(
      {
        "bar": join(
            "<style>",
              "{{each (i, className) classes}}",
                ".foo${SAFEHTML_ESC[" + ESC_MODE_FILTER_CSS_VALUE
                    + "](className)}:before {",
                  "content: '${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_CSS_STRING
                      + "](i)}'",
                "}",
              "{{/each}}",
            "</style>")
      },
      {
        "bar": join(
            "<style>",
              "{{each (i, className) classes}}",
                ".foo${className}:before {",
                  "content: '${i}'",
                "}",
              "{{/each}}",
            "</style>")
      });
}

function testBrokenLoop() {
  assertRewriteFails(
      {
        "bar": join(
            "<style>\n",
              "{{each (i, className) classes}}",
                ".foo${i}:before {",
                  "content: '${i}",  // Missing close quote.
                "}",
              "{{/each}}",
            "</style>")
      },
      "bar:2:`{{each (i, class... '${i}}{{/each}}`:"
      + " Loop ends in irreconcilable contexts"
      + " [Context CSS] and [Context CSS_SQ_STRING]");
}

function testSimpleEachLoop() {
  assertContextualRewriting(
      {
        "baz": join(
            "<ol>",
              "{{each values}}",
                "<li>${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](value)}</li>",
              "{{/each}}",
            "</ol>")
      },
      {
        "baz": join(
            "<ol>",
              "{{each values}}",
                "<li>${value}</li>",
              "{{/each}}",
            "</ol>")
      });
}

function testCall() {
  assertContextualRewriting(
      {
        "foo": "{{tmpl #bar}}",
        "bar": "Hello, ${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](world)}!"
      },
      {
        "foo": "{{tmpl #bar}}",
        "bar": "Hello, ${world}!"
      });
}

function testCallWithParams() {
  assertContextualRewriting(
      {
        "foo": "{{tmpl ({ x: y }) #bar}}",
        "bar": "Hello, ${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](world)}!"
      },
      {
        "foo": "{{tmpl ({ x: y }) #bar}}",
        "bar": "Hello, ${world}!"
      });
}

function testSameTemplateCalledInDifferentContexts() {
  assertContextualRewriting(
      {
        "foo": join(
            "{{tmpl #bar}}",
            "<script>",
            "alert('{{tmpl #bar__C20}}');",
            "</script>"),
        "bar": "Hello, ${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](world)}!",
        "bar__C20": "Hello, ${SAFEHTML_ESC["
            + ESC_MODE_ESCAPE_JS_STRING + "](world)}!"
      },
      {
        "foo": join(
            "{{tmpl #bar}}",
            "<script>",
            "alert('{{tmpl #bar}}');",
            "</script>"),
        "bar": "Hello, ${world}!"
      });
}

function testRecursiveTemplateGuessWorks() {
  assertContextualRewriting(
      {
        "foo": join(
            "<script>",
              "x = [{{tmpl #countDown__C8208}}]",
            "</script>"),
        "countDown": join(
            "{{if x > 0}}",
              "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](--x)},",
              "{{tmpl #countDown}}",
            "{{/if}}"),
        "countDown__C8208": join(
            "{{if x > 0}}",
              "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_JS_VALUE + "](--x)},",
              "{{tmpl #countDown__C8208}}",
            "{{/if}}")
      },
      {
        "foo": join(
            "<script>",
              "x = [{{tmpl #countDown}}]",
            "</script>"),
        "countDown": "{{if x > 0}}${--x},{{tmpl #countDown}}{{/if}}"
      });
}

function testTemplateWithUnknownJsSlash() {
  assertContextualRewriting(
      {
        "foo": join(
            "<script>",
              "{{if declare}}var {{/if}}",
              "x = {{tmpl #bar__C8208}}\n",
              "y = 2",
            "</script>"),
        "bar": join(
            "42",
            "{{if declare}}",
              " , ",
            "{{/if}}"),
        "bar__C8208": join(
            "42",
            "{{if declare}}",
              " , ",
            "{{/if}}")
      },
      {
        "foo": join(
            "<script>",
              "{{if declare}}var {{/if}}",
              "x = {{tmpl #bar}}\n",
              // At this point we don't know whether or not a slash would start
              // a RegExp or not, but we don't see a slash so it doesn't matter.
              "y = 2",
            "</script>"),
        "bar": join(
            // A slash following 42 would be a division operator.
            "42",
            // But a slash following a comma would be a RegExp.
            "{{if declare}}",
              " , ",
            "{{/if}}")
      });
}

function testTemplateUnknownJsSlashMatters() {
  assertRewriteFails(
      {
        "foo": join(
            "<script>",
              "{{if declare}}var {{/if}}",
              "x = {{tmpl #bar}}\n",
              // At this point we don't know whether or not a slash would start
              // a RegExp or not, so this constitutes an error.
              "/ 2",
            "</script>\n"),
        "bar": join(
            // A slash following 42 would be a division operator.
            "42",
            // But a slash following a comma would be a RegExp.
            "{{if declare}} , {{/if}}")
      },
      "Ambiguous / could be a RegExp or division.  " +
      "Please add parentheses before `/`");
}

function testUrlContextJoining() {
  // This is fine.  The ambiguity about
  assertContextualRewritingNoop(
      {
        "foo": join(
            "<a href=\"",
              "{{if c}}",
                "/foo?bar=baz",
              "{{else}}",
                "/boo",
              "{{/if}}",
            "\">")
      });
  assertRewriteFails(
      {
        "foo": join(
            "<a href=\"",
              "{{if c}}",
                "/foo?bar=baz&boo=",
              "{{else}}",
                "/boo/",
              "{{/if}}",
              "${x}",
            "\">")
      },
      "foo:1:`${x}`: Cannot determine which part of the URL ${...} is in");
}

function testRecursiveTemplateGuessFails() {
  assertRewriteFails(
      {
        "foo": join(
            "<script>",
              "{{tmpl #quot}}",
            "</script>"),
        "quot": join(
            "\" {{if Math.random() < 0.5}}{{tmpl #quot}}{{/if}}")
      },
      "quot__C19:1:`{{if Math.random...{{/tmpl}}{{/if}}`:"
      + " Branch ends in irreconcilable contexts [Context JS_DQ_STRING]"
      + " and [Context JS DIV_OP]");
}

function testUris() {
  assertContextualRewriting(
      {
        "bar": join(
            // We use filterNormalizeUri at the beginning,
            "<a href='${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML_ATTRIBUTE
                + "](SAFEHTML_ESC[" + ESC_MODE_FILTER_NORMALIZE_URI
                + "](url))}'",
            " style='background:url(${SAFEHTML_ESC["
                + ESC_MODE_ESCAPE_HTML_ATTRIBUTE + "](SAFEHTML_ESC["
                + ESC_MODE_FILTER_NORMALIZE_URI + "](bgimage))})'>",
            "Hi</a>",
            "<a href='#${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML_ATTRIBUTE
                + "](anchor)}'",
            // escapeUri for substitutions into queries.
            " style='background:url(&apos;/pic?q=${SAFEHTML_ESC["
                + ESC_MODE_ESCAPE_URI + "](file)}&apos;)'>",
              "Hi",
            "</a>",
            "<style>",
              "body { background-image: url(\"${SAFEHTML_ESC["
                  + ESC_MODE_FILTER_NORMALIZE_URI + "](bg)}\"); }",
              // and normalizeUri without the filter in the path.
              "table { border-image: url(\"borders/${SAFEHTML_ESC["
                  + ESC_MODE_NORMALIZE_URI + "](brdr)}\"); }",
            "</style>")
      },
      {
        "bar": join(
            "<a href='${url}' style='background:url(${bgimage})'>Hi</a>",
            "<a href='#${anchor}'",
            " style='background:url(&apos;/pic?q=${file}&apos;)'>Hi</a>",
            "<style>",
              "body { background-image: url(\"${bg}\"); }",
              "table { border-image: url(\"borders/${brdr}\"); }",
            "</style>")
      });
}

function testAlreadyEscaped() {
  assertContextualRewritingNoop(
      {
        "foo": join(
            "<script>",
            "a = \"${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_URI + "](FOO)}\";",
            "</script>")
      });
}

function testExplicitNoescapeNoop() {
  assertContextualRewritingNoop(
      { "foo": "<script>a = \"${noAutoescape(FOO)}\";</script>" });
}

function testNoInterferenceWithNonContextualTemplates() {
  // If a broken template calls a contextual template, object.
  assertRewriteFails(
      {
        "foo": "Hello ${world}",
        "bar": join(
            "{{noAutoescape}}",
            "{{if $x}}\n",
              "<!--\n",
            "{{/if}}\n",
            // Cannot reconcile contexts HTML_COMMENT and HTML_PCDATA.
            "{{tmpl #foo}}")
      });

  // But if it doesn't, it's none of our business.
  assertContextualRewriting(
      {
        "foo": "Hello ${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](world)}",
        "bar": join(
            "{{if $x}}",
              "<!--",
            "{{/if}}")
          // No call to foo in this version.
      },
      {
        "foo": "Hello ${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](world)}",
        "bar": join(
            "{{noAutoescape}}",
            "{{if $x}}",
              "<!--",
            "{{/if}}")
          // No call to foo in this version.
      });
}

function testExternTemplates() {
  assertContextualRewriting(
      {
        "foo": join(
            "<script>",
              "var x = {{tmpl #bar}},",  // Undefined in this compilation unit.
              "y = ${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_JS_VALUE + "](y)};",
            "</script>")
      },
      {
        "foo": join(
            "<script>",
              "var x = {{tmpl #bar}},",  // Undefined in this compilation unit.
              "y = ${y};",
            "</script>")
      });
}

function testNonContextualCallers() {
  assertContextualRewriting(
      {
        "foo": "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](x)}",
        "bar": "<b>{{tmpl #foo}}</b> ${y}"
      },
      {
        "foo": "${x}",
        "bar": "{{noAutoescape}}<b>{{tmpl #foo}}</b> ${y}"
      });

  assertContextualRewriting(
      {
        "ns.foo": "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML + "](x)}",
        "ns.bar": "<b>{{tmpl #.foo}}</b> ${y}"
      },
      {
        "ns.foo": "${x}",
        "ns.bar": "{{noAutoescape}}<b>{{tmpl #.foo}}</b> ${y}"
      });
}

function testUnquotedAttributes() {
  assertContextualRewriting(
      {
        "foo": join(
            "<button onclick=alert(",
            "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE
                + "](SAFEHTML_ESC[" + ESC_MODE_ESCAPE_JS_VALUE + "](msg))})>",
            "Launch</button>")
      },
      {
        "foo": "<button onclick=alert(${msg})>Launch</button>"
      });
}

function testConditionalAttributes() {
  assertContextualRewriting(
      {
        "foo": "<div{{if className}} class=\"${SAFEHTML_ESC["
            + ESC_MODE_ESCAPE_HTML_ATTRIBUTE + "](className)}\"{{/if}}>"
      },
      {
        "foo": "<div{{if className}} class=\"${className}\"{{/if}}>"
      });
}

function testExtraSpacesInTag() {
  assertContextualRewriting(
      {
        "foo": "<div {{if $className}} class=\"${SAFEHTML_ESC["
            + ESC_MODE_ESCAPE_HTML_ATTRIBUTE + "](className)}\"{{/if}} id=x>"
      },
      {
        "foo": "<div {{if $className}} class=\"${className}\"{{/if}} id=x>"
      });
}

function testOptionalAttributes() {
  assertContextualRewriting(
      {
        "iconTemplate": join(
            "<img class=\"${SAFEHTML_ESC["
                + ESC_MODE_ESCAPE_HTML_ATTRIBUTE + "](iconClass)}\"",
            "{{if iconId}}",
              " id=\"${SAFEHTML_ESC["
                  + ESC_MODE_ESCAPE_HTML_ATTRIBUTE + "](iconId)}\"",
            "{{/if}}",
            " src=",
            "{{if iconPath}}",
              "\"${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML_ATTRIBUTE
                  + "](SAFEHTML_ESC[" + ESC_MODE_FILTER_NORMALIZE_URI
                  + "](iconPath))}\"",
            "{{else}}",
              "\"images/cleardot.gif\"",
            "{{/if}}",
            "{{if title}}",
              " title=\"${SAFEHTML_ESC["
                  + ESC_MODE_ESCAPE_HTML_ATTRIBUTE + "](title)}\"",
            "{{/if}}",
            " alt=\"",
              "{{if alt || alt == ''}}",
                "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML_ATTRIBUTE + "](alt)}",
              "{{else title}}",
                "${SAFEHTML_ESC[" + ESC_MODE_ESCAPE_HTML_ATTRIBUTE
                    + "](title)}",
              "{{/if}}\"",
            ">")
      },
      {
        "iconTemplate": join(
            "<img class=\"${iconClass}\"",
            "{{if iconId}}",
              " id=\"${iconId}\"",
            "{{/if}}",
            // Double quotes inside if/else.
            " src=",
            "{{if iconPath}}",
              "\"${iconPath}\"",
            "{{else}}",
              "\"images/cleardot.gif\"",
            "{{/if}}",
            "{{if title}}",
              " title=\"${title}\"",
            "{{/if}}",
            " alt=\"",
              "{{if alt || alt == ''}}",
                "${alt}",
              "{{else title}}",
                "${title}",
              "{{/if}}\"",
            ">")
      });
}

function testDynamicAttrName() {
  assertContextualRewriting(
      {
        "foo": "<img src=\"bar\" ${SAFEHTML_ESC["
            + ESC_MODE_FILTER_HTML_ATTRIBUTE + "](baz)}=\"boo\">"
      },
      {
        "foo": "<img src=\"bar\" ${baz}=\"boo\">"
      });
}

function testDynamicElementName() {
  assertContextualRewriting(
      {
        "foo": join(
            "<h${SAFEHTML_ESC[" + ESC_MODE_FILTER_HTML_ELEMENT_NAME
                + "](headerLevel)}>Header",
            "</h${SAFEHTML_ESC[" + ESC_MODE_FILTER_HTML_ELEMENT_NAME
                + "](headerLevel)}>")
      },
      {
        "foo": "<h${headerLevel}>Header</h${headerLevel}>"
      });
}

function testOptionalValuelessAttributes() {
  assertContextualRewritingNoop(
      {
        "foo": join(
            "<input {{if c}}checked{{/if}}>",
            "<input {{if c}}id=${noAutoescape(id)}{{/if}}>")
      });
}

// TODO: Tests for dynamic attributes: <a on${name}="...">,
// <div data-${name}=${value}>
