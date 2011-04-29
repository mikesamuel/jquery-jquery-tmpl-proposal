// The compiled version squirrels escaping directives away in $.encode[...]
// instead of using easily debuggable names like escapeHtml.
// When the COMPILED variable is true we unpack them so that we can use a
// single set of tests.
var UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE = [];
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[0]
    = "escapeHtml";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_ESCAPE_HTML_RCDATA]
    = "escapeHtmlRcdata";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_ESCAPE_HTML_ATTRIBUTE]
    = "escapeHtmlAttribute";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE]
    = "escapeHtmlAttributeNospace";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_FILTER_HTML_ELEMENT_NAME]
    = "filterHtmlElementName";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_FILTER_HTML_ATTRIBUTE]
    = "filterHtmlAttribute";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_ESCAPE_JS_STRING]
    = "escapeJsString";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_ESCAPE_JS_VALUE]
    = "escapeJsValue";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_ESCAPE_JS_REGEX]
    = "escapeJsRegex";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_ESCAPE_CSS_STRING]
    = "escapeCssString";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_FILTER_CSS_VALUE]
    = "filterCssValue";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_ESCAPE_URI]
    = "escapeUri";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_NORMALIZE_URI]
    = "normalizeUri";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_FILTER_NORMALIZE_URI]
    = "filterNormalizeUri";
UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[ESC_MODE_NO_AUTOESCAPE]
    = "noAutoescape";

function join(var_args) {
  return Array.prototype.slice.call(arguments, 0).join('');
}

/**
 * Requires that the given template text parses to the given tree.
 */
function assertParsedJqueryTemplate(goldenTree, jqueryTemplateText) {
  var parseTree = parseJqueryTemplate(jqueryTemplateText);
  assertEquals(jqueryTemplateText, JSON.stringify(goldenTree),
               JSON.stringify(parseTree));
  var rendered = renderJqueryTemplate(parseTree);
  assertEquals(
      'reparse: ' + jqueryTemplateText + ' -> ' + rendered,
      JSON.stringify(goldenTree),
      JSON.stringify(parseJqueryTemplate(rendered)));
}

/**
 * Parses and rewrites the input templates.
 * @param input a mapping from template names to template source code.
 * @return a mapping of the same form as the input.
 */
function rewrittenSource(input) {
  var templates = sanitizeTemplates(input);
  var actual = {};
  for (var k in templates) {
    if (Object.hasOwnProperty.call(templates, k)) {
      actual[k] = normalize(renderJqueryTemplate(templates[k]));
    }
  }
  function normalize(templateText) {
    templateText = templateText.replace(
        /(\{\{(else|tmpl)(?:\}?[^}])*\}\})\{\{\/\2\}\}/g, '$1');
    if (COMPILED) {  // Unpack COMPILED form escaping directives.  See above.
      templateText = templateText.replace(
          /\$\.encode\[(\d+)\](?=\()/g,
          function (_, escMode) {
            if (escMode in UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE) {
              return UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[escMode];
            }
            return _;
          });
    }
    return templateText;
  }
  return actual;
}

/**
 * Requires that the input mapping from template names to template sources
 * rewrites to the given expected output mapping.
 */
function assertContextualRewriting(expectedOutput, input) {
  var actualOutput = rewrittenSource(input);
  assertEquals(JSON.stringify(expectedOutput), JSON.stringify(actualOutput));
}

/**
 * Requires that the input mapping from template rewrites without changes.
 */
function assertContextualRewritingNoop(expectedOutput) {
  assertContextualRewriting(expectedOutput, expectedOutput);
}

/**
 * Requires that rewriting the given mapping from template names to template
 * sources fails.
 * @param opt_msg Message that should be reported to the template author.
 *     Null means don't care.
 */
function assertRewriteFails(input, opt_msg) {
  var output;
  try {
    output = rewrittenSource(input);
  } catch (ex) {
    // Disable error message checking when not in debug mode.
    if (DEBUG && opt_msg !== void 0
        && opt_msg !== (ex.description || ex.message)) {
      throw ex;
    }
    return;
  }
  fail("Expected failure but was " + JSON.stringify(output));
}

function testParseSimpleText() {
  assertParsedJqueryTemplate(['T', ''], '');
  assertParsedJqueryTemplate(['T', '', 'foo'], 'foo');
  assertParsedJqueryTemplate(['T', '', '<b>foo</b>'], '<b>foo</b>');
}

