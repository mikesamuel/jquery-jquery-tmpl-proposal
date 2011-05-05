// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// ==/ClosureCompiler==


/**
 * @fileoverview
 * Definitions of sanitization functions and sanitized content wrappers.
 * See http://js-quasis-libraries-and-repl.googlecode.com/svn/trunk/safetemplate.html#sanitization_functions
 * for definitions of sanitization functions and sanitized content wrappers.
 */


/**
 * The name of the property that contains sanitized content in a sanitized
 * content wrapper.
 * This is a string stored in a constant so that it can be used in JSON
 * revivers.
 * @const
 */
var CONTENT_PROPNAME = 'content';

/**
 * The name of the property that contains a CONTENT_KIND_* enum value.
 * This is a string stored in a constant so that it can be used in JSON
 * revivers.
 * @const
 */
var CONTENT_KIND_PROPNAME = 'contentKind';

/**
 * A string-like object that carries a content-type.
 * @constructor
 * @private
 */
function SanitizedContent() {}

/**
 * @return {string}
 * @override
 */
SanitizedContent.prototype.toString = function() {
  return this[CONTENT_PROPNAME];
};

/**
 * @param {number!} contentKind
 */
function defineSanitizedContentSubclass(contentKind) {
  /** @param {string!} content */
  function SanitizedContentCtor(content) {
    this[CONTENT_PROPNAME] = content;
  }

  /** @type {SanitizedContent} */
  var proto = (SanitizedContentCtor.prototype = new SanitizedContent());
  proto.constructor = SanitizedContentCtor;

  /** @override */
  proto[CONTENT_KIND_PROPNAME] = CONTENT_KIND_HTML;

  return SanitizedContentCtor;
}


/**
 * Content of type {@link CONTENT_KIND_HTML}.
 * @constructor
 * @extends SanitizedContent
 * @param {string!} content A string of HTML that can safely be embedded in
 *     a PCDATA context in your app.  If you would be surprised to find that an
 *     HTML sanitizer produced {@code s} (e.g. it runs code or fetches bad URLs)
 *     and you wouldn't write a template that produces {@code s} on security or
 *     privacy grounds, then don't pass {@code s} here.
 */
var SanitizedHtml = defineSanitizedContentSubclass(CONTENT_KIND_HTML);


/**
 * Content of type {@link CONTENT_KIND_JS_STR_CHARS}.
 * @constructor
 * @extends SanitizedContent
 * @param {string!} content A string of JS that when evaled, produces a
 *     value that does not depend on any sensitive data and has no side effects
 *     <b>OR</b> a string of JS that does not reference any variables or have
 *     any side effects not known statically to the app authors.
 */
var SanitizedJsStrChars
    = defineSanitizedContentSubclass(CONTENT_KIND_JS_STR_CHARS);


/**
 * Content of type {@link CONTENT_KIND_URI}.
 * @constructor
 * @extends SanitizedContent
 * @param {string!} content A chunk of URI that the caller knows is safe to
 *     emit in a template.
 */
var SanitizedUri = defineSanitizedContentSubclass(CONTENT_KIND_URI);


// exports
window['SanitizedHtml'] = SanitizedHtml;
window['SanitizedJsStrChars'] = SanitizedJsStrChars;
window['SanitizedUri'] = SanitizedUri;


/**
 * Escapes HTML special characters in a string.  Escapes double quote '"' in
 * addition to '&', '<', and '>' so that a string can be included in an HTML
 * tag attribute value within double quotes.
 * Will emit known safe HTML as-is.
 *
 * @param {*} value The string-like value to be escaped.  May not be a string,
 *     but the value will be coerced to a string.
 * @return {string|SanitizedHtml} An escaped version of value.
 */
function escapeHtml(value) {
  if (value && value[CONTENT_KIND_PROPNAME] === CONTENT_KIND_HTML) {
    return /** @type {SanitizedHtml} */ (value);
  } else if (value instanceof Array) {
    return value.map(escapeHtml).join('');
  } else if (value === void 0) {
    return "";
  } else {
    return escapeHtmlHelper(value);
  }
}


