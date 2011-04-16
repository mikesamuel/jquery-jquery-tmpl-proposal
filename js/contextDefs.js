// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==


/**
 * @fileoverview
 * Defines a series of enums which allow us to represent a context in an HTML
 * document as a JavaScript number.
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */


/** @define{boolean} True if used in debugging mode. */
var DEBUG = true;

/** @define{boolean} True if the code has been compiled by closure compiler. */
var COMPILED = false;


/**
 * Outside an HTML tag, directive, or comment.  (Parsed character data).
 * @const
 */
var STATE_HTML_PCDATA = 0;

/**
 * Inside an element whose content is RCDATA where text and entities
 * can appear but where nested elements cannot.
 * The content of {@code <title>} and {@code <textarea>} fall into
 * this category since they cannot contain nested elements in HTML.
 * @const
 */
var STATE_HTML_RCDATA = 1;

/** Just before a tag name.  @const */
var STATE_HTML_BEFORE_TAG_NAME = 2;

/** Inside a tag name.  @const */
var STATE_HTML_TAG_NAME = 3;

/** Before an HTML attribute or the end of a tag.  @const */
var STATE_HTML_TAG = 4;

/** Inside an HTML attribute name.  @const */
var STATE_HTML_ATTRIBUTE_NAME = 5;

/**
 * Following an equals sign (<tt>=</tt>) after an attribute name in an HTML tag.
 * @const
 */
var STATE_HTML_BEFORE_ATTRIBUTE_VALUE = 6;

/** Inside an HTML comment.  @const */
var STATE_HTML_COMMENT = 7;

/** Inside a normal (non-CSS, JS, or URI) HTML attribute value.  @const */
var STATE_HTML_NORMAL_ATTR_VALUE = 8;

/** In CSS content outside a comment, string, or URI.  @const */
var STATE_CSS = 9;

/** In CSS inside a comment.  @const */
var STATE_CSS_COMMENT = 10;

/** In CSS inside a double quoted string.  @const */
var STATE_CSS_DQ_STRING = 11;

/** In CSS inside a single quoted string.  @const */
var STATE_CSS_SQ_STRING = 12;

/** In CSS in a URI terminated by the first close parenthesis.  @const */
var STATE_CSS_URI = 13;

/** In CSS in a URI terminated by the first double quote.  @const */
var STATE_CSS_DQ_URI = 14;

/** In CSS in a URI terminated by the first single quote.  @const */
var STATE_CSS_SQ_URI = 15;

/** In JavaScript, outside a comment, string, or Regexp literal.  @const */
var STATE_JS = 16;

/** In JavaScript inside a line comment.  @const */
var STATE_JS_LINE_COMMENT = 17;

/** In JavaScript inside a block comment.  @const */
var STATE_JS_BLOCK_COMMENT = 18;

/** In JavaScript inside a double quoted string.  @const */
var STATE_JS_DQ_STRING = 19;

/** In JavaScript inside a single quoted string.  @const */
var STATE_JS_SQ_STRING = 20;

/** In JavaScript inside a regular expression literal.  @const */
var STATE_JS_REGEX = 21;

/** In an HTML attribute whose content is a URI.  @const */
var STATE_URI = 22;

/** Not inside any valid HTML/CSS/JS construct.  @const */
var STATE_ERROR = 23;

/** All of the state bits set.  @const */
var STATE_ALL = 31;
function stateOf(context) { return context & STATE_ALL; }

function isErrorContext(context) {
  return stateOf(context) === STATE_ERROR;
}


/** A type of HTML element. */

/** No element.  @const */
var ELEMENT_TYPE_NONE = 0;

/** A script element whose content is raw JavaScript.  @const */
var ELEMENT_TYPE_SCRIPT = 1 << 5;

/** A style element whose content is raw CSS.  @const */
var ELEMENT_TYPE_STYLE = 2 << 5;

/**
 * A textarea element whose content is encoded HTML but which cannot contain
 * elements.
 * @const
 */
var ELEMENT_TYPE_TEXTAREA = 3 << 5;

/**
 * A title element whose content is encoded HTML but which cannot contain
 * elements.
 * @const
 */
var ELEMENT_TYPE_TITLE = 4 << 5;

/** A listing element whose content is raw CDATA.  @const */
var ELEMENT_TYPE_LISTING = 5 << 5;

/** An XMP element whose content is raw CDATA.  @const */
var ELEMENT_TYPE_XMP = 6 << 5;

/**
 * An element whose content is normal mixed PCDATA and child elements.
 * @const
 */
var ELEMENT_TYPE_NORMAL = 7 << 5;

/** All of the element bits set.  @const */
var ELEMENT_TYPE_ALL = 7 << 5;
function elementTypeOf(context) { return context & ELEMENT_TYPE_ALL; }


