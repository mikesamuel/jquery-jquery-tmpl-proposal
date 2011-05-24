//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var escapeMapForHtml = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;"
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function replacerForHtml( ch ) {
	return escapeMapForHtml[ ch ]
			// Intentional assignment that caches the result of encoding ch.
			|| ( escapeMapForHtml[ ch ] = "&#" + ch.charCodeAt( 0 ) + ";" );
}

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var escapeMapForJs = {
	// We do not escape "\x08" to "\\b" since that means word-break in RegExps.
	"\x09": "\\t",
	"\x0a": "\\n",
	"\x0c": "\\f",
	"\x0d": "\\r",
	"\/": "\\\/",
	"\\": "\\\\"
};

/**
 * {@code "\u2028"} -> {@code "\\u2028"}.
 * @param {string} ch
 * @return {string}
 * @private
 */
function escapeJsChar( ch ) {
  var s = ch.charCodeAt( 0 ).toString( 16 );
  var prefix = s.length <= 2 ? "\\x00" : "\\u0000";
  return prefix.substring( 0, prefix.length - s.length ) + s;
}

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function replacerForJs( ch ) {
	return escapeMapForJs[ ch ] || ( escapeMapForJs[ ch ] = escapeJsChar( ch ) );
}

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var htmlSpecialChar = /[\x00"&'<>]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var jsSpecialChar = /[\x00\x08-\x0d"&'\/<->\\\x85\u2028\u2029]/g;

/**
 * A helper for the Soy directive |escapeHtml
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeHtml( value ) {
	return value === undefined
      ? "" : String( value ).replace( htmlSpecialChar, replacerForHtml );
}

/**
 * Encodes a value as a JavaScript literal.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A JavaScript code representation of the input.
 */
function escapeJsValue( value ) {
	return "'" + String( value ).replace( jsSpecialChar, replacerForJs ) + "'";
}

/**
 * @const
 * @private
 */
var ENCODE_METHOD_NAME = "encode";
$[ ENCODE_METHOD_NAME ] = escapeHtml;