function testSubstitutions() {
  assertParsedJqueryTemplate(['T', '', ['$', 'foo']], '${foo}');
  assertParsedJqueryTemplate(['T', '', ['$', 'foo + 1']], '${foo + 1}');
  assertParsedJqueryTemplate(['T', '', 'foo', ['$', 'bar'], 'baz'],
                             'foo${bar}baz');
  // Unclosed ${...}
  assertParsedJqueryTemplate(['T', '', 'foo${bar'], 'foo${bar');
  assertParsedJqueryTemplate(['T', '', '(', ['$', 'x'], ', ', ['$', 'y'], ')'],
                             '(${x}, ${y})');
}

function testInlineDirectives() {
  assertParsedJqueryTemplate(
      ['T', '', 'Hello, ', ['panic', ''], ' World!'],
      'Hello, {{panic}} World!');
  assertParsedJqueryTemplate(
      ['T', '', 'Hello, ', ['panic', ' true'], ' World!'],
      'Hello, {{panic true}} World!');
}

function testIf() {
  assertParsedJqueryTemplate(
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
  assertParsedJqueryTemplate(
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
  assertParsedJqueryTemplate(
      ['T', '', 'foo'], 'foo{{/if}}');
}

function testPartialMarker() {
  assertParsedJqueryTemplate(
      ['T', '', '{{html xyz}'], '{{html xyz}');
}

function testJavaScriptCurlies() {
  assertParsedJqueryTemplate(
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
        foo: "Hello, ${escapeHtml(world)}!"
      },
      {
        foo: "Hello, ${world}!"
      });
}

function testPrintInTextAndLink() {
  assertContextualRewriting(
      {
        foo: "Hello, <a href=\"worlds?world=${escapeUri(world)}\">"
            + "${escapeHtml(world)}</a>!"
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
            "${escapeHtml(y)}",
          "{{else x == 2}}",
            "<script>foo(${escapeJsValue(z)})</script>",
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
              " href='${escapeHtmlAttribute(filterNormalizeUri(url))}'>",
            "{{else $name}}",
              " name='${escapeHtmlAttribute(name)}'>",
            "{{else}}",
              ">",
            "{{/if}}",
            // Not escapeJsValue because we are not inside a tag.
            " onclick='alert(${escapeHtml(value)})'")
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
              "foo(${escapeJsValue(a)});\n",
              "bar(\"${escapeJsString(b)}\");\n",
              "baz(\'${escapeJsString(c)}\');\n",
              "boo(/${escapeJsRegex(d)}/.test(s) ? 1 / ${escapeJsValue(e)}",
              " : /${escapeJsRegex(f)}/);\n",
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
                ".foo${filterCssValue(className)}:before {",
                  "content: '${escapeCssString(i)}'",
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
                "<li>${escapeHtml(value)}</li>",
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
        "foo": "{{tmpl \"#bar\"}}",
        "bar": "Hello, ${escapeHtml(world)}!"
      },
      {
        "foo": "{{tmpl \"#bar\"}}",
        "bar": "Hello, ${world}!"
      });
}

function testCallWithParams() {
  assertContextualRewriting(
      {
        "foo": "{{tmpl ({ x: y }) \"#bar\"}}",
        "bar": "Hello, ${escapeHtml(world)}!"
      },
      {
        "foo": "{{tmpl ({ x: y }) \"#bar\"}}",
        "bar": "Hello, ${world}!"
      });
}

function testSameTemplateCalledInDifferentContexts() {
  assertContextualRewriting(
      {
        "foo": join(
            "{{tmpl \"#bar\"}}",
            "<script>",
            "alert('{{tmpl \"#bar__C20\"}}');",
            "</script>"),
        "bar": "Hello, ${escapeHtml(world)}!",
        "bar__C20": "Hello, ${escapeJsString(world)}!"
      },
      {
        "foo": join(
            "{{tmpl \"#bar\"}}",
            "<script>",
            "alert('{{tmpl \"#bar\"}}');",
            "</script>"),
        "bar": "Hello, ${world}!"
      });
}

function testRecursiveTemplateGuessWorks() {
  assertContextualRewriting(
      {
        "foo": join(
            "<script>",
              "x = [{{tmpl \"#countDown__C8208\"}}]",
            "</script>"),
        "countDown": join(
            "{{if x > 0}}",
              "${escapeHtml(--x)},",
              "{{tmpl \"#countDown\"}}",
            "{{/if}}"),
        "countDown__C8208": join(
            "{{if x > 0}}",
              "${escapeJsValue(--x)},",
              "{{tmpl \"#countDown__C8208\"}}",
            "{{/if}}")
      },
      {
        "foo": join(
            "<script>",
              "x = [{{tmpl \"#countDown\"}}]",
            "</script>"),
        "countDown": "{{if x > 0}}${--x},{{tmpl \"#countDown\"}}{{/if}}"
      });
}

