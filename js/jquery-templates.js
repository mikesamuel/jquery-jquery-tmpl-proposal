// Utilities to parse JQuery templates.

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
      /\$\{[^}]*\}|\{\{\/?[a-z][a-z0-9]*\b(?:\}?[^}])*\}\}|[\s\S][^{$]*/gi);
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
          m = token.match(/^\{\{(\/?)([a-z][a-z0-9]*)((?:\}?[^}])*)\}\}$/i);
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

/**
 * Given a JQuery parse tree, such as that produced by
 * {@link #parseJQueryTemplate}, produces a parseable form.
 */
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
  if (templateParseTree[0] === 'T') {
    walkChildren(templateParseTree);
  } else {
    walk(templateParseTree);
  }
  return tokens.join('');
}

function contextuallyEscapeTemplates(jqueryTemplatesByName) {
  if (DEBUG && typeof jqueryTemplatesByName !== 'object') { throw new Error; }

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
  for (var templateName in jqueryTemplatesByName) {
    if (hop.call(jqueryTemplatesByName, templateName)) {
      var template = jqueryTemplatesByName[templateName];
      if (typeof template === 'string') {
        template = parseJqueryTemplate(template);
      }
      template.jqueryTemplateName = templateName;
      assignIds(parsedTemplates[templateName] = template);
    }
  }

  var cloneJson;
  if (typeof JSON !== undefined) {
    cloneJson = function (ptree) { return JSON.parse(JSON.stringify(ptree)); };
  } else {
    cloneJson = function (ptree) {
      var clone = ptree.slice();
      for (var i = clone.length; --i >= 0;) {
        if (typeof clone[i] == 'object') {
          clone[i] = cloneJson(clone[i]);
        }
      }
      return clone;
    };
  }

  // Looks up a template by name.
  function getTemplateParseTree(name, context) {
    var qname = context ? name + '__C' + context : name;
    if (hop.call(parsedTemplates, qname)) {
      return parsedTemplates[qname];
    } else if (hop.call(parsedTemplates, name)) {
      // Clone one in the given context if none is found.
      var base = parsedTemplates[name];
      var clone = cloneJson(base);
      clone.jqueryTemplateName = qname;
      assignIds(clone);
      return parsedTemplates[qname] = clone;
    }
    return void 0;
  }

  var inferences = {
    // Maps IDs of ${...} nodes to lists of escaping modes.
    escapingModes: {},
    // For {{tmpl}}&{{wrap}} calls, the context in which the template is called.
    calleeName: {},
    // Maps template names to output contexts.
    outputContext: {},
    // Context before ${value} used for {{wrap ...}}
    contextBeforeWrapped: {},
    // Context after ${value} used for {{wrap ...}}
    contextAfterWrapped: {}
  };

  function makeChildInferences(parent) {
    function derive(a) {
      /** @constructor */
      function ctor() {}
      ctor.prototype = a;
      return new ctor;
    }
    var inferences = {};
    for (var k in parent) {
      if (hop.call(parent, k)) {
        inferences[k] = derive(parent[k]);
      }
    }
    return inferences;
  }

  function commitInferencesIntoParent(child, parent) {
    for (var k in parent) {
      if (hop.call(parent, k)) {
        var parentMap = parent[k];
        var childMap = child[k];
        for (var j in childMap) {
          if (hop.call(childMap, j)) {
            parentMap[j] = childMap[j];
          }
        }
      }
    }
  }

  var limit = 10;

  // Propagates context across a template body to compute its output context.
  function getTemplateOutputContext(
      templateBody, inputContext, parentInferences) {
    if (--limit <= 0) {
      throw new Error('too much recursion');
    }

    var templateId = templateBody.parseTreeNodeId;

    // Stop if we have already computed the output context for this template.
    if (templateId in parentInferences.outputContext) {
      return parentInferences.outputContext[templateId];
    }

    // Construct an inferences object that inherits from the parent.
    var inferences = makeChildInferences(parentInferences);

    // We need to optimistically commit to an output context to avoid
    // infinite recursion for recursive templates.

    // This is true for almost all templates people actually write.
    inferences.outputContext[templateId] = inputContext;

    var outputContext = processTemplate(
        templateBody, inputContext, inferences);

    if (outputContext === inputContext) {
      // Our optimistic assumption was correct.
    } else {

      // Optimistically assume that we have a steady state.
      inferences.outputContext[templateId] = outputContext;

      inferences = makeChildInferences(parentInferences);
      var outputContext2 = processTemplate(
          templateBody, inputContext, inferences);
      if (outputContext2 === outputContext) {
        // Our second optimistic assumption was correct.
      } else {
        var name = templateBody.jqueryTemplateName;
        throw new Error(
            DEBUG ? 'Cannot determine an output context for ' + name : name);
      }
    }

    commitInferencesIntoParent(inferences, parentInferences);
    return outputContext;
  }

  function processTemplate(templateBody, inputContext, inferences) {
    var name = templateBody.jqueryTemplateName;

    // Generate a debugging string for a template node.
    // Only used when DEBUG is true.
    function errorLocation(parseTree) {
      var lineNum = 1;
      function walk(node) {
        if ((typeof node) === 'string') {
          var m = node.match(/\r\n?|\n/g);
          if (m) { lineNum += m.length; }
        } else {
          if (node === parseTree) {
            var sourceAbbreviated = renderJQueryTemplate(parseTree)
                .replace(/\s+/g, ' ');
            var len = sourceAbbreviated.length;
            if (len > 35) {
              sourceAbbreviated = sourceAbbreviated.substring(0, 16) + '...'
                  + sourceAbbreviated.substring(len - 16);
            }
            return name + ':' + lineNum + ':`' + sourceAbbreviated + '`';
          }
          for (var i = 1, n = node.length; i < n; ++i) {
            var out = walk(node[i]);
            if (out) { return out; }
          }
        }
        return void 0;
      }
      return walk(templateBody);
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
          // Re-process as a substitution.
          return process(parseTree, context);
        case 'if':
          // The output context is the union of the context across each branch.
          var outputContext = context;
          // If there is an else branch then we don't need to union the start
          // context with the output context of each branch.
          for (var j = n; --j >= 2;) {
            var child = parseTree[j];
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
              context = process(child, context);
            }
          }
          context = outputContext;
          break;
        case 'each':
          // Blank out the type tag so we can recurse over the body.
          for (var timeThroughLoop = 2; --timeThroughLoop >= 0;) {
            var contextBefore = context, contextAfter;
            parseTree[0] = '';
            try {
              // Union with context in case the loop body is never
              // entered.
              contextAfter = process(parseTree, context);
              context = contextUnion(contextBefore, contextAfter);
            } finally {
              parseTree[0] = 'each';
            }
            if (isErrorContext(context)) {
              if (DEBUG) {
                throw new Error(
                    errorLocation(parseTree)
                        + ': Loop ends in irreconcilable contexts '
                        + contextToString(contextBefore) + ' and '
                        + contextToString(contextAfter));
              } else {
                throw new Error();
              }
            }
          }
          break;
        case 'tmpl':
          // Expect content of the form '#' + templateName
          var calleeBaseName = getCalleeName(parseTree);
          if (calleeBaseName) {
            if (!/__C\d+$/.test(calleeBaseName)) {
              var callee = getTemplateParseTree(calleeBaseName, context);
              if (callee) {
                inferences.calleeName[parseTree.parseTreeNodeId]
                    = callee.jqueryTemplateName;
                context = getTemplateOutputContext(callee, context, inferences);
              }
            }
          } else {
            if (DEBUG) {
              throw new Error(errorLocation(parseTree) + ': Malformed call');
            } else {
              throw new Error();
            }
          }
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
          // Do not add escaping directives if there is an existing one.
          if (!/^\s*(?:SAFEHTML_ESC\[\d+\]|noAutoescape)\s*\(/
              .test(parseTree[1])) {
            if (typeof escapingModes.firstEscMode === 'number') {
              var modes = [];
              modes[0] = escapingModes.firstEscMode;
              if (typeof escapingModes.secondEscMode === 'number') {
                modes[1] = escapingModes.secondEscMode;
              }
              inferences.escapingModes[parseTree.parseTreeNodeId] = modes;
            }
          }
          context = afterEscaping;
          break;
        default:
          for (; i < n; ++i) {
            context = process(parseTree[i], context);
          }
          break;
      }
      return context;
    }

    return process(templateBody, inputContext);
  }

  function getCalleeName(parseTree) {
    var m = parseTree[1].match(/(?:^|\))\s*#([^)\s]+)\s*$/);
    return m && m[1];
  }

  function callsTypable(parseTree) {
    var typeTag = parseTree[0];
    if (typeTag === 'tmpl' || typeTag === 'wrap') {
      var calleeName = getCalleeName(parseTree);
      if (calleeName && checkWhetherToType(calleeName)) {
        return TRUTHY;        
      }
    }
    for (var i = parseTree.length; --i >= 2;) {
      if (callsTypable(parseTree[i])) { return TRUTHY; }
    }
    return FALSEY;
  }

  var shouldTypeByName = {};
  function checkWhetherToType(templateName) {
    if (hop.call(shouldTypeByName, templateName)) {
      return shouldTypeByName[templateName];
    }
    var template = parsedTemplates[templateName];
    if (template) {
      for (var i = template.length; --i >= 0;) {
        if ('noAutoescape' === template[i][0]) {
          shouldTypeByName[templateName] = FALSEY;
          return shouldTypeByName[templateName] = callsTypable(template);
        }
      }
      return shouldTypeByName[templateName] = TRUTHY;
    }
    return void 0;
  }

  for (var templateName in parsedTemplates) {
    if (hop.call(parsedTemplates, templateName)) {
      checkWhetherToType(templateName);
    }
  }

  // Type each template.
  for (var templateName in shouldTypeByName) {
    if (TRUTHY === shouldTypeByName[templateName]) {
      getTemplateOutputContext(
          parsedTemplates[templateName], STATE_HTML_PCDATA, inferences);
    }
  }

  var shouldSanitize;

  // Apply the changes suggested in inferences.
  function mutate(parseTreeNode) {
    var id = parseTreeNode.parseTreeNodeId;
    switch (parseTreeNode[0]) {
      case 'noAutoescape':
        shouldSanitize = FALSEY;
        return '';
      case '$':  // Add escaping directives.
        if (shouldSanitize) {
          var escapingModes = inferences.escapingModes[id];
          if (escapingModes) {
            var expr = parseTreeNode[1];
            for (var i = 0; i < escapingModes.length; ++i) {
              expr = 'SAFEHTML_ESC[' + escapingModes[i] + '](' + expr + ')';
            }
            parseTreeNode[1] = expr;
          }
        }
        break;
      case 'tmpl':  // Rewrite calls in context.
        var calleeName = inferences.calleeName[id];
        if (calleeName) {
          // The form of a {{tmpl}}'s content is
          //    ['(' [<data>[, <options>]] ')'] '#'<name>
          parseTreeNode[1] = parseTreeNode[1].replace(
              /\s*#[^)\s]+\s*$/, ' #' + calleeName);
        }
        break;
    }
    for (var i = 2, n = parseTreeNode.length; i < n; ++i) {
      var child = parseTreeNode[i];
      if (typeof child !== 'string') {
        parseTreeNode[i] = mutate(child);
      }
    }
    return parseTreeNode;
  }

  // Includes 
  for (var templateName in parsedTemplates) {
    if (hop.call(parsedTemplates, templateName)) {
      shouldSanitize = TRUTHY;
      mutate(parsedTemplates[templateName]);
    }
  }

  return parsedTemplates;
}

window['SAFEHTML_ESC'] = SANITIZER_FOR_ESC_MODE;
