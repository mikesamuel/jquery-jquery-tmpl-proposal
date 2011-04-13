(function () {

  var filter = /^test/;
  
  var m = document.location.search.match(/[&?]testFilter=([^&#]*)/);
  if (m) { filter = new RegExp(decodeURIComponent(m[1])); }

  var nTests = 0;
  for (var k in window) {
    if (!(/^test/.test(k) && filter.test(k))) { continue; }
    ++nTests;
    var header = document.createElement('H2');
    header.appendChild(document.createTextNode(k));
    document.body.appendChild(header);
    if (typeof console !== 'undefined') { console.group(k); }
    try {
      window[k]();
      header.className = 'pass';
    } catch (e) {
      header.className = 'fail';
      var pre = document.createElement('PRE');
      pre.appendChild(document.createTextNode(e.toString() + '\n' + e.stack));
      document.body.appendChild(pre);
    }
    if (typeof console !== 'undefined') { console.groupEnd(k); }
  }

  assertTrue(nTests > 0);
})();
