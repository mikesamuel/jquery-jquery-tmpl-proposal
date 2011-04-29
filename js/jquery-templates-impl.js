/**
 * An efficient backend for the JQuery template compiler
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

function compileToFunction(parseTree) {
  var TEMP_NAME_PREFIX = "$$tmplVar";
  var javaScriptSource = [
      "var " + TEMP_NAME_PREFIX + "0;"
      // Make available on the stack, the enumerable properties of the data
      // object, and the enumerable properties of the options object.
      // Data properties should trump options.
      + "$data=$.extend("
      // Where EcmaScript 5's Object.create is available, use that to prevent
      // Object.prototype properties from masking globals.
      + "Object.create?Object.create(null):{},"
      // We don't use parameter names to, again, avoid masking properties of
      // the global object.
      + "$data||{});"
      // Make the options object available
      + "$item=$item||{};"
      + "with($data){"
      // The below compiles the parse tree to an expression that returns a
      // string.
      + "return("];
  var hasValue;
  var nestLevel = 0;
  $.each(
      parseTree.slice(2),
      function walk(_, parseTree) {
        // If there was a value before this one, append them.
        if (hasValue) { javaScriptSource.push("+"); }
        if (typeof parseTree === "string") {	// HTML snippet
          // 'foo' -> "\'foo\'"
          javaScriptSource.push(escapeJsValue(parseTree));
        } else {
          var kind = parseTree[0], content = parseTree[1],
              len = parseTree.length;
          var tmpName = TEMP_NAME_PREFIX + nestLevel;
          if (kind === "$") {	// ${...} substitution.
            // Make sure that + is string-wise.
            // Specifically, ${1}${2} should not compile to (1 + 2).
            if (!hasValue) { javaScriptSource.push("''+"); }
            // ${x} -> (tmp0 = (x), 'function' !== typeof tmp0 ? tmp0 : tmp0())
            // The above is often the same as
            // ${x} -> (x)
            // but the real story is more complicated since we have to
            // de-thunkify the expression; if it is a function, we need to
            // call it.
            // By using the temporary value, we are guaranteed to only
            // evaluate the expression once.  This avoids problems with
            // expressions like (arr[i++]) which might return a function
            // the first time but not the second.
            var wrapperStart = "", wrapperEnd = "";
            content = content.replace(
                /(=>\w+)+$/, function (postDethunk) {
                  postDethunk = postDethunk.split("=>");
                  wrapperEnd = Array(postDethunk.length).join(")");
                  wrapperStart = postDethunk.reverse().join("(");
                  return "";
                });
            if (DEBUG) {
              try {
                // For some reason, on Safari,
                //     Function("(i + (j)")
                // fails with a SyntaxError as expected, but
                //     Function("return (i + (j)")
                // does not.
                // Filed as https://bugs.webkit.org/show_bug.cgi?id=59795
                Function("(" + content + ")");
              } catch (e) {
                throw new Error("Invalid template substitution: " + content);
              }
            }
            // To make it easy for passes to rewrite expressions without
            // preventing thunking we convert syntax like
            // "x=>a=>b" into "a(b(x))"
            javaScriptSource.push(
                "(", tmpName, "=(", content, "),",
                wrapperStart,
                "'function'!==typeof ",
                tmpName, "?", tmpName, ":", tmpName, ".call(null,arguments))",
                wrapperEnd);
          } else if (kind === "if") {	// {{if condition}}...{{/if}}
            // {{if a}}b{{else}}c{{/if}} -> (a ? "b" : "c")
            hasValue = TRUTHY;
            for (var pos = 2, elseIndex; 1; pos = elseIndex + 1) {
              elseIndex = len;
              for (var i = pos; i < elseIndex; ++i) {
                if (parseTree[i][0] === "else") { elseIndex = i; }
              }
              var cond = pos < len
                  ? (pos === 2 ? parseTree : parseTree[pos - 1])[1] : "";
              var continues = /\S/.test(cond);
              if (DEBUG && !continues) {
                if (pos == 2) {
                  throw new Error(
                      "{{if}} missing condition:"
                      + renderParseTree(parseTree, {}));
                } else if (elseIndex !== len) {
                  throw new Error(
                      "{{else}} without condition must be last:"
                      + renderParseTree(parseTree, {}));
                }
              }
              // The below handles several cases (assuming we wouldn't have
              // thrown an exception above if DEBUG were true):
              //   pos === 2 && continues  ; {{if cond}}
              //      => ((cond)?(<code-up-to-else-or-end>)
              //   pos > 2 && continues    ; {{else cond}}
              //      => ):((cond)?(<code-up-to-else-or-end)
              //   pos > 2 && !continues   ; {{else}} implicit or othersise
              //      => ):((<code-up-to-else-or-end)
              javaScriptSource.push(
                  hasValue ? "" : "''",
                  pos === 2 ? "((" : "):(",
                  cond, continues ? ")?(" : "");
              hasValue = FALSEY;
              $.each(parseTree.slice(pos, elseIndex), walk);
              if (!continues) { break; }
            }
            javaScriptSource.push(hasValue ? "))" : "''))");
          } else if (kind === "each") {	// {{each (key, value) obj}}...{{/each}}
            // {{each (k, v) ["one", "two"]}}<li value=${k + 1}>${v}{{/each}}
            // -> (tmp0 = [],
            //     $.each(["one", "two"],
            //     function (k, v) {
            //       tmp0.push("<li value=" + (k + 1) + ">" + v + "</li>");
            //     }),
            //     tmp0.join(""))
            // The first part of the comma operator creates a buffer.
            // Then $.each is called to properly iterate over the container.
            // Each iteration puts a string onto the array.
            // Then after iteration is complete, the last element of the comma
            // operator joins the array.  That joined array is the result of the
            // compiled each operator.
            var match = content.match(EACH_DIRECTIVE_CONTENT);
            if (DEBUG && !match) {
              throw new Error('Malformed {{each}} content: ' + content);
            }
            var keyVar = match[1] || DEFAULT_EACH_KEY_VARIABLE_NAME,
                valueVar = match[2] || DEFAULT_EACH_VALUE_VARIABLE_NAME;
            var containerExpr = match[3];
            ++nestLevel;
            javaScriptSource.push(
                "(", tmpName, "=[],$.each((", containerExpr,
                "),function(", keyVar, ",", valueVar, "){var ",
                TEMP_NAME_PREFIX, nestLevel, ";", tmpName, ".push(");
            hasValue = FALSEY;
            $.each(parseTree.slice(2), walk);
            if (!hasValue) { javaScriptSource.push("''"); }
            javaScriptSource.push(")}),", tmpName, ".join(''))");
            --nestLevel;
          } else if (kind === "tmpl") {
            // {{tmpl name}}
            //    -> $.template("name").tmpl(arguments[0], arguments[1])
            // {{tmpl #id}}
            //    -> $.template($("#id")).tmpl(arguments[0], arguments[1])
            // {{tmpl({x: y}) foo}}
            //    -> $.template("foo").tmpl({ x: y }, arguments[1])
            // {{tmpl({x: y}, { z: w }) foo}}
            //    -> $.template("foo").tmpl({ x: y }, { z: w })
            // The above is correct in spirit if not literally.  See below.

            var match = content.match(TMPL_DIRECTIVE_CONTENT);
            if (DEBUG && !match) {
              throw new Error('Malformed {{tmpl}} content: ' + content);
            }
            // The data and options come separated by a comma.
            // Parsing JavaScript expressions to figure out where a comma
            // separates two things is hard, so we use a trick.
            // We create an array that we can index into.  The comma that
            // separates the data from the options then simply becomes a
            // comma in an array constructor.
            var dataAndOptions = match[1];
            javaScriptSource.push(
                "(", tmpName, "=",
                dataAndOptions
                // The below uses arguments[0], the data passed to the compiled
                // function if dataAndOptions is ", { a: b }".
                // It also uses arguments[1], the options passed to the compiled
                // function if dataAndOptions has no options: "{ a; b }".
                // Note also that dataAndOptions is evaluated before any
                // template selector is resolved as expected from the ordering
                // of those in the content.
                ? "$.extend([],arguments,[" + dataAndOptions + "])"
                // If the content specifies neither data nor options, use the
                // arguments without the overhead of a call to $.extend.
                : "arguments",
                ",$.template(",
                /\W/.test(match[2])	// Fetch when the content is a selector.
                ? "$(" : "(",
                escapeJsValue(match[2]),
                ")).tmpl(", tmpName, "[0],", tmpName, "[1]))");

          // {html} and {wrap} are handled by translation to ${...} and ${tmpl}
          // respectively.
          } else {
            if (DEBUG) {
              throw new Error(
                  "I do not know how to compile " + renderParseTree(parseTree));
            }
          }
        }
        hasValue = TRUTHY;
      });
  if (!hasValue) { javaScriptSource.push("''"); }
  javaScriptSource.push(")}");
  try {
    return Function("$data", "$item", javaScriptSource.join(""));
  } catch (ex) {
    throw DEBUG ? new Error(javaScriptSource.join("")) : ex;
  }
}