function testTemplateWithUnknownJsSlash() {
  assertContextualRewriting(
      {
        "foo": join(
            "<script>",
              "{{if declare}}var {{/if}}",
              "x = {{tmpl \"#bar__C8208\"}}\n",
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
              "x = {{tmpl \"#bar\"}}\n",
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
            "<script>\n",
              "{{if declare}}var {{/if}}\n",
              "x = {{tmpl \"#bar\"}}\n",
              // At this point we don't know whether or not a slash would start
              // a RegExp or not, so this constitutes an error.
              "/ 2\n",
            "</script>"),
        "bar": join(
            // A slash following 42 would be a division operator.
            "42",
            // But a slash following a comma would be a RegExp.
            "{{if declare}} , {{/if}}")
      },
      "foo:1:`<script> {{if de...}} / 2 </script>`:" +
      " Ambiguous / could be a RegExp or division.  " +
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
              "{{tmpl \"#quot\"}}",
            "</script>"),
        "quot": join(
            "\" {{if Math.random() < 0.5}}{{tmpl \"#quot\"}}{{/if}}")
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
            "<a href='${escapeHtmlAttribute(filterNormalizeUri(url))}'",
            " style='background:url(${escapeHtmlAttribute(filterNormalizeUri("
                + "bgimage))})'>",
            "Hi</a>",
            "<a href='#${escapeHtmlAttribute(anchor)}'",
            // escapeUri for substitutions into queries.
            " style='background:url(&apos;/pic?q=${escapeUri(file)}&apos;)'>",
              "Hi",
            "</a>",
            "<style>",
              "body { background-image: url(\"${filterNormalizeUri(bg)}\"); }",
              // and normalizeUri without the filter in the path.
              "table { border-image: url(\"borders/${normalizeUri(brdr)}\"); }",
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
  assertContextualRewriting(
      {
        "foo": "<script>a = \"${escapeUri(FOO)}\";</script>"
      },
      {
        "foo": "<script>a = \"${" +
            (COMPILED ? "$.encode[" + ESC_MODE_ESCAPE_URI + "]" : "escapeUri")
            + "(FOO)}\";</script>"
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
            "{{if x}}\n",
              "<!--\n",
            "{{/if}}\n",
            // Cannot reconcile contexts HTML_COMMENT and HTML_PCDATA.
            "{{tmpl \"#foo\"}}")
      });

  // But if it doesn't, it's none of our business.
  assertContextualRewriting(
      {
        "foo": "Hello ${escapeHtml(world)}",
        "bar": join(
            "{{if x}}",
              "<!--",
            "{{/if}}")
          // No call to foo in this version.
      },
      {
        "foo": join(
            "Hello ${",
            (COMPILED
             ? "$.encode[" + ESC_MODE_ESCAPE_HTML + "]" : "escapeHtml"),
            "(world)}"),
        "bar": join(
            "{{noAutoescape}}",
            "{{if x}}",
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
              "var x = {{tmpl \"#bar\"}},",
              "y = ${escapeJsValue(y)};",
            "</script>")
      },
      {
        "foo": join(
            "<script>",
              // Undefined in this compilation unit.
              "var x = {{tmpl \"#bar\"}},",
              "y = ${y};",
            "</script>")
      });
}

function testNonContextualCallers() {
  assertContextualRewriting(
      {
        "foo": "${escapeHtml(x)}",
        "bar": "<b>{{tmpl \"#foo\"}}</b> ${y}"
      },
      {
        "foo": "${x}",
        "bar": "{{noAutoescape}}<b>{{tmpl \"#foo\"}}</b> ${y}"
      });

  assertContextualRewriting(
      {
        "ns.foo": "${escapeHtml(x)}",
        "ns.bar": "<b>{{tmpl \"#ns.foo\"}}</b> ${y}"
      },
      {
        "ns.foo": "${x}",
        "ns.bar": "{{noAutoescape}}<b>{{tmpl \"#ns.foo\"}}</b> ${y}"
      });
}

function testUnquotedAttributes() {
  assertContextualRewriting(
      {
        "foo": join(
            "<button onclick=alert(",
            "${escapeHtmlAttributeNospace(escapeJsValue(msg))})>",
            "Launch</button>")
      },
      {
        "foo": "<button onclick=alert(${msg})>Launch</button>"
      });
}

function testConditionalAttributes() {
  assertContextualRewriting(
      {
        "foo": join(
            "<div{{if className}}",
            " class=\"${escapeHtmlAttribute(className)}\"{{/if}}>")
      },
      {
        "foo": "<div{{if className}} class=\"${className}\"{{/if}}>"
      });
}

function testExtraSpacesInTag() {
  assertContextualRewriting(
      {
        "foo": join(
            "<div {{if $className}}",
            " class=\"${escapeHtmlAttribute(className)}\"{{/if}} id=x>")
      },
      {
        "foo": "<div {{if $className}} class=\"${className}\"{{/if}} id=x>"
      });
}

