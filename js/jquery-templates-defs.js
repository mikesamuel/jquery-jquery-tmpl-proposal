/*jslint evil: true, unparam: true, maxerr: 50, indent: 4 */

/**
 * Common definitions for jQuery templates and plugin passes
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
    + "|\\{(?!\\{/?[=a-z])"	// A curly bracket that doesn't start a marker.
    + "|\\$(?!\\{)"	// A dollar that does not start a marker.
    + ")+");

/** Regular expression text for a substitution.  ${...}. @const */
var SUBSTITUTION_RE = (
    "\\$\\{"
    + "[^}]*"	// ${...} cannot contain curlies.  Use {{=...}} for that.
    + "\\}");

/** Regular expression text for a directive name. @const */
var NAME_RE = "(?:=|[a-z][a-z0-9]*)";

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


// API name constants
// These constants help us write code that is JSLint friendly, and compresses
// well with closure compiler.
/**
 * Extern property name for the member of $ that contains plugins to run.
 * @const
 */
var TEMPLATE_PLUGINS_PROP_NAME = "templatePlugins";

/** Name of the map from template names to compiled/parsed template.  @const */
var TEMPLATES_PROP_NAME = "templates";

/** Name of the extern method used to define/lookup templates.  @const */
var TEMPLATE_METHOD_NAME = "template";

/** Method of a template object that renders the template.  @const */
var TMPL_METHOD_NAME = "tmpl";

/** The default set of block directives. @const */
var DEFAULT_BLOCK_DIRECTIVES = { "if": TRUTHY, "wrap": TRUTHY };
