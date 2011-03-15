// Allows a REPL to get a structured version of output from a compliant quasi handler.

function prettyQuasi(staticPortions, dynamicPortions, originals, extraDetails, opt_ctor) {
  function escape(s) {
    if (/[<>&"]/.test(s)) {
      if (~s.indexOf('&')) { s = s.replace(/&/g, '&amp;'); }
      if (~s.indexOf('<')) { s = s.replace(/</g, '&lt;'); }
      if (~s.indexOf('>')) { s = s.replace(/>/g, '&gt;'); }
      if (~s.indexOf('"')) { s = s.replace(/"/g, '&quot;'); }
    }
    return s;
  }

  function describe(index) {
    var value = originals[index];
    var descrip = value === null ? '<null>' : JSON.stringify(value) + ' : ' + (
        typeof value === 'object' && typeof value.constructor === 'function'
        && value.constructor.name ? value.constructor.name : typeof value);
    if (extraDetails && extraDetails[index]) {
      descrip += '\n' + extraDetails[index];
    }
    return descrip;
  }

  var buffer = [staticPortions[0]];
  var chunks = [staticPortions[0]];
  for (var i = 0, j = 0, k = 0, n = dynamicPortions.length; i < n;) {
    var dynamicPortion = dynamicPortions[i];
    var dynamicPortionString = String(dynamicPortion);
    if (dynamicPortion && 'function' === typeof dynamicPortion.toPrettyHtml) {
      chunks[++k] = dynamicPortion;
    } else {
      chunks[++k] = dynamicPortionString;
    }
    buffer[++j] = dynamicPortionString;
    chunks[++k] = buffer[++j] = staticPortions[++i];
  }
  var str = new (opt_ctor || String)(buffer.join(''));
  str.toPrettyHtml = function (opt_ctr, opt_buffer) {
    var counter = Math.max(opt_ctr ? (opt_ctr[0] | 0) || 0 : 0, 0);
    var html = opt_buffer || ['<div class=pretty-quasi>'];
    for (var i = 0, n = chunks.length; i < n; ++i) {
      if (i & 1) {
        var dynamicPortion = chunks[i];
        if (dynamicPortion && 'function' === typeof dynamicPortion.toPrettyHtml) {
          var counterRef = [counter];
          html.push('<span class="nested">');
          dynamicPortion.toPrettyHtml(counterRef, html);
          counter = Math.max((counterRef[0] | 0) || 0, 0);
          html.push('</span>');
        } else {
          html.push(
              '<span class="dynamic ord', ((counter++) % 3), '">',
              escape(dynamicPortion), '<span class="tooltip">',
              escape(describe(i >> 1)), '</span></span>');
        }
      } else {
        html.push('<span class="static">', escape(chunks[i]), '</span>');
      }
    }
    if (opt_ctr) { opt_ctr[0] = counter; }
    if (!opt_buffer) {
      html.push('</div>');
      return html.join('');
    }
  };
  return str;
}
