// Utilities to parse JQuery templates.

var FALSEY = 1;
var TRUTHY = 1;

function parseJqueryTemplate(templateText, opt_name) {
  // Figure out the set of block directives by looking at end markers.
  var blockDirectives = {};
  templateText.replace(/\{\{\/([a-z][a-z0-9]*)\}\}/ig, function (_, name) {
    blockDirectives[name] = TRUTHY;
  });

  // Produce a parse tree that is a type tag, directive data,
  // followed by any number of strings or other trees.
  // E.g. [ 'myTypeTag', ' directiveData', 'some non directive text', ...]
  // for '{{myTypeTag directiveData}}some non directive text{{/myTypeTag}}'
  var parseTree = ['T', opt_name ? String(opt_name) : ''];
  var stack = [parseTree];
  var top = parseTree;
  var tokens = String(templateText).match(
      /\$\{[^}]*\}|\{\{\/?[a-z][a-z0-9]*\b[^}]*\}\}|[\s\S][^{$]*/gi);
  if (tokens) {
    var m;
    for (var i = 0, n = tokens.length; i < n; ++i) {
      var token = tokens[i];
      switch (token.substring(0, 2)) {
        case '${':
          m = token.match(/^\$\{([\s\S]+)\}$/);
          if (!m) { break; }
          top.push(['$', m[1]]);
          continue;
        case '{{':
          m = token.match(/^\{\{(\/?)([a-z][a-z0-9]*)([^\}]*)\}\}$/i);
          if (!m) { break; }
          var name = m[2], content = m[3];
          if (m[1]) {  // close
            if (stack.length > 1 && top[0] === name) {
              top = stack[--stack.length - 1];
            } else if (DEBUG && window['console']) {
              window['console']['warn']('Missplaced end marker ' + token);
            }
          } else {
            var node = [name, content];
            top.push(node);
            if (TRUTHY === blockDirectives[name]) {
              stack.push(top = node);
            }
          }
          continue;
      }
      var toplen = top.length;
      if (toplen > 2 && 'string' === typeof top[toplen - 1]) {
        top[toplen - 1] += token;
      } else {
        top[toplen] = token;
      }
    }
  }
  if (DEBUG && window['console']) {
    while (stack.length > 1) {
      window['console']['warn']('Unclosed block directive ' + top[0]);
      top = stack[--stack.length];
    }
  }
  return parseTree;
}

function renderJQueryTemplate(templateParseTree) {
  var tokens = [];
  function walkChildren(node) {
    for (var i = 2, n = node.length; i < n; ++i) {
      walk(node[i]);
    }
  }
  function walk(node) {
    if (typeof node === 'string') {
      tokens.push(node);
    } else {
      var typeTag = node[0];
      var content = node[1];
      if (typeTag === '$') {
        tokens.push('${', content, '}');
      } else {
        tokens.push('{{', typeTag, content, '}}');
        walkChildren(node);
        tokens.push('{{/', typeTag, '}}');
      }
    }
  }
  walkChildren(templateParseTree);
  return tokens.join('');
}

