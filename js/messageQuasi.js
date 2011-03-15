// msg provides a little quasi-spice for String.format.

/**
 * This implements a large chunk of the semantics but not the syntax
 * specified in http://wiki.ecmascript.org/doku.php?id=strawman:string_format_take_two
 * <p>
 * It provides a {@code msg`...`} quasi handler to allow identification of human readable
 * message strings in JS code, i18n of data values including numbers and dates, and
 * is meant to be composable with other concerns such as the security quasi functions defined
 * in safehtmljs.
 * <p>
 * Format specifiers follow an interolation, and can use one of two syntaxes.
 * <ul>
 *   <li><code>${x}:+3.2f</code> is an interpolation followed by the format specifier "+3.2f"
 *      which, for numbers, specifies a width of 3, a precision of 2, that sign must be present
 *      and that the number should be output as a real number.
 *      To separate the format specifier from literal content, a single space immediately following
 *      will be ignored.
 *   <li><code>${x}:(+3.2f)</code> is the same interpolation and the same format specifier.
 *      The format specifier starts after an open parenthesis immediately following a colon, and
 *      ends immediately before the close parenthesis which is also consumed.
 * </ul>
 */

// This file requires pretty-quasi-output.js but should not if used in a production environment.

var msgPartsDecompose = (function () {
  var escRe = new RegExp(
      '\\\\(?:' +  // \
        'u([0-9A-Fa-f]{4})' +  // Unicode escape with hex in group 1
        '|x([0-9A-Fa-f]{2})' +  // Hex pair escape with hex in group 2
        '|([0-3][0-7]{1,2}|[4-7][0-7])' +  // Octal escape with octal in group 3
        '|(\r\n?|[\u2028\u2029\n])' +  // Line continuation in group 4
        '|([^xu\r\n\u2028\u2029])' +  // Single characer escape in group 5
      ')',
      'g');

  /** Given a literal chunk of text, decodes any JavaScript escape sequences. */
  function decode(raw) {
    return raw.replace(
        escRe,
        function (_, hex1, hex2, octal, lineCont, single) {
          if (hex1 || hex2) { return Integer.parseInt(hex1 || hex2, 16); }
          if (octal) { return Integer.parseInt(octal, 8); }
          if (lineCont) { return ''; }
          switch (single) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'v': return '\x0b';
            case 'f': return '\f';
            case 'b': return '\b';
            default: return single;
          }
        });
  }

  var cache = {};
  var cacheLen = 0;

  /**
   * Identifies format specifiers in static quasi content and
   * produces a bundle of the static parts and functions for
   * formatting dynamic values.
   */
  function msgPartsDecompose(staticParts) {
    var n = staticParts.length;
    for (var i = 0; i < n; ++i) {
      staticParts[i] = decode(staticParts[i]).replace(/\u0000/g, '');
    }
    var key = staticParts.join('\u0000');
//  if (cache.hasOwnProperty(key)) { return cache[key]; }

    var literalParts = [staticParts[0]];
    var formatSpecifiersRe = /^:(?:([0-9a-z.\-+\/]*) ?|\(([^\)]*)\))/i;
    var inputXforms = [];
    for (var i = 1; i < n; ++i) {
      var staticPart = staticParts[i];
      var formatSpecifiersMatch = staticPart.match(formatSpecifiersRe);
      var formatSpecifiers = null;
      if (formatSpecifiersMatch) {
        formatSpecifiers = formatSpecifiersMatch[1] || formatSpecifiersMatch[2];
        staticPart = staticPart.substring(formatSpecifiersMatch[0].length);
      }
      literalParts[i] = decode(staticPart);
      inputXforms[i - 1] = (function (formatSpecifiers) {
        return function (value) {
          if (value && 'function' === typeof value.formatToString) {
            return value.formatToString(formatSpecifiers);
          }
          return value === null || value === undefined ? '' : value;
        };
      })(formatSpecifiers);
    }

    if (cacheLen >= 50) { cache = {}; cacheLen = 0; }

    return cache[key] = {
      literalParts: literalParts,
      inputXforms: inputXforms
    };
  }

  return msgPartsDecompose;
})();