/** Describes the content of an HTML attribute. */

/** No attribute.  @const */
var ATTR_TYPE_NONE = 0;

/** Mime-type text/javascript.  @const */
var ATTR_TYPE_SCRIPT = 1 << 8;

/** Mime-type text/css.  @const */
var ATTR_TYPE_STYLE = 2 << 8;

/** A URI or URI reference.  @const */
var ATTR_TYPE_URI = 3 << 8;

/**
 * Other content.  Human readable or other non-structured plain text or keyword
 * values.
 * @const
 */
var ATTR_TYPE_PLAIN_TEXT = 4 << 8;

/** All of the attribute type bits set.  @const */
var ATTR_TYPE_ALL = 7 << 8;
function attrTypeOf(context) { return context & ATTR_TYPE_ALL; }


/**
 * Describes the content that will end the current HTML attribute.
 */

/** Not in an attribute.  @const */
var DELIM_TYPE_NONE = 0;

/** {@code "}  @const */
var DELIM_TYPE_DOUBLE_QUOTE = 1 << 11;

/** {@code '}  @const */
var DELIM_TYPE_SINGLE_QUOTE = 2 << 11;

/** A space or {@code >} symbol.  @const */
var DELIM_TYPE_SPACE_OR_TAG_END = 3 << 11;

/** All of the delimiter type bits set.  @const */
var DELIM_TYPE_ALL = 3 << 11;
function delimTypeOf(context) { return context & DELIM_TYPE_ALL; }


/**
 * Describes what a slash ({@code /}) means when parsing JavaScript
 * source code.  A slash that is not followed by another slash or an
 * asterisk (<tt>*</tt>) can either start a regular expression literal
 * or start a division operator.
 * This determination is made based on the full grammar, but Waldemar
 * defined a very close to accurate grammar for a JavaScript 1.9 draft
 * based purely on a regular lexical grammar which is what we use in
 * the autoescaper.
 *
 * @see #isRegexPreceder
 */

/** Not in JavaScript.  @const */
var JS_FOLLOWING_SLASH_NONE = 0;

/**
 * A slash as the next token would start a regular expression literal.
 * @const
 */
var JS_FOLLOWING_SLASH_REGEX = 1 << 13;

/** A slash as the next token would start a division operator.  @const */
var JS_FOLLOWING_SLASH_DIV_OP = 2 << 13;

/**
 * We do not know what a slash as the next token would start so it is
 * an error for the next token to be a slash.
 * @const
 */
var JS_FOLLOWING_SLASH_UNKNOWN = 3 << 13;

/** All of the JS following slash bits set.  @const */
var JS_FOLLOWING_SLASH_ALL = 3 << 13;
function jsFollowingSlashOf(context) {
  return context & JS_FOLLOWING_SLASH_ALL;
}


/**
 * Describes the part of a URI reference that the context point is in.
 *
 * <p>
 * We need to distinguish these so that we can<ul>
 *   <li>normalize well-formed URIs that appear before the query,</li>
 *   <li>encode raw values interpolated as query parameters or keys,</li>
 *   <li>filter out values that specify a scheme like {@code javascript:}.
 * </ul>
 */

/** Not in a URI.  @const */
var URI_PART_NONE = 0;

/**
 * Where a scheme might be seen.  At ^ in {@code ^http://host/path?k=v#frag}.
 * @const
 */
var URI_PART_START = 1 << 15;

/**
 * In the scheme, authority, or path.
 * Between ^s in {@code h^ttp://host/path^?k=v#frag}.
 * @const
 */
var URI_PART_PRE_QUERY = 2 << 15;

/**
 * In the query portion.  Between ^s in {@code http://host/path?^k=v^#frag}.
 * @const
 */
var URI_PART_QUERY = 3 << 15;

/** In the fragment.  After ^ in {@code http://host/path?k=v#^frag}.  @const */
var URI_PART_FRAGMENT = 4 << 15;

/**
 * Not {@link #NONE} or {@link #FRAGMENT}, but unknown.  Used to join different
 * contexts.
 * @const
 */
var URI_PART_UNKNOWN_PRE_FRAGMENT = 5 << 15;

/** Not {@link #NONE}, but unknown.  Used to join different contexts.  @const */
var URI_PART_UNKNOWN = 6 << 15;

/** All of the URI part bits set.  @const */
var URI_PART_ALL = 7 << 15;
function uriPartOf(context) { return context & URI_PART_ALL; }


var DELIM_TEXT = {};
DELIM_TEXT[DELIM_TYPE_DOUBLE_QUOTE] = '"';
DELIM_TEXT[DELIM_TYPE_SINGLE_QUOTE] = '\'';
DELIM_TEXT[DELIM_TYPE_SPACE_OR_TAG_END] = '';

/** Encodes HTML special characters.  @const */
var ESC_MODE_ESCAPE_HTML = 0;

