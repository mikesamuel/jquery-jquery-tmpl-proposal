/**
 * The frontend of the JQuery template compiler
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */


/**
 * @define {boolean}
 * True if malformed templates should result in informative error messages.
 * May be turned off in production to reduce minified size.
 * When false, most of the error reporting is turned off during parsing and
 * compilation, so the production bundle should be used with templates that
 * have already passed basic sanity checks.
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
var DEFAULT_EACH_KEY_VARIABLE_NAME = "$index";

/**
 * The default variable name used for the value when none is specified in an
 * <code>{{each}}</code> directive.
 */
var DEFAULT_EACH_VALUE_VARIABLE_NAME = "$value";


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