function inferSanitizationDirectivesFor(jqueryTemplatesToNames) {
  var hop = Object.hasOwnProperty;
  var parsedTemplates = {};

  // Assigns IDs to nodes that can be used as keys in the inferences maps.
  var idCounter = 0;
  function assignIds(node) {
    if (typeof node === 'object') {
      node.parseTreeNodeId = ++idCounter;
      for (var i = 2, n = node.length; i < n; ++i) {
        assignIds(node[i]);
      }
    }
  }

  // Make sure all templates are parsed.
  for (var templateName in jqueryTemplatesToNames) {
    if (hop.call(jqueryTemplatesToNames, templateName)) {
      var template = jqueryTemplatesToNames[templateName];
      assignIds(
          parsedTemplates[templateName] = typeof template === 'string'
              ? parseJqueryTemplate(template) : template);
    }
  }

  // Looks up a template by name.
  function getTemplateParseTree(name) {
    return hop.call(parsedTemplates, name) && parsedTemplates[name];
  }

  // Propagates context across a template body to compute its output context.
  function processTemplate(name, templateBody, inputContext) {
    var inferences = {
      // Maps IDs of ${...} nodes to lists of escaping modes.
      escapingModes: {},
      // Maps template names to output contexts.
      outputContext: {},
      // Context before ${value} used for {{wrap ...}}
      contextBeforeWrapped: {},
      // Context before ${value} used for {{wrap ...}}
      contextAfterWrapped: {}
    };

    // Generate a debugging string for a template node.
    function errorLocation(root, parseTree) {
      var lineNum = 1;
      function walk(node) {
        if (typeof parseTree === 'string') {
          var m = parseTree.match(/\r\n?|\n/g);
          if (m) { lineNum += m.length; }
        } else {
          if (node === parseTree) {
            return name + ':' + lineNum;
          }
          for (var i = 1, n = parseTree.length; i < n; ++i) {
            var out = walk(parseTree[i]);
            if (out) { return out; }
          }
        }
        return void 0;
      }
      return walk(root);
    }

    function process(parseTree, context) {
      if (typeof parseTree === 'string') {
        return processRawText(parseTree, context);
      }
      var i = 2, n = parseTree.length;
      var startContext = context;
      switch (parseTree[0]) {
        case 'html':
          // {{html xyz}} --> ${new SanitizedHtml(xyz)}
          parseTree[0] = '$';
          parseTree[1] = 'new SanitizedHtml(' + parseTree[1] + ')';
          parseTree.length = 2;
          break;
        case 'if':
          // The output context is the union of the context across each branch.
          var outputContext = context;
          // If there is an else branch then we don't need to union the start
          // context with the output context of each branch.
          for (var j = n; --j >= 2;) {
            if ('else' === child[0]) {
              if ('' === child[1]) {
                outputContext = null;
              }
              break;
            }
          }
          for (; i <= n; ++i) {
            var child = parseTree[i];
            if (i === n || 'else' === child[0]) {
              if (outputContext === null) {
                outputContext = context;
              } else {
                // Union the context from preceding branches with
                // the context from this branch.
                var combined = contextUnion(outputContext, context);
                if (isErrorContext(combined)) {
                  if (DEBUG) {
                    throw new Error(
                        errorLocation(parseTree)
                            + ': Branch ends in irreconcilable contexts '
                            + contextToString(context) + ' and '
                            + contextToString(outputContext));
                  } else {
                    throw new Error();
                  }
                }
                outputContext = combined;
              }
              context = startContext;
            } else {
              context = process(parseTree[i], context, inferences);
            }
          }
          context = outputContext;
          break;
        case 'each':
          // Blank out the type tag so we can recurse over the body.
          parseTree[0] = '';
          try {
            // Union with context in case the loop body is never
            // entered.
            var onceAcrossBody = contextUnion(
                context, process(parseTree, context));
            if (isErrorContext(onceAcrossBody)) {
              if (DEBUG) {
                throw new Error(
                    errorLocation(parseTree)
                        + ': Loop ends in irreconcilable contexts '
                        + contextToString(context) + ' and '
                        + contextToString(onceAcrossBody));
              } else {
                throw new Error();
              }
            }
            var nAcrossBody = process(parseTree, onceAcrossBody);
            if (nAcrossBody !== onceAcrossBody) {
              if (DEBUG) {
                throw new Error(
                    errorLocation(parseTree)
                        + ': Loop ends in irreconcilable contexts '
                        + contextToString(onceAcrossBody) + ' and '
                        + contextToString(nAcrossBody));
              } else {
                throw new Error();
              }
            }
            context = nAcrossBody;
          } finally {
            parseTree[0] = 'each';
          }
          break;
        case 'tmpl':
          // TODO {{tmpl}} -> propagates context through call
          break;
        case 'wrap':
          // TODO {{wrap}} -> propagates context through call
          break;
        case '$':
          // ${xyz}} -> ${escapingDirective(xyz)}
          context = contextBeforeDynamicValue(context);
          var escapingModes = {};
          var afterEscaping = computeEscapingModeForSubst(
              context, escapingModes);
          if (isErrorContext(afterEscaping)) {
            if (DEBUG) {
              var uriPart = uriPartOf(context);
              if (uriPart === URI_PART_UNKNOWN ||
                  uriPart === URI_PART_UNKNOWN_PRE_FRAGMENT) {
                throw new Error(
                    errorLocation(parseTree)
                    + ': Cannot determine which part of the URL ${...} is in');
              } else {
                throw new Error(
                    errorLocation(parseTree)
                    + ": Don't put ${...} inside comments");
              }
            } else {
              throw new Error();
            }
          }
          if (typeof escapingModes.firstEscMode === 'number') {
            var modes = [];
            modes[0] = escapingModes.firstEscMode;
            if (typeof escapingModes.secondEscMode === 'number') {
              modes[1] = escapingModes.secondEscMode;
            }
            inferences.escapingModes[parseTree.parseTreeNodeId] = modes;
          }
          context = afterEscaping;
          break;
        default:
          for (; i < n; ++i) {
            context = process(parseTree[i], context, inferences);
          }
          break;
      }
      return context;
    }
  }
}