/**
 * Escapes HTML special characters in a string so that it can be embedded in
 * RCDATA.
 * <p>
 * Escapes HTML special characters so that the value will not prematurely end
 * the body of a tag like {@code <textarea>} or {@code <title>}.  RCDATA tags
 * cannot contain other HTML entities, so it is not strictly necessary to escape
 * HTML special characters except when part of that text looks like an HTML
 * entity or like a close tag : {@code </textarea>}.
 * <p>
 * Will normalize known safe HTML to make sure that sanitized HTML (which could
 * contain an innocuous {@code </textarea>} don't prematurely end an RCDATA
 * element.
 *
 * @param {*} value The string-like value to be escaped.  May not be a string,
 *     but the value will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeHtmlRcdata(value) {
  if (value && value[CONTENT_KIND_PROPNAME] === CONTENT_KIND_HTML) {
    return normalizeHtmlHelper(value[CONTENT_PROPNAME]);
  }
  return escapeHtmlHelper(value);
}


/**
 * Removes HTML tags from a string of known safe HTML so it can be used as an
 * attribute value.
 *
 * @param {*} value The HTML to be escaped.  May not be a string, but the
 *     value will be coerced to a string.
 * @return {string} A representation of value without tags, HTML comments, or
 *     other content.
 */
function stripHtmlTags(value) {
  return String(value).replace(HTML_TAG_REGEX_, '');
}


/**
 * Escapes HTML special characters in an HTML attribute value.
 *
 * @param {*} value The HTML to be escaped.  May not be a string, but the
 *     value will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeHtmlAttribute(value) {
  if (value && value[CONTENT_KIND_PROPNAME] === CONTENT_KIND_HTML) {
    return normalizeHtmlHelper(stripHtmlTags(value[CONTENT_PROPNAME]));
  }
  return escapeHtmlHelper(value);
}


/**
 * Escapes HTML special characters in a string including space and other
 * characters that can end an unquoted HTML attribute value.
 *
 * @param {*} value The HTML to be escaped.  May not be a string, but the
 *     value will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeHtmlAttributeNospace(value) {
  if (value && value[CONTENT_KIND_PROPNAME] === CONTENT_KIND_HTML) {
    return normalizeHtmlNospaceHelper(
        stripHtmlTags(value[CONTENT_PROPNAME]));
  }
  return escapeHtmlNospaceHelper(value);
}


/**
 * Filters out strings that cannot be a substring of a valid HTML attribute.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A valid HTML attribute name part or name/value pair.
 *     {@code "zSafehtmlz"} if the input is invalid.
 */
function filterHtmlAttribute(value) {
  var str = filterHtmlAttributeHelper(value);
  var ch, eq = str.indexOf('=');
  return eq >= 0 && (ch = str.charAt(str.length - 1)) != '"' && ch != "'"
      // Quote any attribute values so that a contextually autoescaped whole
      // attribute does not end up having a following value associated with
      // it.
      // The contextual autoescaper, since it propagates context left to
      // right, is unable to distinguish
      //     <div {$x}>
      // from
      //     <div {$x}={$y}>.
      // If {$x} is "dir=ltr", and y is "foo" make sure the parser does not
      // see the attribute "dir=ltr=foo".
      ? str.substring(0, eq + 1) + '"' + str.substring(eq + 1) + '"'
      : str;
}


/**
 * Filters out strings that cannot be a substring of a valid HTML element name.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A valid HTML element name part.
 *     {@code "zSafehtmlz"} if the input is invalid.
 */
function filterHtmlElementName(value) {
  return filterHtmlElementNameHelper(value);
}


/**
 * Escapes characters in the value to make it valid content for a JS string
 * literal.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeJsString(value) {
  if (value && value[CONTENT_KIND_PROPNAME] === CONTENT_KIND_JS_STR_CHARS) {
    return value[CONTENT_PROPNAME];
  }
  return escapeJsStringHelper(value);
}


/**
 * @param {string} ch
 * @return {string}
 * @private
 */