/**
 * A quasi handler that allows format specifiers using the
 * syntax described at the top of this file.
 */
var msg = function (staticParts) {
  var decomposed = msgPartsDecompose(staticParts);
  var literalParts = decomposed.literalParts;
  var inputXforms = decomposed.inputXforms;
  var lastIndex = literalParts.length - 1;

  return function (var_args) {
    var formattedArgs = [];
    var originals = [];
    for (var i = 0; i < lastIndex; ++i) {
      var thunk = arguments[i];
      var xform = inputXforms[i];
      formattedArgs[i] = xform(originals[i] = thunk());
    }
    return prettyQuasi(
        literalParts, formattedArgs, originals, null, String);
  };
};

/** Produces a padding string with the specified number of zeroes. */
function nZeroes(n) {
  var s = '';
  while (n >= 16) {
    n -= 16;
    s += '0000000000000000';
  }
  s += '0000000000000000'.substring(0, n);
  return s;
}

/** Produces a padding string with the specified number of spaces. */
function nSpaces(n) {
  var s = '';
  while (n >= 16) {
    n -= 16;
    s += '                ';
  }
  s += '                '.substring(0, n);
  return s;
}

/** Number formatting according to the string-format spec. */
Number.prototype.formatToString = function (formatSpecifiers) {
  var alwaysSign, leftAlign, alternate, padWithZero, width, precision, type = 'g';
  if (formatSpecifiers != null) {
    var match = formatSpecifiers.match(/^([+\-#0]*)([1-90-9*]+)?(?:\.([0-9]+))?([dfFeEgGxXobs])?$/);
    if (match) {
      var flags = match[1] || '';
      alwaysSign = flags.indexOf('+') >= 0;
      leftAlign = flags.indexOf('-') >= 0;
      alternate = flags.indexOf('#') >= 0;
      padWithZero = flags.indexOf('0') >= 0;
      width = +match[2] || 0;
      precision = +match[3] || 0;
      type = match[4] || 'g';
    }
  }

  var num = +this;

  // Handle IEE754 specials.
  if (num !== num) {  // NaN
    return ('A' <= type && type <= 'Z') ? 'NAN' : 'nan';
  }
  if (!isFinite(num)) {
    return (num > 0 && alwaysSign ? '+' : '') + ('A' <= type && type <= 'Z') ? 'INFINITY' : 'Infinity';
  }

  // Maybe round.
  switch (type) {
    case 'd': case 'x': case 'X': case 'o': case 'b':
      num = Math.round(num);
      break;
  }

  // Sign handling.
  var sign = num < 0 ? '-' : alwaysSign ? (num === 0 && ((1 / num) < 0) ? '-' : '+') : '';
  num = Math.abs(num);

  // Convert to unsigned string.
  var str;
  switch (type) {
    case 'd':
      str = ('' + num).replace(/e\+(\d+)/, function (_, exp) { return nZeroes(exp); });
      break;
    case 'f': case 'F':
      str = num.toFixed();
      str = num.replace(/^([0-9]*)(?:\.([0-9]*))?(e[\+-]?\d+)/,
                        function (_, intPart, fraction, exp) {
                          exp = +exp;
                          var digitsInInt = intPart.length;
                          var digitsNeededInInt = digitsInInt + exp;
                          var digitsInFraction = (fraction || '').length;
                          var digits = intPart + (fraction || '');
                          if (digits.length < digitsNeededInInt) {
                            digits += nZeroes(digitsNeeddInInt - digits.length);
                          }
                          return digits.substring(0, digitsNeededInInt)
                              + '.' + digits.substring(digitsNeededInInt);
                        });
      if (alternate && str.indexOf('.') < 0) { str = str.replace(/[eE]|$/, '.$&'); }
      break;
    case 'e': case 'E':
      str = num.toExponential();
      if (alternate && str.indexOf('.') < 0) { str = str.replace(/[eE]|$/, '.$&'); }
      break;
    case 'g': case 'G':
      str = String(num);
      if (alternate && str.indexOf('.') < 0) { str = str.replace(/[eE]|$/, '.$&'); }
      break;
    case 'x': case 'X':
      str = num.toString(16);
      if (alternate) { str = '0' + type + str; }
      break;
    case 'o':
      str = num.toString(8);
      if (alternate) { str = '0' + str; }
      break;
    case 'b':
      str = num.toString(2);
      break;
    default:
      str = String(num);
      break;
  }
  if ('A' <= type && type <= 'Z') { str = str.toUpperCase(); }

  if (precision) {
    str = str.replace(/^([0-9]*)(?:\.([0-9]*))?/, function (_, intPart, fraction) {
                        var prec = intPart === '0' ? precision + 1 : precision;
                        if (intPart.length > prec) {
                          return intPart.substring(0, prec) + nZeroes(intPart.length - prec);
                        }
                        var nDigits = intPart.length + (fraction ? fraction.length : 0);
                        if (nDigits > prec) {
                          return intPart + '.' + fraction.substring(0, prec - intPart.length);
                        } else if (nDigits < prec) {
                          return intPart + '.' + (fraction || '') + nZeroes(prec - nDigits);
                        } else {
                          return _;
                        }
                      });
  }

  var paddingNeeded = width - (str.length + sign.length);
  if (paddingNeeded > 0) {
    if (padWithZero) {
      str = sign + nZeroes(paddingNeeded) + str;
    } else if (leftAlign) {
      str = sign + str + nSpaces(paddingNeeded);
    } else {
      str = nSpaces(paddingNeeded) + sign + str;
    }
  } else if (sign) {
    str = sign + str;
  }

  return str;
};

/**
 * Date formatting in the spirit of the string-format spec since it provides none.
 * The format string supports a subset of the {@code java.text.SimpleDateFormat}
 * syntax.
 */
Date.prototype.formatToString = function (formatSpecifiers) {
  var date = this;
  if (!formatSpecifiers) { return date.toString(); }
  return formatSpecifiers.replace(
      /y+|M+|d+|a+|H+|k+|K+|h+|m+|s+/g,
      function (formatPart) {
        var len = formatPart.length;
        var n;
        switch (formatPart.charAt(0)) {
          case 'y': n = date.getFullYear(); break;
          case 'M':
            n = date.getMonth() + 1;
            if (len > 2) {
              var name = ['January', 'February', 'March', 'April',
                          'May', 'June', 'July', 'August', 'September',
                          'October', 'November', 'December'][n - 1];
              if (len < 6 && name.length > len) {
                if (len > 3) {
                  return name.substring(0, len - 1) + '.';
                } else {
                  return name.substring(0, len);
                }
              }
              return name;
            }
            break;
          case 'd': n = date.getDate(); break;
          case 'a':
            n = date.getHours();
            return n && n <= 12 ? 'AM' : 'PM';
          case 'H': n = date.getHours(); break;
          case 'k': n = date.getHours() + 1; break;
          case 'K': n = date.getHours() % 12; break;
          case 'h': n = (date.getHours() % 12) + 1; break;
          case 'm': n = date.getMinutes(); break;
          case 's': n = date.getSeconds(); break;
          default: return formatPart;
        }
        var s = '' + n;
        while (s.length < len) { s = '0' + s; }
        return s.substring(s.length - len);
      });
};


/**
 * String formatting that can be used to align a string within a column.
 * The format specifier must be a number.  A negative number means the
 * column is left-aligned.
 */
String.prototype.formatToString = function (formatSpecifiers) {
  var s = String(this);
  var padding = +formatSpecifiers;
  if (padding && padding === (padding | 0)) {
    if (padding < 0) {
      padding = -padding;
      if (s.length < padding) {
        return nSpaces(padding - s.length) + s;
      }
    } else {
      return s + nSpaces(padding - s.length);
    }
  }
  return s;
};