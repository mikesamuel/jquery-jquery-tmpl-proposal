/**
 * A simple inefficient backend for the JQuery template compiler
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

function compileToFunction(parseTree) {
  if (!Object.create) { Object.create = function () { return {}; }; }
  if (!Object.defineProperty) {
    Object.defineProperty = function (obj, prop, pd) {
      if ("value" in pd) {
        obj[prop] = pd;
      } else if (typeof obj.__defineGetter__ !== "undefined") {
        if ("get" in pd) { obj.__defineGetter__(prop, pd["get"]); }
        if ("set" in pd) { obj.__defineSetter__(prop, pd["set"]); }
      }
      return obj;
    };
  }

  function createTemplateScope(data) {
    // Object.create(null) creates an object with no prototype.
    // It does not inherit non-enumerables such as toString, etc. so
    // it has predictable behavior when used with with (...) { ... }
    return $.extend(Object.create(null), data);
  }

  function extendTemplateScope(parentScope, variables) {
    return $.extend(Object.create(parentScope), variables);
  }

  // Evaluates expression text that appears inside directive content
  // in the given scope.
  function evaluateInScope(expressionText, scope, options) {
    if (arguments.length !== 3) { throw new Error(); }
    // Behavior is undefined when expressionText does not have
    // properly balanced curly brackets and when the variable
    // 'arguments' is free inside expressionText.
    var result = new Function(
        "$data", "$item",
        "$data = $data || {};"
        + "$item = $item || {};"
        // Make sure that "arguments" can not be defined.
        // This will prevent unintentional access to arguments, but will
        // not prevent property deletion.  We should not try to prevent
        // deletion.
        + "with (Object.defineProperty(Object.create(null), 'arguments', {"
        + "'get': function () {"
        +   "throw new Error('arguments is not defined');"
        + "}})) {"
        + "with ($data) { return (" + expressionText + ") } }")(scope, options);
    return result;
  }

  function recurseToBody(body, scope, options) {
    if (arguments.length !== 3) { throw new Error(); }
    var htmlBuffer = "";
    for (var i = 0, n = body.length; i < n; ++i) {
      htmlBuffer += interpret(body[i], scope, options);
    }
    return htmlBuffer;
  }

  function interpret(parseTree, scope, options) {
    if (typeof parseTree === "string") { return parseTree; }

    var content = parseTree[1];
    var body = parseTree.slice(2);
    var match;
    switch (parseTree[0]) {
      case "each":
        match = content.match(EACH_DIRECTIVE_CONTENT);
        var key = match[1] || DEFAULT_EACH_KEY_VARIABLE_NAME;
        var value = match[2] || DEFAULT_EACH_VALUE_VARIABLE_NAME;
        var expression = match[3];
        var extensions = {};
        extensions[key] = -1;
        extensions[value] = null;
        var childScope = extendTemplateScope(scope, extensions);
        var htmlBuffer = "";
        $.each(
            // Expression is not evaluated in childScope.
            evaluateInScope(expression, scope, options),
            function (k, v) {
              childScope[key] = k;
              childScope[value] = v;
              htmlBuffer += recurseToBody(body, childScope, options);
            });
        return htmlBuffer;
      case "else":
        return !/\S/.test(content) || evaluateInScope(content, scope, options);
      case "if":
        var bodyLength = body.length;
        for (var pos = 0, elseIndex; pos < body.length; pos = elseIndex + 1) {
          elseIndex = body.length;
          for (var i = pos; i < elseIndex; ++i) {
            if (body[i][0] === "else") { elseIndex = i; }
          }
          var conditionResult = pos === 0
              ? evaluateInScope(content, scope, options)
              : interpret(body[pos - 1], scope, options);
          if (conditionResult) {
            return recurseToBody(body.slice(pos, elseIndex), scope, options);
          }
        }
        return "";
      case "tmpl":
        match = content.match(TMPL_DIRECTIVE_CONTENT);
        var dataAndOptions = $.extend(
            [scope, options],
            evaluateInScope("[" + match[1] + "]", scope, options));
        var calleeData = dataAndOptions[0];
        var calleeOptions = dataAndOptions[1];
        var calleeName = match[2];
        return $["template"](evaluateInScope(calleeName, scope, options))
            .tmpl(calleeData, calleeOptions);
      case "=":
        var contentBefore = "", contentAfter = "";
        content = content.replace(
            /(=>\w+)+$/, function (postDethunk) {
              postDethunk = postDethunk.split("=>");
              contentAfter = Array(postDethunk.length).join(")");
              contentBefore = postDethunk.reverse().join("(");
              return "";
            });
        var result = evaluateInScope(content, scope, options);
        // De-thunkify if necessary.
        if (typeof result === "function") { result = result.call(scope); }
        return new Function(
            "return (" + contentBefore + "(arguments[0]))" + contentAfter
            )(result);
      default:
        throw new Error(JSON.stringify(parseTree));
    }
  }

  function fixupOrphanedSurrogatesAndNuls(s) {
    return s
        // Fix up orphaned high surrogates.  Alternately replace w/ "\ufffd".
        .replace(/[\ud800-\udbff](?![\udc00-\uffff])/g,
                 function (orphanedHighSurrogate) {
                   return "&#" + orphanedHighSurrogate.charCodeAt(0) + ";";
                 })
        // Fix up orphaned low surrogates.  Alternately replace w/ "$1\ufffd".
        .replace(/(^|[^\ud800-\udbff])([\udc00-\udffff])/g,
                 function (_, preceder, orphanedLowSurrogate) {
                   return preceder + "&#" + orphanedLowSurrogate.charCodeAt(0)
                       + ";";
                 })
        .replace(/\u0000/g, "&#0;");
  }

  return function (data, options) {
    return fixupOrphanedSurrogatesAndNuls(recurseToBody(
        parseTree.slice(2), createTemplateScope(data), options));
  };
}