/**
 * Like {@link #ESCAPE_HTML} but normalizes known safe HTML since RCDATA can't
 * contain tags.
 * @const
 */
var ESC_MODE_ESCAPE_HTML_RCDATA = 1;

/**
 * Encodes HTML special characters, including quotes, so that the
 * value can appear as part of a quoted attribute value.  This differs
 * from {@link #ESCAPE_HTML} in that it strips tags from known safe
 * HTML.
 * @const
 */
var ESC_MODE_ESCAPE_HTML_ATTRIBUTE = 2;

/**
 * Encodes HTML special characters and spaces so that the value can
 * appear as part of an unquoted attribute.
 * @const
 */
var ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE = 3;

/**
 * Only allow a valid identifier - letters, numbers, dashes, and underscores.
 * Throw a runtime exception otherwise.
 * @const
 */
var ESC_MODE_FILTER_HTML_ELEMENT_NAME = 4;

/**
 * Only allow a valid identifier - letters, numbers, dashes, and underscores.
 * Throw a runtime exception otherwise.
 * @const
 */
var ESC_MODE_FILTER_HTML_ATTRIBUTE = 5;

/**
 * Encode all HTML special characters and quotes, and JS newlines as
 * if to allow them to appear literally in a JS string.
 * @const
 */
var ESC_MODE_ESCAPE_JS_STRING = 6;

/**
 * If a number or boolean, output as a JS literal.  Otherwise surround
 * in quotes and escape.  Make sure all HTML and space characters are
 * quoted.
 * @const
 */
var ESC_MODE_ESCAPE_JS_VALUE = 7;

/**
 * Like {@link #ESCAPE_JS_STRING} but additionally escapes RegExp specials like
 * <code>.+*?$^[](){}</code>.
 * @const
 */
var ESC_MODE_ESCAPE_JS_REGEX = 8;

/**
 * Must escape all quotes, newlines, and the close parenthesis using
 * {@code \} followed by hex followed by a space.
 * @const
 */
var ESC_MODE_ESCAPE_CSS_STRING = 9;

/**
 * If the value is numeric, renders it as a numeric value so that
 * <code>{$n}px</code> works as expected, otherwise if it is a valid
 * CSS identifier, outputs it without escaping, otherwise surrounds in
 * quotes and escapes like {@link #ESCAPE_CSS_STRING}.
 * @const
 */
var ESC_MODE_FILTER_CSS_VALUE = 10;

/**
 * Percent encode all URI special characters and characters that
 * cannot appear unescaped in a URI such as spaces.  Make sure to
 * encode pluses and parentheses.
 * This corresponds to the JavaScript function {@code encodeURIComponent}.
 * @const
 */
var ESC_MODE_ESCAPE_URI = 11;

/**
 * Percent encode non-URI characters that cannot appear unescaped in a
 * URI such as spaces, and encode characters that are not special in
 * URIs that are special in languages that URIs are embedded in such
 * as parentheses and quotes.  This corresponds to the JavaScript
 * function {@code encodeURI} but additionally encodes quotes
 * parentheses, and percent signs that are not followed by two hex
 * digits.
 * @const
 */
var ESC_MODE_NORMALIZE_URI = 12;

/**
 * Like {@link #NORMALIZE_URI}, but filters out schemes like {@code javascript:}
 * that load code.
 * @const
 */
var ESC_MODE_FILTER_NORMALIZE_URI = 13;

/**
 * The explicit rejection of escaping.
 * @const
 */
var ESC_MODE_NO_AUTOESCAPE = 14;

/** Compresses better than false.  @const */
var FALSEY = 0;
/** Compresses better than true.  @const */
var TRUTHY = 1;

var IS_ESC_MODE_HTML_EMBEDDABLE = [];
IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_HTML] = TRUTHY;
IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_HTML_RCDATA] = TRUTHY;
IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_HTML_ATTRIBUTE] = TRUTHY;
IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE] = TRUTHY;
IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_FILTER_HTML_ELEMENT_NAME] = TRUTHY;
IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_FILTER_HTML_ATTRIBUTE] = TRUTHY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_JS_STRING] = FALSEY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_JS_VALUE] = FALSEY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_JS_REGEX] = FALSEY;
IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_CSS_STRING] = TRUTHY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_FILTER_CSS_VALUE] = FALSEY;
IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_ESCAPE_URI] = TRUTHY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_NORMALIZE_URI] = FALSEY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_FILTER_NORMALIZE_URI] = FALSEY;
//IS_ESC_MODE_HTML_EMBEDDABLE[ESC_MODE_NO_AUTOESCAPE] = FALSEY;

/**
 * A snippet of HTML that does not start or end inside a tag, comment, entity,
 * or DOCTYPE; and that does not contain any executable code
 * (JS, {@code <object>}s, etc.) from a different trust domain.
 * @const
 */
