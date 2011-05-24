// The production version squirrels escaping directives away in $.encode[...]
// instead of using easily debuggable names like escapeHtml.
// When the DEBUG variable is false we unpack them so that we can use a
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
 * Parses and rewrites the input templates.
 * @param input a mapping from template names to template source code.
 * @return a mapping of the same form as the input.
 */
function rewrittenSource(input) {
  var inputParseTrees = {};
  for (var k in input) {
    if (Object.hasOwnProperty.call(input, k)) {
      inputParseTrees[k] = parseTemplate(input[k], DEFAULT_BLOCK_DIRECTIVES);
    }
  }
  var templates = autoescape(inputParseTrees);
  var actual = {};
  for (var k in templates) {
    if (Object.hasOwnProperty.call(templates, k)) {
      actual[k] = normalize(
          renderParseTree(templates[k], DEFAULT_BLOCK_DIRECTIVES));
    }
  }
  function normalize(templateText) {
    // Convert the thunk syntax a=>foo to foo(a).
    templateText = templateText.replace(
	/\$\{([^}]*?)((?:=>[\w.$\[\]]+)+)\}/g, function (_, expr, operators) {
	  operators = operators.split("=>");
	  var suffix = new Array(operators.length).join(")");
	  var prefix = operators.reverse().join("(");
	  return "${" + prefix + expr + suffix + "}";
	});

    // Unpack DEBUG form escaping directives.  See above.
    if (!DEBUG) {
      templateText = templateText.replace(
          /([{(]\$\.encode)\[(\d+)\](?=\()/g,
          function (_, prefix, escMode) {
            if (escMode in UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE) {
              return prefix + "."
                  + UNCOMPILED_SANITIZER_NAMES_BY_ESC_MODE[escMode];
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

function testTrivialTemplate() {
  assertContextualRewritingNoop(
      {
        "foo": "Hello, World!"
      });
}

function testPrintInText() {
  assertContextualRewriting(
      {
        foo: "Hello, ${$.encode.escapeHtml(world)}!"
      },
      {
        foo: "Hello, ${world}!"
      });
}

function testPrintInTextAndLink() {
  assertContextualRewriting(
      {
        foo: "Hello, <a href=\"worlds?world=${$.encode.escapeUri(world)}\">"
            + "${$.encode.escapeHtml(world)}</a>!"
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
            "${$.encode.escapeHtml(y)}",
          "{{else x == 2}}",
            "<script>foo(${$.encode.escapeJsValue(z)})</script>",
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
              " href='${$.encode.escapeHtmlAttribute($.encode.filterNormalizeUri(url))}'>",
            "{{else $name}}",
              " name='${$.encode.escapeHtmlAttribute(name)}'>",
            "{{else}}",
              ">",
            "{{/if}}",
            // Not escapeJsValue because we are not inside a tag.
            " onclick='alert(${$.encode.escapeHtml(value)})'")
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
              "foo(${$.encode.escapeJsValue(a)});\n",
              "bar(\"${$.encode.escapeJsString(b)}\");\n",
              "baz(\'${$.encode.escapeJsString(c)}\');\n",
              "boo(/${$.encode.escapeJsRegex(d)}/.test(s) ? 1 / ${$.encode.escapeJsValue(e)}",
              " : /${$.encode.escapeJsRegex(f)}/);\n",
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
                ".foo${$.encode.filterCssValue(className)}:before {",
                  "content: '${$.encode.escapeCssString(i)}'",
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
                "<li>${$.encode.escapeHtml(value)}</li>",
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
        "foo": "{{tmpl \"bar\"}}",
        "bar": "Hello, ${$.encode.escapeHtml(world)}!"
      },
      {
        "foo": "{{tmpl \"bar\"}}",
        "bar": "Hello, ${world}!"
      });
}

function testCallWithParams() {
  assertContextualRewriting(
      {
        "foo": "{{tmpl ({ x: y }) \"bar\"}}",
        "bar": "Hello, ${$.encode.escapeHtml(world)}!"
      },
      {
        "foo": "{{tmpl ({ x: y }) \"bar\"}}",
        "bar": "Hello, ${world}!"
      });
}

function testSameTemplateCalledInDifferentContexts() {
  assertContextualRewriting(
      {
        "foo": join(
            "{{tmpl \"bar\"}}",
            "<script>",
            "alert('{{tmpl \"bar__C20\"}}');",
            "</script>"),
        "bar": "Hello, ${$.encode.escapeHtml(world)}!",
        "bar__C20": "Hello, ${$.encode.escapeJsString(world)}!"
      },
      {
        "foo": join(
            "{{tmpl \"bar\"}}",
            "<script>",
            "alert('{{tmpl \"bar\"}}');",
            "</script>"),
        "bar": "Hello, ${world}!"
      });
}

function testRecursiveTemplateGuessWorks() {
  assertContextualRewriting(
      {
        "foo": join(
            "<script>",
              "x = [{{tmpl \"countDown__C8208\"}}]",
            "</script>"),
        "countDown": join(
            "{{if x > 0}}",
              "${$.encode.escapeHtml(--x)},",
              "{{tmpl \"countDown\"}}",
            "{{/if}}"),
        "countDown__C8208": join(
            "{{if x > 0}}",
              "${$.encode.escapeJsValue(--x)},",
              "{{tmpl \"countDown__C8208\"}}",
            "{{/if}}")
      },
      {
        "foo": join(
            "<script>",
              "x = [{{tmpl \"countDown\"}}]",
            "</script>"),
        "countDown": "{{if x > 0}}${--x},{{tmpl \"countDown\"}}{{/if}}"
      });
}

function testTemplateWithUnknownJsSlash() {
  assertContextualRewriting(
      {
        "foo": join(
            "<script>",
              "{{if declare}}var {{/if}}",
              "x = {{tmpl \"bar__C8208\"}}\n",
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
              "x = {{tmpl \"bar\"}}\n",
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
              "x = {{tmpl \"bar\"}}\n",
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
              "{{tmpl \"quot\"}}",
            "</script>"),
        "quot": join(
            "\" {{if Math.random() < 0.5}}{{tmpl \"quot\"}}{{/if}}")
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
            "<a href='${$.encode.escapeHtmlAttribute($.encode.filterNormalizeUri(url))}'",
            " style='background:url(${$.encode.escapeHtmlAttribute($.encode.filterNormalizeUri("
                + "bgimage))})'>",
            "Hi</a>",
            "<a href='#${$.encode.escapeHtmlAttribute(anchor)}'",
            // escapeUri for substitutions into queries.
            " style='background:url(&apos;/pic?q=${$.encode.escapeUri(file)}&apos;)'>",
              "Hi",
            "</a>",
            "<style>",
              "body { background-image: url(\"${$.encode.filterNormalizeUri(bg)}\"); }",
              // and normalizeUri without the filter in the path.
              "table { border-image: url(\"borders/${$.encode.normalizeUri(brdr)}\"); }",
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
        "foo": "<script>a = \"${$.encode.escapeUri(FOO)}\";</script>"
      },
      {
        "foo": "<script>a = \"${$.encode" +
            (DEBUG ? ".escapeUri" : "[" + ESC_MODE_ESCAPE_URI + "]")
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
            "{{tmpl \"foo\"}}")
      });

  // But if it doesn't, it's none of our business.
  assertContextualRewriting(
      {
        "foo": "Hello ${$.encode.escapeHtml(world)}",
        "bar": join(
            "{{if x}}",
              "<!--",
            "{{/if}}")
          // No call to foo in this version.
      },
      {
        "foo": join(
            "Hello ${$.encode",
            (DEBUG ? ".escapeHtml" : "[" + ESC_MODE_ESCAPE_HTML + "]"),
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
              "var x = {{tmpl \"bar\"}},",
              "y = ${$.encode.escapeJsValue(y)};",
            "</script>")
      },
      {
        "foo": join(
            "<script>",
              // Undefined in this compilation unit.
              "var x = {{tmpl \"bar\"}},",
              "y = ${y};",
            "</script>")
      });
}

function testNonContextualCallers() {
  assertContextualRewriting(
      {
        "foo": "${$.encode.escapeHtml(x)}",
        "bar": "<b>{{tmpl \"foo\"}}</b> ${y}"
      },
      {
        "foo": "${x}",
        "bar": "{{noAutoescape}}<b>{{tmpl \"foo\"}}</b> ${y}"
      });

  assertContextualRewriting(
      {
        "ns.foo": "${$.encode.escapeHtml(x)}",
        "ns.bar": "<b>{{tmpl \"ns.foo\"}}</b> ${y}"
      },
      {
        "ns.foo": "${x}",
        "ns.bar": "{{noAutoescape}}<b>{{tmpl \"ns.foo\"}}</b> ${y}"
      });
}

function testUnquotedAttributes() {
  assertContextualRewriting(
      {
        "foo": join(
            "<button onclick=alert(",
            "${$.encode.escapeHtmlAttributeNospace($.encode.escapeJsValue(msg))})>",
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
            " class=\"${$.encode.escapeHtmlAttribute(className)}\"{{/if}}>")
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
            " class=\"${$.encode.escapeHtmlAttribute(className)}\"{{/if}} id=x>")
      },
      {
        "foo": "<div {{if $className}} class=\"${className}\"{{/if}} id=x>"
      });
}

function testOptionalAttributes() {
  assertContextualRewriting(
      {
        "iconTemplate": join(
            "<img class=\"${$.encode.escapeHtmlAttribute(iconClass)}\"",
            "{{if iconId}}",
              " id=\"${$.encode.escapeHtmlAttribute(iconId)}\"",
            "{{/if}}",
            " src=",
            "{{if iconPath}}",
              "\"${$.encode.escapeHtmlAttribute($.encode.filterNormalizeUri(iconPath))}\"",
            "{{else}}",
              "\"images/cleardot.gif\"",
            "{{/if}}",
            "{{if title}}",
              " title=\"${$.encode.escapeHtmlAttribute(title)}\"",
            "{{/if}}",
            " alt=\"",
              "{{if alt || alt == ''}}",
                "${$.encode.escapeHtmlAttribute(alt)}",
              "{{else title}}",
                "${$.encode.escapeHtmlAttribute(title)}",
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
        "foo": "<img src=\"bar\" ${$.encode.filterHtmlAttribute(baz)}=\"boo\">"
      },
      {
        "foo": "<img src=\"bar\" ${baz}=\"boo\">"
      });
}

function testDynamicElementName() {
  assertContextualRewriting(
      {
        "foo": join(
            "<h${$.encode.filterHtmlElementName(headerLevel)}>Header",
            "</h${$.encode.filterHtmlElementName(headerLevel)}>")
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
            "{{wrap \"tableWrapper\"}}",
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
                    "${$.encode.escapeHtml(new SanitizedHtml( $value))}",
                  "</td>",
                "{{/each}}",
              "</tr>",
            "</tbody></table>")
      },
      {
        "myTmpl": join(
            "The following wraps some HTML content:\n",
            "{{wrap \"tableWrapper\"}}",
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
            "{{wrap \"listWrapper__C8208\"}}",
              // The body is in an HTML context even if the {{wrap}} is not.
              "<li>${$.encode.escapeHtml(a)}</li>",
              "<li title=${$.encode.escapeHtmlAttributeNospace(t)}>${$.encode.escapeHtml(b)}</li>",
            "{{/wrap}}"),
        "listWrapper": join(
            "{{each $item.html(\"div\")}}",
              "listItems.push(${$.encode.escapeHtml(value)});",
            "{{/each}}",
            "</script>",
            "<ul>",
              "{{each $item.html(\"div\")}}",
                "${$.encode.escapeHtml(new SanitizedHtml( $value))}",
              "{{/each}}",
            "</ul>"),
        "listWrapper__C8208": join(
            "{{each $item.html(\"div\")}}",
              "listItems.push(${$.encode.escapeJsValue(value)});",
            "{{/each}}",
            "</script>",
            "<ul>",
              "{{each $item.html(\"div\")}}",
                "${$.encode.escapeHtml(new SanitizedHtml( $value))}",
              "{{/each}}",
            "</ul>")
      },
      {
        "myTmpl": join(
            "<script>",  // Start a script here
            "{{wrap \"listWrapper\"}}",  // Call {{wrap}} in a JS context.
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
