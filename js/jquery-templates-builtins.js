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
$["templatePlugins"] = [
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

function needsCompile(name) {
  var tmpl = $["templates"][name];
  return tmpl && !("tmpl" in tmpl);
}

function compileBundle(parseTrees, exclusion) {
  var processedNames = {};
  $.each(parseTrees, function process(name, parseTree) {
    if (processedNames[name] !== TRUTHY) {
      processedNames[name] = TRUTHY;
      $.each(parseTree, function findDeps(i, node) {
        if (node[0] === "tmpl" || node[0] === "wrap") {
          var match = node[1].match(TMPL_DIRECTIVE_CONTENT);
          if (match) {
            var depName = match[2];
            if (needsCompile(depName)
                && processedNames[depName] !== TRUTHY) {
              process(
                  depName, parseTrees[depName] = $["templates"][depName]);
            }
          }
        }
      });
    }
  });
  function makePrepassCaller(pluginIndex) {
    return function (parseTrees) {
      for (var i = 0; i < pluginIndex; ++i) {
        parseTrees = $["templatePlugins"][i](
            parseTrees, makePrepassCaller(i));
      }
      return parseTrees;
    };
  }
  var result;
  $.each(makePrepassCaller($["templatePlugins"].length)(parseTrees),
         function (templateName, parseTree) {
           var tmplObj = { "tmpl": compileToFunction(parseTree) };
           if (templateName !== exclusion) {
             $["templates"][templateName] = tmplObj;
           } else {
             result = tmplObj;
           }
         });
  return result;
}

$["templates"] = {};

$["template"] = function self(name, templateSource) {
  var parseTrees;
  if (arguments.length === 1) {
    name = "" + name;
    if (name.indexOf("<") + 1) {
      return self(null, name);
    } else {
      if (needsCompile(name)) {
        parseTrees = {};
        parseTrees[name] = $["templates"][name];
        compileBundle(parseTrees);
      }
      return $["templates"][name];
    }
  }
  var parseTree = parseTemplate(
      templateSource,
      $.extend({ "if": TRUTHY, "wrap": TRUTHY },
               guessBlockDirectives(templateSource)));
  if (name == null) {
    return compileBundle(parseTrees = { "_": parseTree }, "_");
  }
  $["templates"][name] = parseTree;
};
