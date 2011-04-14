// Coerces the JSON-like stuff that developers write to JSON that can be
// parsed by a strict JSON.parseJson(...).

function fixupJson(str) {
  var tokens = str.match(
      /[{}\[\]]|"(?:[^\r\n\\"]|\\.)*"|'(?:[^\r\n\\']|\\.)*'|[^\s{}\[\]:,"']+/g
      );
  var indent = 0;
  var fixed = [];
  var first = true;
  var stack = [];
  var state = 0;  // 1 in array, 2 in object expect key, 3 in object expect value
  function start(forceNewline, suppressComma) {
    if (!first && !suppressComma) { fixed.push(state == 3 ? ':' : ','); }
    if (!first && !suppressComma && state === 2) { forceNewline = true; }
    if (fixed.length && (first || forceNewline)) {
      fixed.push('\n');
      for (var i = stack.length; --i >= 0;) { fixed.push('  '); }
    } else if (!first && !suppressComma) {
      fixed.push(' ');
    }
    first = false;
  }
  function nextState() {
    switch (state) {
      case 2: state = 3; break;
      case 3: state = 2; break;
    }
  }
  for (var i = 0; i < tokens.length; ++i) {
    var token = tokens[i];
    switch (token.charAt(0)) {
      case '{':
        if (state === 2) { continue; }
        stack.push('}');
        start();
        fixed.push('{');
        first = true;
        state = 2;
        break;
      case '[':
        if (state === 2) { continue; }
        stack.push(']');
        start();
        fixed.push('[');
        first = true;
        state = 1;
        break;
      case '}': case ']':
        if (!stack.length) continue;
        if (state === 3) { continue; }
        token = stack[stack.length - 1];
        --stack.length;
        start(true, true);
        fixed.push(token);
        state = stack[stack.length - 1] === '}' ? 2 : 1;
        break;
      case 'n': case 't': case 'f':
        if (state === 2 || !/^(null|true|false)$/.test(token)) {
          token = '"' + token + '"';
        }
        start(true);
        fixed.push(token);
        nextState();
        break;
      default:
        if (state != 2
            && /^[+-]?(0|[1-9][0-9]*)(\.[0-9]+)?(e[+-]?[0-9]+)?$/.test(token)) {
          start();
          fixed.push(token);
          nextState();
          break;
        }
        token = token.replace(/^'|'$/g, '');
        var accum = '"';
        var escaped = false;
        for (var j = 0, n = token.length; j < n; ++j) {
          var ch = token.charAt(j);
          if (ch === '\\') { escaped = !escaped; }
          else {
            if (ch === '"' && !escaped) { accum += '\\'; }
            escaped = false;
          }
          accum += ch;
        }
        token = accum + '"';
        // fall-through
      case '"':
        start();
        fixed.push(token);
        nextState();
        break;
    }
  }
  return fixed.join('');
}