function testOptionalAttributes() {
  assertContextualRewriting(
      {
        "iconTemplate": join(
            "<img class=\"${escapeHtmlAttribute(iconClass)}\"",
            "{{if iconId}}",
              " id=\"${escapeHtmlAttribute(iconId)}\"",
            "{{/if}}",
            " src=",
            "{{if iconPath}}",
              "\"${escapeHtmlAttribute(filterNormalizeUri(iconPath))}\"",
            "{{else}}",
              "\"images/cleardot.gif\"",
            "{{/if}}",
            "{{if title}}",
              " title=\"${escapeHtmlAttribute(title)}\"",
            "{{/if}}",
            " alt=\"",
              "{{if alt || alt == ''}}",
                "${escapeHtmlAttribute(alt)}",
              "{{else title}}",
                "${escapeHtmlAttribute(title)}",
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
        "foo": "<img src=\"bar\" ${filterHtmlAttribute(baz)}=\"boo\">"
      },
      {
        "foo": "<img src=\"bar\" ${baz}=\"boo\">"
      });
}

function testDynamicElementName() {
  assertContextualRewriting(
      {
        "foo": join(
            "<h${filterHtmlElementName(headerLevel)}>Header",
            "</h${filterHtmlElementName(headerLevel)}>")
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

function testWrapAndHtml() {
  assertContextualRewriting(
      {
        "myTmpl": join(
            "The following wraps some HTML content:\n",
            "{{wrap \"#tableWrapper\"}}",
              "<div>",
                "First <b>content</b>",
              "</div>",
              "<div>",
                "And <em>more</em> <b>content</b>...",
              "</div>",
            "{{/wrap}}"),
        "tableWrapper": join(
            "<table><tbody>",
              "<tr>",
                "{{each $item.html(\"div\")}}",
                  "<td>",
                    "${escapeHtml(new SanitizedHtml( $value))}",
                  "</td>",
                "{{/each}}",
              "</tr>",
            "</tbody></table>")
      },
      {
        "myTmpl": join(
            "The following wraps some HTML content:\n",
            "{{wrap \"#tableWrapper\"}}",
              "<div>",
                "First <b>content</b>",
              "</div>",
              "<div>",
                "And <em>more</em> <b>content</b>...",
              "</div>",
            "{{/wrap}}"),
        "tableWrapper": join(
            "<table><tbody>",
              "<tr>",
                "{{each $item.html(\"div\")}}",
                  "<td>",
                    "{{html $value}}",
                  "</td>",
                "{{/each}}",
              "</tr>",
            "</tbody></table>")
      });
}

function testWrapOutsidePcdata() {
  assertContextualRewriting(
      {
        "myTmpl": join(
            "<script>",
            "{{wrap \"#listWrapper__C8208\"}}",
              // The body is in an HTML context even if the {{wrap}} is not.
              "<li>${escapeHtml(a)}</li>",
              "<li title=${escapeHtmlAttributeNospace(t)}>${escapeHtml(b)}</li>",
            "{{/wrap}}"),
        "listWrapper": join(
            "{{each $item.html(\"div\")}}",
              "listItems.push(${escapeHtml(value)});",
            "{{/each}}",
            "</script>",
            "<ul>",
              "{{each $item.html(\"div\")}}",
                "${escapeHtml(new SanitizedHtml( $value))}",
              "{{/each}}",
            "</ul>"),
        "listWrapper__C8208": join(
            "{{each $item.html(\"div\")}}",
              "listItems.push(${escapeJsValue(value)});",
            "{{/each}}",
            "</script>",
            "<ul>",
              "{{each $item.html(\"div\")}}",
                "${escapeHtml(new SanitizedHtml( $value))}",
              "{{/each}}",
            "</ul>")
      },
      {
        "myTmpl": join(
            "<script>",  // Start a script here
            "{{wrap \"#listWrapper\"}}",  // Call {{wrap}} in a JS context.
              "<li>${a}</li>",
              "<li title=${t}>${b}</li>",
            "{{/wrap}}"),
        "listWrapper": join(
            "{{each $item.html(\"div\")}}",
              "listItems.push(${value});",
            "{{/each}}",
            "</script>",  // Close the <script> inside the wrapper.
            "<ul>",
              "{{each $item.html(\"div\")}}",
                "{{html $value}}",
              "{{/each}}",
            "</ul>")
      });
}

function testPartialWrapFails() {
  assertRewriteFails(
      {  // Wrap body ends inside a tag context.
        "foo": "foo {{wrap}}<a href=\"${url}\"{{/wrap}} bar"
      });
}

// TODO: Tests for dynamic attributes: <a on${name}="...">,
// <div data-${name}=${value}>