function escapeJsChar_(ch) {
  var s = ch.charCodeAt(0).toString(16);
  var prefix = s.length <= 2 ? '\\x00' : '\\u0000';
  return prefix.substring(0, prefix.length - s.length) + s;
}


/**
 * Encodes a value as a JavaScript literal.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A JavaScript code representation of the input.
 */
function escapeJsValue(value) {
  // We surround values with spaces so that they can't be interpolated into
  // identifiers by accident.
  // We could use parentheses but those might be interpreted as a function call.
  var type;
  return value == null  // Intentionally matches undefined.
      // We always output null for compatibility with Java/python server side
      // frameworks which do not have a distinct undefined value.
      ? ' null '
      : (type = typeof value) == "boolean" || type == "number"
        ? ' ' + value + ' '
        : "'" + escapeJsString(value) + "'";
}


/**
 * Escapes characters in the string to make it valid content for a JS regular
 * expression literal.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeJsRegex(value) {
  return escapeJsRegexHelper(value);
}


/**
 * Matches all URI mark characters that conflict with HTML attribute delimiters
 * or that cannot appear in a CSS uri.
 * From <a href="http://www.w3.org/TR/CSS2/grammar.html">G.2: CSS grammar</a>
 * <pre>
 *     url        ([!#$%&*-~]|{nonascii}|{escape})*
 * </pre>
 *
 * @type {RegExp}
 * @private
 */
var problematicUriMarks_ = /['()]/g;

/**
 * @param {string} ch A single character in {@link problematicUriMarks_}.
 * @return {string}
 * @private
 */
function pctEncode_(ch) {
  return '%' + ch.charCodeAt(0).toString(16);
}

/**
 * Escapes a string so that it can be safely included in a URI.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeUri(value) {
  if (value && value[CONTENT_KIND_PROPNAME] === CONTENT_KIND_URI) {
    return normalizeUri(value);
  }
  // Apostophes and parentheses are not matched by encodeURIComponent.
  // They are technically special in URIs, but only appear in the obsolete mark
  // production in Appendix D.2 of RFC 3986, so can be encoded without changing
  // semantics.
  var encoded = encodeURIComponent(/** @type {string} */ (value));
  return encoded.replace(problematicUriMarks_, pctEncode_);
}


/**
 * Removes rough edges from a URI by escaping any raw HTML/JS string delimiters.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function normalizeUri(value) {
  value = String(value);
  if (/[\0- "<>\\{}\x7f\x85\xa0\u2028\u2029\uff00-\uffff]|%(?![a-f0-9]{2})/i
      .test(value)) {
    var parts = value.split(/(%[a-f0-9]{2}|[#$&+,/:;=?@\[\]])/i);
    for (var i = parts.length - 1; i >= 0; i -= 2) {
      parts[i] = encodeURIComponent(parts[i]);
    }
    value = parts.join('');
  }
  return value.replace(problematicUriMarks_, pctEncode_);
}


/**
 * Vets a URI's protocol and removes rough edges from a URI by escaping
 * any raw HTML/JS string delimiters.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function filterNormalizeUri(value) {
  var str = String(value);
  if (!FILTER_FOR_FILTER_NORMALIZE_URI_.test(str)) {
    return '#zSafehtmlz';
  } else {
    return normalizeUri(value);
  }
}


/**
 * Escapes a string so it can safely be included inside a quoted CSS string.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
function escapeCssString(value) {
  return escapeCssStringHelper(value);
}


/**
 * Encodes a value as a CSS identifier part, keyword, or quantity.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A safe CSS identifier part, keyword, or quanitity.
 */
function filterCssValue(value) {
  // Uses == to intentionally match null and undefined for Java compatibility.
  if (value == null) {
    return '';
  }
  return filterCssValueHelper(value);
}



// -----------------------------------------------------------------------------
// Generated code.


