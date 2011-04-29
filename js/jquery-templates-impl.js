/**
 * @define {boolean}
 * True if malformed templates should result in informative error messages.
 * May be turned off in production to reduce minified size.
 */
var DEBUG = true;

/** A boolean-esque value that minifies better than true. @const */
var TRUTHY = 1;

/** A boolean-esque value that minifies better than false. @const */
var FALSEY = 0;


// JQuery Lexical Grammar.

/** Regular expression text for a snippet of HTML text. @const */
var HTML_SNIPPET_RE = (
    "(?:"
    + "[^${]"	// A char that can't start a marker or a substitution,
    + "|\\{(?!\\{/?[a-z])"	// A curly bracket that doesn't start a marker.
    + "|\\$(?!\\{)"	// A dollar that does not start a marker.
    + ")+");

/** Regular expression text for a substitution.  ${...} or ${{...}}. @const */
var SUBSTITUTION_RE = (
    "\\$\\{"
    + "(?:"
    + "\\{[\\s\\S]+?\\}"	// ${{...}} can contain curlies.
    + "|[^{}][^}]*"	// ${...} cannot contain curlies.
    + ")\\}");

/** Regular expression text for a directive name. @const */
var NAME_RE = "[a-z][a-z0-9]*";

/** Regular expression text for a directive start|end marker. @const */
var MARKER_RE = (
    "\\{\\{"
    + "(?:"
    + NAME_RE + "[\\s\\S]*?"	// A start marker.
    + "|/" + NAME_RE	// An end marker.
    + ")"
    + "\\}\\}");

/** Global regular expression that matches a single template token. */
var TOKEN = new RegExp(
    HTML_SNIPPET_RE
    + "|" + SUBSTITUTION_RE
    + "|" + MARKER_RE,
    "gi");

/** Regular expression text for a variable name.  @const */
// We may need to exclude keywords if these names used outside a param decl.
var VAR_NAME_RE = "[a-z_$]\\w*";

/** Matches the content of an <code>{{each}}</code> directive. @const */
var EACH_DIRECTIVE_CONTENT = new RegExp(
    "^"	// Start at the beginning,
    + "\\s*"
    + "(?:"	// Optional parenthetical group with var names.
      + "\\(\\s*"
      + "(" + VAR_NAME_RE + ")"	// Key variable name in group 1.
      + "\\s*"
      + "(?:"
        + ",\\s*"
        + "(" + VAR_NAME_RE + ")"	// Value variable name in group 2.
        + "\\s*"
      + ")?"
      + "\\)\\s*"
    + ")?"
    + "("	// Container expression in group 3.
      + "\\S"  // A non-space character followed by any run of non-space chars.
      + "(?:[\\s\\S]*\\S)?"
    + ")"
    + "\\s*"
    + "$",	// Finish at the end.
    "i");

/** Matches the content of a <code>{{tmpl}}</code> directive. @const */
var TMPL_DIRECTIVE_CONTENT = new RegExp(
    "^"
    + "\\s*"
    + "(?:"	// Optional parenthetical group with data and option exprs.
      + "\\("
      + "([\\s\\S]*)"  // Data and option maps go in group 1.
      + "\\)"
      + "\\s*"
    + ")?"
    + "([^\\s()](?:[^()]*[^\\s()])?)"	// Template name/selector in group 2.
    + "\\s*"
    + "$"
    );
/**
 * The default variable name for the key used when none is specified in an
 * <code>{{each}}</code> directive.
 */
var DEFAULT_EACH_KEY_VARIABLE_NAME = "$$index";

/**
 * The default variable name used for the value when none is specified in an
 * <code>{{each}}</code> directive.
 */
var DEFAULT_EACH_VALUE_VARIABLE_NAME = "$$value";


// Parser pipeline phase.

/**
 * Guess, conservatively for well-formed templates, the set of
 * directives that require an end-marker.
 *
 * @param {string} templateText
 */
function guessBlockDirectives(templateText) {
  var blockDirectives = {};
  // For each token like {{/foo}} put "foo" into the block directives map.
  templateText.replace(
      TOKEN,
      function (tok) {
        var match = tok.match(/^\{\{\/([a-z][a-z0-9]*)[\s\S]*\}\}$/i);
        if (match) {
          blockDirectives[match[1]] = TRUTHY;
        }
      });
  return blockDirectives;
}

/**
 * Parse a template to a parse tree.
 * Parse trees come in two forms:
 * <ul>
 *   <li>{@code "string"} : a snippet of HTML text.</li>
 *   <li>{@code ["name", "content", ...]} where {@code "name"}
 *      is a directive name like {@code "if"} or the string {@code "$"} for
 *      substitutions.  The content is the string after the name in the open
 *      marker, so for <code>{{if foo==bar}}Yes{{/if}}</code>, the content is
 *      {@code " foo==bar"}.  The "..." above is filled with child parse trees
 *      of the form described here.</li>
 * </ul>
 * <p>
 * For example, the parse tree for
 * <pre>
 * &lt;b&gt;{{if sayHello}}Hello{{else}}Goodbye{{/if}}&lt;/b&gt;, ${world}!
 * </pre>
 * is
 * <pre>
 * [
 *  "",	// Name of root is blank.
 *  "", // Content of root is blank.
 *  "&lt;b&gt;",	// Zero-th child is a snippet of HTML.
 *  [	// An embedded directive is an array.
 *   "if",	// Name comes first
 *   " sayHello",	// Content of {{if}}
 *   "Hello",	// A snippet of HTML.
 *   ["else", ""],	// {{else}} is an inline directive inside {{if}}.
 *   "Goodbye"
 *  ],	// End of the {{if ...}}...{{/if}}.
 *  "&lt;/b&gt;, ",	// Another snippet of HTML.
 *  ["$", "world"],	// A substitution.
 *  "!"
 * ]
 * </pre>
 *
 * @param {string} templateText The text to parse.
 * @param {Object.<number>} blockDirectives Maps directive names such as
 *     {@code "if"} to {link #TRUTHY} if they require/allow an end marker.
 * @return {Array.<string|Array>|string} A parse tree node.
 */
