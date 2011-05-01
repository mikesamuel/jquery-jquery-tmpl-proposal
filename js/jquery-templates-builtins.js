/**
 * API methods and builtin compiler passes for JQuery templates
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

/**
 * An array of plugin passed, functions that take a parse tree and return
 * a parse tree, to run beore compilation.
 */
$[TEMPLATE_PLUGINS_PROP_NAME] = [
  // Naive auto-escape.
  function autoescape(parseTrees) {
    $.each(
        parseTrees,
        function autoescapeOne(_, parseTree) {
          if (typeof parseTree !== "string") {
            if (parseTree[0] === "=") {
              parseTree[1] += "=>escapeHtml";
            } else if (parseTree[0] === "html") {
              parseTree[0] = "=";
            } else {
              $.each(parseTree, autoescapeOne);
            }
          }
        });
    return parseTrees;
  }
];

function needsCompile(name) {
  var tmpl = $[TEMPLATES_PROP_NAME][name];
  return tmpl && "function" !== typeof tmpl[TMPL_METHOD_NAME];
}

function compileBundle(parseTrees, exclusion) {
  var processedNames = {};
  $.each(parseTrees, function process(name, parseTree) {
    if (processedNames[name] !== TRUTHY) {
      processedNames[name] = TRUTHY;
      $.each(parseTree, function findDeps(_, node) {
        if (node[0] === "tmpl" || node[0] === "wrap") {
          var match = node[1].match(TMPL_DIRECTIVE_CONTENT);
          if (match) {
            var depName = match[2];
            if (needsCompile(depName)
                && processedNames[depName] !== TRUTHY) {
              process(
                  depName,
                  parseTrees[depName] = $[TEMPLATES_PROP_NAME][depName]);
            }
          }
        }
      });
    }
  });
  function makePrepassCaller(pluginIndex) {
    return function (parseTrees) {
      var i;
      for (i = 0; i < pluginIndex; ++i) {
        parseTrees = $[TEMPLATE_PLUGINS_PROP_NAME][i](
            parseTrees, makePrepassCaller(i));
      }
      return parseTrees;
    };
  }
  var result;
  $.each(makePrepassCaller($[TEMPLATE_PLUGINS_PROP_NAME].length)(parseTrees),
         function (templateName, parseTree) {
           var tmplObj = { "tmpl": compileToFunction(parseTree) };
           if (templateName !== exclusion) {
             $[TEMPLATES_PROP_NAME][templateName] = tmplObj;
           } else {
             result = tmplObj;
           }
         });
  return result;
}

$[TEMPLATES_PROP_NAME] = {};

$[TEMPLATE_METHOD_NAME] = function self(name, templateSource) {
  var t = $[TEMPLATES_PROP_NAME];
  var parseTrees;
  if (arguments.length === 1) {
    if (name.indexOf("<") + 1) {
      return self(null, name);
    }
    if (needsCompile(name)) {
      parseTrees = {};
      parseTrees[name] = t[name];
      compileBundle(parseTrees);
    }
    return t[name];
  }
  // We delay compiling until we've got a bunch of definitions together.
  // This allows plugins to process entire template graphs.
  var parseTree = parseTemplate(
      templateSource,
      $.extend(guessBlockDirectives(templateSource),
               DEFAULT_BLOCK_DIRECTIVES));
  if (name === null) {
    return compileBundle(parseTrees = { "_": parseTree }, "_");
  }
  t[name] = parseTree;
};
