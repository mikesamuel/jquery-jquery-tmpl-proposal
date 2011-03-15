/**
 * @fileoverview
 * A utility for converting JavaScript with syntactic sugar to one
 * without.
 */

// Requires contextUpdate.js for its regex lexical prediction function.


/**
 * Desugars JavaScript code converting JavaScript + quasi syntax to regular
 * JavaScript.
 * This does not deal with non-Latin letters or digits in identifiers.
 */
function desugar(sugaryJs) {
  function reportFailure() {
    try {
      console.trace();
      console.error('Failed to lex ' + JSON.stringify(toLex) + ' preceded by '
                    + JSON.stringify(sugaryJs.substring(0, sugaryJs.length - toLex.length)));
    } catch (ex) {
      // suppress failure to log
    }
  }

  var quasiEscRe = new RegExp(
      '[$]\\\\(?:' +  // $\
        'u([0-9A-Fa-f]{4})' +  // Unicode escape with hex in group 1
        '|x([0-9A-Fa-f]{2})' +  // Hex pair escape with hex in group 2
        '|([0-3][0-7]{1,2}|[4-7][0-7])' +  // Octal escape with octal in group 3
        '|(\r\n?|[\u2028\u2029\n])' +  // Line continuation in group 4
        '|([^xu\r\n\u2028\u2029])' +  // Single characer escape in group 5
      ')',
      'g');

  function quasiRawToJs(raw) {
    return JSON.stringify(raw.replace(
        quasiEscRe,
        function (_, hex1, hex2, octal, lineCont, single) {
          if (hex1 || hex2) { return Integer.parseInt(hex1 || hex2, 16); }
          if (octal) { return Integer.parseInt(octal, 8); }
          if (lineCont) { return ''; }
          switch (single) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'v': return '\x08';
            case 'f': return '\f';
            case 'b': return '\b';
            default: return single;
          }
        }));
  }

  function consume(match) {
    toLex = toLex.substring(match[0].length);
  }

  var desugared = [];
  var lastToken = null;
  var tokenRe = new RegExp(
      '^(?:' +
        // Ignorable
        '\\s+' + // space
        '|//.*?' + // line comment
        '|/\\*(?:[^*]+|\\*+[^\\*/])*\\*+/' +  // block comment
        '|\\\\[\r\n\u2028\u2029]' +  // line continuation
        // Significant tokens
        '|(' +
          '[a-z_$][a-z0-9_$]*' +  // keyword or ident
          // Syntactic sugar.
          '(`)?' +
          '|\\.[0-9]+(?:e[+-]?[0-9]+)?' +  // fraction
          '|0x[0-9a-f]+' +  // hex
          '|[0-9]+(?:\\.[0-9])?(?:e[+-]?[0-9]+)?' +  // decimal
          '|"(?:[^"\\\\]|\\\\.)*"' +  // string
          '|\'(?:[^\'\\\\]|\\\\.)*\'' +  // string
          '|[^.a-z0-9"\'/\\s\u2028\u2029]+' +  // run of punctuation
          '|\\.(?![0-9])' +  // punctuation dot
          '|/' +  // div op part or regex start
        '))', 'i');
  var reBodyRe = /^(?:[^\/\\\[]|\\[^\r\n\u2028\u2029\/]|\[(?:[^\]\\\r\n\u2028\u2029]|\\.)*\])+\/[gim]*/;
  var quasiBodyRe = new RegExp(
      '^(?:' +
        '`' +  // End of quasi.
        '|(?:' +  // Literal text
          '[^`\\\\$\\r\\n\\u2028\\u2029]' +  // Non-special character.
          '|\\\\(?:\\r\\n?|[\\n\\u2028\\u2029]|.)' +  // Raw escape sequence
          '|[$](?![\{a-z_$])' +  // Raw dollar-sign
        ')+' +
        '|[$][\{]' +  // Start of an interpolation
        '|[$]([a-z_$][a-z0-9_$]*)' +  // An abbreviated interpolation
      ')',
      'i');

  var interpBodyRe = /^[\{\}`]|\"(?:[^"\\]|\\.)*\"|'(?:[^'\\]|\\.)*'|[^\{\}`"']+/;
  for (var toLex = sugaryJs; toLex;) {
    var m = toLex.match(tokenRe);
    if (!m) {
      reportFailure();
      return sugaryJs;
    }
    consume(m);
    var token = m[0];
    if (!m[1]) {
      // ignorable content
      desugared.push(token);
      continue;
    }
    if (token === '/') {
      if (lastToken === null || isRegexPreceder(lastToken)) {  // Parse rest of regular expression body.
        var reBody = toLex.match(reBodyRe);
        if (!reBody) {
          reportFailure();
          return sugaryJs;
        }
        consume(reBody);
        token += reBody[0];
      }
    } else if (m[2] === '`') {  // Consume and desugar the rest of quasi body.
      function desugarQuasiBody(quasiName) {
        var literalStrings = [];
        var interpolations = [];
        var buffer = [];

        while (toLex) {
          var quasiBodyMatch = toLex.match(quasiBodyRe);
          if (!quasiBodyMatch) { console.trace(); return null; }
          consume(quasiBodyMatch);
          var quasiBodyToken = quasiBodyMatch[0];
          if (quasiBodyToken === '`') {   // End of the quasi.
            literalStrings.push(quasiRawToJs(buffer.join('')));
            return '(' + quasiName + '([' + literalStrings.join(', ') + '])('
                + interpolations.join(', ') + '))';
          } else if (quasiBodyToken === '${') {  // A nested expression.
            literalStrings.push(quasiRawToJs(buffer.join('')));
            buffer.length = 0;
            buffer.push('(');

            var bracketDepth = 1;
            bracket_loop:
            while (toLex) {
              var interpBodyMatch = toLex.match(interpBodyRe);
              if (!interpBodyMatch) { console.trace(); return null; }
              consume(interpBodyMatch);
              var interpBodyToken = interpBodyMatch[0];
              switch (interpBodyToken.charAt(0)) {
                case '{': ++bracketDepth; break;
                case '}':
                  if (!--bracketDepth) { break bracket_loop; }
                  break;
                case '`':  // A nested quasi.
                  var interpCode = buffer.join('');
                  // Pull the quasi name off the end.
                  var quasiNameMatch = interpCode.match(/(?:^|[^a-z0-9_$])([a-z_$][a-z0-9_$]*)$/i);
                  if (!quasiNameMatch) { console.trace(); return null; }
                  var nestedQuasiName = quasiNameMatch[1];
                  buffer[0] = interpCode.substring(0, interpCode.length - nestedQuasiName.length);
                  buffer.length = 1;
                  interpBodyToken = desugarQuasiBody(nestedQuasiName);
                  if (!interpBodyToken) { console.trace(); return null; }
                  break;
              }
              buffer.push(interpBodyToken);
            }
            if (buffer.length == 1) { buffer.push('void 0'); }
            buffer.push(')');
            var interpBody = buffer.join('');
            buffer.length = 0;
            if (interpBody.charAt(1) === '=') {
              interpBody = '(' + interpBody.substring(2);
              interpolations.push(
                  'function () { return arguments.length ? '
                  + interpBody + ' = arguments[0] : ' + interpBody + '; }');
            } else {
              interpolations.push('function () { return ' + interpBody + '; }');
            }
          } else if (/^[$][a-z_$][a-z0-9_$]*$/.test(quasiBodyToken)) {
            literalStrings.push(quasiRawToJs(buffer.join('')));
            interpolations.push('function () { return (' + quasiBodyToken.substring(1) + '); }');
            buffer.length = 0;
          } else {
            buffer.push(quasiBodyToken);
          }
        }
        return null;
      }

      token = desugarQuasiBody(token.substring(0, token.length - 1));  // Strip quote.
      if (!token) {
        reportFailure();
        return sugaryJs;
      }
    }
    lastToken = token;
    desugared.push(token);
  }
  return desugared.join('');
}