// START GENERATED CODE FOR ESCAPERS.

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var ESCAPE_MAP_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_ = {
  '\x22': '\x26quot;',
  '\x26': '\x26amp;',
  '\x3c': '\x26lt;',
  '\x3e': '\x26gt;'
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_(ch) {
  return ESCAPE_MAP_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_[ch]
      || (ESCAPE_MAP_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_[ch] = '\x26#' + ch.charCodeAt(0) + ';');
}

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var ESCAPE_MAP_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_ = {
  // We do not escape '\x08' to '\\b' since that means word-break in RegExps.
  '\x09': '\\t',
  '\x0a': '\\n',
  '\x0c': '\\f',
  '\x0d': '\\r',
  '\/': '\\\/',
  '\\': '\\\\'
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function REPLACER_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_(ch) {
  return ESCAPE_MAP_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_[ch]
     || (ESCAPE_MAP_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_[ch]
         = escapeJsChar_(ch));
}

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var ESCAPE_MAP_FOR_ESCAPE_CSS_STRING_ = {};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function REPLACER_FOR_ESCAPE_CSS_STRING_(ch) {
  return ESCAPE_MAP_FOR_ESCAPE_CSS_STRING_[ch] || (
     ESCAPE_MAP_FOR_ESCAPE_CSS_STRING_[ch]
         = '\\' + ch.charCodeAt(0).toString(16) + ' ');
}

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_ESCAPE_HTML_ = /[\x00\x22\x26\x27\x3c\x3e]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_NORMALIZE_HTML_ = /[\x00\x22\x27\x3c\x3e]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_ESCAPE_HTML_NOSPACE_
    = /[\x00\x09-\x0d \x22\x26\x27\x2d\/\x3c-\x3e`\x85\xa0\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_NORMALIZE_HTML_NOSPACE_
    = /[\x00\x09-\x0d \x22\x27\x2d\/\x3c-\x3e`\x85\xa0\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_ESCAPE_JS_STRING_
    = /[\x00\x08-\x0d\x22\x26\x27\/\x3c-\x3e\\\x85\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_ESCAPE_JS_REGEX_ = /[\x00\x08-\x0d\x22\x24\x26-\/\x3a\x3c-\x3f\x5b-\x5e\x7b-\x7d\x85\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var MATCHER_FOR_ESCAPE_CSS_STRING_ = /[\x00\x08-\x0d\x22\x26-\x2a\/\x3a-\x3e@\\\x7b\x7d\x85\xa0\u2028\u2029]/g;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 * @const
 */
var FILTER_FOR_FILTER_CSS_VALUE_ = /^(?!-*(?:expression|(?:moz-)?binding))(?:[.#]?-?(?:[_a-z0-9][_a-z0-9-]*)(?:-[_a-z][_a-z0-9-]*)*-?|-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9])(?:[a-z]{1,2}|%)?|!important|)$/i;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 * @const
 */
var FILTER_FOR_FILTER_NORMALIZE_URI_
    = /^(?:(?:https?|mailto):|[^&:\/?#]*(?:[\/?#]|$))/i;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 * @const
 */
var FILTER_FOR_FILTER_HTML_ATTRIBUTE_ = /^(?!style|on|action|archive|background|cite|classid|codebase|data|dsync|href|longdesc|src|usemap)(?:[a-z0-9_$:-]*|dir=(?:ltr|rtl))$/i;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 * @const
 */
var FILTER_FOR_FILTER_HTML_ELEMENT_NAME_
    = /^(?!script|style|title|textarea|xmp|no)[a-z0-9_$:-]*$/i;

/**
 * A helper for the Soy directive |escapeHtml
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeHtmlHelper(value) {
  var str = String(value);
  return str.replace(
      MATCHER_FOR_ESCAPE_HTML_,
      REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_);
}

/**
 * A helper for the Soy directive |normalizeHtml
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function normalizeHtmlHelper(value) {
  var str = String(value);
  return str.replace(
      MATCHER_FOR_NORMALIZE_HTML_,
      REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_);
}

/**
 * A helper for the Soy directive |escapeHtmlNospace
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeHtmlNospaceHelper(value) {
  var str = String(value);
  return str.replace(
      MATCHER_FOR_ESCAPE_HTML_NOSPACE_,
      REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_);
}

/**
 * A helper for the Soy directive |normalizeHtmlNospace
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function normalizeHtmlNospaceHelper(value) {
  var str = String(value);
  return str.replace(
      MATCHER_FOR_NORMALIZE_HTML_NOSPACE_,
      REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_);
}

/**
 * A helper for the Soy directive |escapeJsString
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeJsStringHelper(value) {
  var str = String(value);
  return str.replace(
      MATCHER_FOR_ESCAPE_JS_STRING_,
      REPLACER_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_);
}

/**
 * A helper for the Soy directive |escapeJsRegex
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeJsRegexHelper(value) {
  var str = String(value);
  return str.replace(
      MATCHER_FOR_ESCAPE_JS_REGEX_,
      REPLACER_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_);
}

/**
 * A helper for the Soy directive |escapeCssString
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeCssStringHelper(value) {
  var str = String(value);
  return str.replace(
      MATCHER_FOR_ESCAPE_CSS_STRING_,
      REPLACER_FOR_ESCAPE_CSS_STRING_);
}

/**
 * A helper for the Soy directive |filterCssValue
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function filterCssValueHelper(value) {
  var str = String(value);
  if (!FILTER_FOR_FILTER_CSS_VALUE_.test(str)) {
    return 'zSafehtmlz';
  }
  return str;
}

/**
 * A helper for the Soy directive |filterHtmlAttribute
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function filterHtmlAttributeHelper(value) {
  var str = String(value);
  if (!FILTER_FOR_FILTER_HTML_ATTRIBUTE_.test(str)) {
    return 'zSafehtmlz';
  }
  return str;
}

/**
 * A helper for the Soy directive |filterHtmlElementName
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function filterHtmlElementNameHelper(value) {
  var str = String(value);
  if (!FILTER_FOR_FILTER_HTML_ELEMENT_NAME_.test(str)) {
    return 'zSafehtmlz';
  }
  return str;
}

/**
 * Matches all tags, HTML comments, and DOCTYPEs in tag soup HTML.
 *
 * @type {RegExp}
 * @private
 * @const
 */
var HTML_TAG_REGEX_ = /<(?:!|\/?[a-z])(?:[^>'"]|"[^"]*"|'[^']*')*>/gi;

// END GENERATED CODE

var SANITIZER_FOR_ESC_MODE = [];
SANITIZER_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML] = escapeHtml;
SANITIZER_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML_RCDATA] = escapeHtmlRcdata;
SANITIZER_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML_ATTRIBUTE] = escapeHtmlAttribute;
SANITIZER_FOR_ESC_MODE[ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE]
    = escapeHtmlAttributeNospace;
SANITIZER_FOR_ESC_MODE[ESC_MODE_FILTER_HTML_ELEMENT_NAME]
    = filterHtmlElementName;
SANITIZER_FOR_ESC_MODE[ESC_MODE_FILTER_HTML_ATTRIBUTE] = filterHtmlAttribute;
SANITIZER_FOR_ESC_MODE[ESC_MODE_ESCAPE_JS_STRING] = escapeJsString;
SANITIZER_FOR_ESC_MODE[ESC_MODE_ESCAPE_JS_VALUE] = escapeJsValue;
SANITIZER_FOR_ESC_MODE[ESC_MODE_ESCAPE_JS_REGEX] = escapeJsRegex;
SANITIZER_FOR_ESC_MODE[ESC_MODE_ESCAPE_CSS_STRING] = escapeCssString;
SANITIZER_FOR_ESC_MODE[ESC_MODE_FILTER_CSS_VALUE] = filterCssValue;
SANITIZER_FOR_ESC_MODE[ESC_MODE_ESCAPE_URI] = escapeUri;
SANITIZER_FOR_ESC_MODE[ESC_MODE_NORMALIZE_URI] = normalizeUri;
SANITIZER_FOR_ESC_MODE[ESC_MODE_FILTER_NORMALIZE_URI] = filterNormalizeUri;