function parseTemplate(templateText, blockDirectives) {
  // The root of the parse tree.
  var root = ["", ""],
      // A stack of nodes which have been entered but not yet exited.
      stack = [root],
      // The topmost element of the stack
      top = root;
  $.each(
      templateText.match(TOKEN) || [],
      function (_, token) {
        var m = token.match(/^\{\{(\/?)([a-z][a-z0-9]*)([\s\S]*)\}\}$/i);
        if (m) {	// A marker.
          // "/" in group 1 if a close.  Name in group 2.  Content in group 3.
          if (m[1]) {	// An end marker
            if (DEBUG && top[0] !== m[2]) {
              throw new Error("Misplaced " + token + " in " + templateText);
            }
            top = stack[--stack.length - 1];
          } else {	// A start marker.
            var node = [m[2], m[3]];
            top.push(node);
            if (blockDirectives[m[2]] === TRUTHY) {
              stack.push(top = node);
            }
          }
        } else if (token.substring(0, 2) === "${") {	// A substitution.
          var doubleBracketed = token.charAt(2) === "{";
          top.push(["$", token.substring(
              2 + doubleBracketed, token.length - 1 - doubleBracketed)]);
        } else {	// An HTML snippet.
          top.push(token);
        }
      });
  if (DEBUG && stack.length > 1) {
    throw new Error(
        "Unclosed block directives "
        + stack.slice(1).map(function (x) { return x[0]; }) + " in "
        + templateText);
  }
  return root;
}


// Utilities for parser plugins and backends.

/**
 * Walks a parse tree (pre-order) applying the given visitor to each node.
 *
 * @param {Array.<string|Array>|string} parseTree as produced by
 *     {@link #parseTemplate}.
 * @param {function (Array.<string|Array>|string, 
 *                   Array.<Array.<string|Array>>), number}
 *     visitor receives each parse tree node, the stack of its ancestors in
 *     the parse tree, and the index of the parse tree node in its parent or
 *     2 if there is no parent.
 */
function visitAll(parseTree, visitor) {
  // Stack of ancestor nodes so that a visitor may move a node within its
  // parent.
  var ancestorStack = [];
  return (
    function walk(parseTree, indexInParent) {
      visitor(parseTree, ancestorStack, indexInParent);
      if (typeof parseTree !== "string") {
        var n = parseTree.length;
        ancestorStack.push(parseTree);
        for (var i = 2; i < n; ++i) { walk(parseTree[i], i); }
        --ancestorStack.length;
      }
    })(parseTree, 2);
}


// Utilities for debugging parser plugins.

/**
 * Given a template parse tree, returns source text that would parse to that
 * parse tree.  This can be useful for debugging but not required.
 * 
 * @param {Array.<string|Array>|string} parseTree as produced by
 *     {@link #parseTemplate}.
 * @param {Object.<Number>} opt_blockDirectives.
 */
function renderParseTree(parseTree, opt_blockDirectives) {
  var buffer = [];
  (function render(parseTree) {
     if (typeof parseTree === "string") {
       buffer.push(parseTree);
     } else {
       var kind = parseTree[0], n = parseTree.length;
       if (kind === "$") {
         buffer.push("${{", parseTree[1], "}}");
       } else {
         buffer.push("{{", kind, parseTree[1], "}}");
         for (var i = 2; i < n; ++i) { render(parseTree[i]); }
         if (n !== 2 || !opt_blockDirectives
             || opt_blockDirectives[kind] !== TRUTHY) {
           buffer.push("{{/", kind, "}}");
         }
       }
     }
   })(parseTree);
  return buffer.join("");
}


function compileToFunction(parseTree) {
  var TEMP_NAME_PREFIX = "$$tmplVar";
  var javaScriptSource = [
      "var " + TEMP_NAME_PREFIX + "0,"
      // Make available on the stack, the enumerable properties of the data
      // object, and the enumerable properties of the options object.
      // Data properties should trump options.
      + "$$data=$.extend("
      // Where EcmaScript 5's Object.create is available, use that to prevent
      // Object.prototype properties from masking globals.
      + "Object.create?Object.create(null):{},"
      // We don't use parameter names to, again, avoid masking properties of
      // the global object.
      + "arguments[1]||{},"
      + "arguments[0]||{});with($$data){"
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
                  wrapperEnd = new Array(postDethunk.length).join(")");
                  wrapperStart = postDethunk.reverse().join("(");
                  return "";
                });
            if (DEBUG) {
              try {
                Function("return (" + content + ")");
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
    return Function(javaScriptSource.join(""));
  } catch (ex) {
    throw DEBUG ? new Error(javaScriptSource.join("")) : ex;
  }
}

/**
 * An array of plugin passed, functions that take a parse tree and return
 * a parse tree, to run beore compilation.
 */
$.templatePlugins = [
  // Naive auto-escape.
  function autoescape(parseTrees) {
    $.each(
        parseTrees,
        function autoescapeOne(k, parseTree) {
          if (typeof parseTree !== "string") {
            if (parseTree[0] === "$") {
              parseTree[1] += "=>escapeHtml";
            } else if (parseTree[0] === "html") {
              parseTree[0] = "$";
            } else {
              $.each(parseTree, autoescapeOne);
            }
          }
        });
    return parseTrees;
  }
];