var CONTENT_KIND_HTML = 0;

/**
 * A sequence of code units that can appear between quotes (either kind) in a
 * JS program without causing a parse error, and without causing any side
 * effects.
 * <p>
 * The content should not contain unescaped quotes, newlines, or anything else
 * that would cause parsing to fail or to cause a JS parser to finish the
 * string its parsing inside the content.
 * <p>
 * The content must also not end inside an escape sequence ; no partial octal
 * escape sequences or odd number of '{@code \}'s at the end.
 * @const
 */
var CONTENT_KIND_JS_STR_CHARS = 1;

/** A properly encoded portion of a URI.  @const */
var CONTENT_KIND_URI = 2;


var CONTENT_KIND_FOR_ESC_MODE = [];
CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML] = CONTENT_KIND_HTML;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML_RCDATA] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML_ATTRIBUTE] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_FILTER_HTML_ELEMENT_NAME] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_FILTER_HTML_ATTRIBUTE_NAME] = null;
CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_JS_STRING]
    = CONTENT_KIND_JS_STR_CHARS;
CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_NORMALIZE_URI] = CONTENT_KIND_URI;
CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_URI] = CONTENT_KIND_URI;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_JS_VALUE] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_JS_REGEX] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_ESCAPE_CSS_STRING] = null;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_FILTER_CSS_VALUE] = null;
CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_FILTER_NORMALIZE_URI] = CONTENT_KIND_URI;
//CONTENT_KIND_FOR_ESC_MODE[ESC_MODE_NO_AUTOESCAPE] = null;

var ESC_MODE_FOR_STATE = [];
ESC_MODE_FOR_STATE[STATE_HTML_PCDATA] = ESC_MODE_ESCAPE_HTML;
ESC_MODE_FOR_STATE[STATE_HTML_RCDATA] = ESC_MODE_ESCAPE_HTML_RCDATA;
ESC_MODE_FOR_STATE[STATE_HTML_BEFORE_TAG_NAME]
    = ESC_MODE_FILTER_HTML_ELEMENT_NAME;
ESC_MODE_FOR_STATE[STATE_HTML_TAG_NAME] = ESC_MODE_FILTER_HTML_ELEMENT_NAME;
ESC_MODE_FOR_STATE[STATE_HTML_TAG] = ESC_MODE_FILTER_HTML_ATTRIBUTE;
ESC_MODE_FOR_STATE[STATE_HTML_ATTRIBUTE_NAME] = ESC_MODE_FILTER_HTML_ATTRIBUTE;
//ESC_MODE_FOR_STATE[STATE_HTML_BEFORE_ATTRIBUTE_VALUE] = void 0;
ESC_MODE_FOR_STATE[STATE_HTML_COMMENT] = ESC_MODE_ESCAPE_HTML_RCDATA;
ESC_MODE_FOR_STATE[STATE_HTML_NORMAL_ATTR_VALUE]
    = ESC_MODE_ESCAPE_HTML_ATTRIBUTE;
ESC_MODE_FOR_STATE[STATE_CSS] = ESC_MODE_FILTER_CSS_VALUE;
//ESC_MODE_FOR_STATE[STATE_CSS_COMMENT] = void 0;
ESC_MODE_FOR_STATE[STATE_CSS_DQ_STRING] = ESC_MODE_ESCAPE_CSS_STRING;
ESC_MODE_FOR_STATE[STATE_CSS_SQ_STRING] = ESC_MODE_ESCAPE_CSS_STRING;
ESC_MODE_FOR_STATE[STATE_CSS_URI] = ESC_MODE_NORMALIZE_URI;
ESC_MODE_FOR_STATE[STATE_CSS_DQ_URI] = ESC_MODE_NORMALIZE_URI;
ESC_MODE_FOR_STATE[STATE_CSS_SQ_URI] = ESC_MODE_NORMALIZE_URI;
ESC_MODE_FOR_STATE[STATE_JS] = ESC_MODE_ESCAPE_JS_VALUE;
//ESC_MODE_FOR_STATE[STATE_JS_LINE_COMMENT] = void 0;
//ESC_MODE_FOR_STATE[STATE_JS_BLOCK_COMMENT] = void 0;
ESC_MODE_FOR_STATE[STATE_JS_DQ_STRING] = ESC_MODE_ESCAPE_JS_STRING;
ESC_MODE_FOR_STATE[STATE_JS_SQ_STRING] = ESC_MODE_ESCAPE_JS_STRING;
ESC_MODE_FOR_STATE[STATE_JS_REGEX] = ESC_MODE_ESCAPE_JS_REGEX;
ESC_MODE_FOR_STATE[STATE_URI] = ESC_MODE_ESCAPE_HTML_ATTRIBUTE;
