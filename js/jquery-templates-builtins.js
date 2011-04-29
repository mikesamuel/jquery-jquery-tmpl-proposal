/**
 * Builtin compiler passes for JQuery templates
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

/**
 * An array of plugin passed, functions that take a parse tree and return
 * a parse tree, to run beore compilation.
 */
$.templatePlugins = [
  // Naive auto-escape.
  function autoescape(parseTrees) {
    $.each(
        parseTrees,
        function autoescapeOne(k, parseTree) {
          if (typeof parseTree !== "string") {
            if (parseTree[0] === "$") {
              parseTree[1] += "=>escapeHtml";
            } else if (parseTree[0] === "html") {
              parseTree[0] = "$";
            } else {
              $.each(parseTree, autoescapeOne);
            }
          }
        });
    return parseTrees;
  }
];
