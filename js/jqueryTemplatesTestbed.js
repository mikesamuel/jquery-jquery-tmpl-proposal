// Takes the HTML textarea, finds templates in script tags, and type checks them
// displaying the resulting template source in the output, and registering named
// templates with jQuery.
function sanitize() {
  var inputContainer = $('#htmlContent')[0];
  var outputContainer = $('#sanitizer-output');
  var runButtons = $('#runbuttons');
  var jqueryTemplateText = inputContainer.value;

  var templateName = null, sanitizedTemplateText = null;

  var templateOrder = [];

  try {
    // Find <script type="text/x-jquery-tmpl">...<\/script> blocks.
    var scriptRe = /<script((?:[^>"']|"[^"]*"|'[^']*')*)>((?:[^<]+|<(?!=!--|\/script)|<!--[\s\S]*?-->)*)<\/script[^>]*>/ig;
    var parsed = jqueryTemplateText.match(scriptRe);
    var templates = {};
    for (var i = 0, n = parsed ? parsed.length : 0; i < n; ++i) {
      scriptRe.lastIndex = 0;
      var m = scriptRe.exec(parsed[i]);
      var attrs = m[1], body = m[2].replace(/^\n[ \t]*|\n[ \t]*$/g, '');
      if (/\btype\s*=\s*["']?\s*text\/x-jquery-tmpl\b/i.test(attrs)) {
        var name = 'template' + i;
        var m2 = attrs.match(/\bid\s*=\s*["']?([\w.:-]+)/i);
        if (m2) { name = m2[1]; }
        templates[name] = body;
      }
      templateOrder.push(name);
    }

    var sanitizedTemplates = sanitizeTemplates(templates);

    // Present the output templates, including clones, in the order that
    // the base templates wer declared.
    var outputTemplateNames = [];
    for (templateName in sanitizedTemplates) {
      if (Object.hasOwnProperty.call(sanitizedTemplates, templateName)) {
        outputTemplateNames.push(templateName);
      }
    }
    outputTemplateNames.sort(
      function (a, b) {
        var baseOrder = templateOrder.indexOf(a.replace(/__C\d+$/, ''))
            - templateOrder.indexOf(b.replace(/__C\d+$/, ''));
        return baseOrder
            || (a.length - b.length)
            || ((a < b) ? -1 : (a > b) ? 1 : 0);
      });

    runButtons.empty();

    var outputHtml = $('<div/>');
    var outputTemplateText = {};
    var firstRunButton;
    for (var i = 0, n = outputTemplateNames.length; i < n; ++i) {
      templateName = outputTemplateNames[i];
      sanitizedTemplateText = renderJqueryTemplate(
          sanitizedTemplates[templateName])
          .replace(/(\{\{(else|tmpl)(?:\}?[^}])*\}\})\{\{\/\2\}\}/g, '$1');
      var sanitizedTemplate = $.template(templateName, sanitizedTemplateText);
      $('<h3/>').text(templateName).appendTo(outputHtml);
      $('<pre/>').html(templateTextToDisplayableHtml(sanitizedTemplateText))
          .appendTo(outputHtml);
      if (templateOrder.indexOf(templateName) >= 0) {
        var runButton = $('<button/>', {
              value: templateName,
              "class": 'arrowbtn'
            }).click((function (templateName) {
                        return function () { runTemplate(templateName); };
                      })(templateName))
            .text('\u21f0');
        $('<br/>').appendTo(runButton);
        $('<small/>').text(templateName).appendTo(runButton);
        runButton.appendTo(runButtons);
        if (!firstRunButton) { firstRunButton = runButton; }
      }

      // Create an element with the given name and set its tmpl property so
      // that {{tmpl}} calls work.
      // {{tmpl}} calls seem to search the DOM for any elements that have
      // a template name like #foo as in all the examples on the doc page
      // and do not fallback (as documented) to properties of $.template.
      var inDom = $('#' + templateName);
      if (inDom.length && 'SCRIPT' !== inDom[0].tagName) {
        inDom.tmpl = (function() {
                        return function () {
                          return sanitizedTemplate.apply($.template, arguments);
                        };
                      })();
      } else {
        inDom.detach();
        inDom = $('<script>', { id: templateName, type: 'text/x-jquery-tmpl' })
            .text(sanitizedTemplateText);
        inDom.appendTo(document.body);
      }
    }
    outputContainer.empty();
    outputHtml.appendTo(outputContainer);

    if (firstRunButton) { firstRunButton.focus(); }

    // scroll the output into view.
    $('html, body').animate({
      scrollTop: outputContainer.offset().top,
      scrollLeft: outputContainer.offset().left
    }, 1000);
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.log(
          'sanitizedTemplate ' + templateName + '=' + sanitizedTemplateText);
    }
    return showError(e, outputContainer);
  }
}

// Title text for escaping declarations in the template output box.
var ESC_MODE_HELP = {};
ESC_MODE_HELP[escapeHtml.name] = '1<2 \u2192 1&lt;2';
ESC_MODE_HELP[escapeHtmlRcdata.name] = 'text to RCDATA';
ESC_MODE_HELP[escapeHtmlAttribute.name] = 'text to attribute value';
ESC_MODE_HELP[escapeHtmlAttributeNospace.name]
    = 'text to unquoted attribute value';
ESC_MODE_HELP[filterHtmlElementName.name] = 'filters element names';
ESC_MODE_HELP[filterHtmlAttribute.name] = 'filters attribute names';
ESC_MODE_HELP[escapeJsString.name] = 'fo\o \u2192 fo\\o';
ESC_MODE_HELP[escapeJsValue.name] = 'fo\o \u2192 "fo\\o"';
ESC_MODE_HELP[escapeJsRegex.name] = 'a+b \u2192 a\+b';
ESC_MODE_HELP[escapeCssString.name] = 'fo\o \u2192 fo\\o for CSS';
ESC_MODE_HELP[filterCssValue.name] = 'filters CSS values';
ESC_MODE_HELP[escapeUri.name] = '1<2 \u2912 1%C32';
ESC_MODE_HELP[normalizeUri.name] = 'normalizes quotes in URIs';
ESC_MODE_HELP[filterNormalizeUri.name]
    = 'normalizes URI and rejects javascript:';

// Converts template text to displayable HTML.
function templateTextToDisplayableHtml(templateText) {
  templateText = escapeHtml(templateText);
  templateText = templateText.replace(
      /[{(]((?:escape|normalize|filter)\w+)(?=\()/g,
      function (_, sanitizer) {
        return '<ins class="sanitizer"'
            + ' title="' + escapeHtml(ESC_MODE_HELP[sanitizer] || '') + '">'
            + _ + '</ins>';
      });
  return templateText;
}

// Runs the template specified in the select dropdown with the JSON in the
// data box.
function runTemplate(templateName) {
  var outputContainer = $('#template-output');
  var data;
  try {
    var dataInput = $('#data')[0];
    data = JSON.parse(
      fixupJson(dataInput.value),
      function (key, value) {
        // Make sure that any sanitized content specified as
        //    { content: '<b>foo</b>', contentKind: 0 }
        // has a toString() method that returns the content string.
        if (typeof value === 'object'
            && 'content' in value
            && value['contentKind'] === (value['contentKind'] | 0)) {
          value.toString = SanitizedContent.prototype.toString;
        }
        return value;
      });
  } catch (e) {
    return showError(e, outputContainer);
  }

  var templateResult;
  try {
    templateResult = $.tmpl(templateName, data);
  } catch (e) {
    return showError(e, outputContainer);
  }

  var wrapper = $('<div/>');
  templateResult.appendTo(wrapper);
  var resultHtml = '' + wrapper.html();

  outputContainer.empty();
  $('<h3/>').text('Result for ' + templateName).appendTo(outputContainer);
  var resultContainer = $('<p/>');
  templateResult.appendTo(resultContainer);
  resultContainer.appendTo(outputContainer);
  $('<h3/>').text('Result source').appendTo(outputContainer);
  $('<pre/>').text(resultHtml).appendTo(outputContainer);

  $('html, body').animate({
    scrollTop: outputContainer.offset().top,
    scrollLeft: outputContainer.offset().left
  }, 1000);
}

// Shows the given exception in the given output box.
function showError(err, container) {
  container.empty();
  $('<pre/>', { 'class': 'error' })
      .text(err && ((err.description || err.message || err)
                    + (err.stack ? '\n\n' + err.stack : '')))
      .appendTo(container);
  $('html, body').animate({
    scrollTop: container.offset().top
  }, 1000);
  throw err;  // Let it reach the console as normal.
}

// Show a permalink to the current state of the page.
function showLink() {
  var queryParts = [];
  function inputToLink() {
    if (this.id && this.id !== 'permalink') {
      queryParts.push(
          encodeURIComponent(this.id) + '=' + encodeURIComponent(this.value));
    }
  }
  $('textarea').each(inputToLink);
  var url = location.href.replace(/[#?][\s\S]*$/, '')
      + '?' + queryParts.join('&');
  var permalink = $('#permalink');
  permalink.text(url);
  permalink.fadeIn(500, null, function () { this.focus(); this.select(); });
}

// Look at the URL and populate the textareas.
function populateInputsFromLink() {
  var attribs = {};
  if (location.search) {
    location.search.replace(/[?&]([^&=]+)=([^&#]*)/g, function (_, k, v) {
      var id = decodeURIComponent(k);
      var value = decodeURIComponent(v);
      $('#' + id).each(function () {
        this.value = value;
      });
    });
  }
}

var CANNED_EXAMPLES = [
  {
    desc: 'Safe substitution into scripts',
    html: [
      '<!--',
      '  - ${...} can appear many places inside JavaScript',
      '  - and the autosanitizer chooses an appropriate',
      '  - sanitizer for each.',
      ' -->',
      '<script type="text/x-jquery-tmpl" id="main">',
      '<button onclick="',
      '    sendMessageTo(',
      '        \'${name}@${domain}\',',
      '        ${numRetries}',
      '        ${message})',
      '    ">',
      '  Message ${name}',
      '</button>',
      '</script>'
      ],
    data: {
      name: "Patrick 'The Apostrophated' O'Reilly",
      domain: "example.com",
      message: "Hello, <World>!",
      numRetries: 3
    }
  },
  {
    desc: 'Safely generated CSS',
    html: [
      '<!--',
      '  - ${...} can appear many places inside CSS and the',
      '  - autosanitizer chooses an appropriate sanitizer',
      '  - for each.',
      '  - Substitutions that could affect the protocol of',
      '  - the URL, e.g. to specify javascript: degrade',
      '  - gracefully.',
      ' -->',
      '<script type="text/x-jquery-tmpl" id="main">',
      '<style>',
      '  p${class1} { border-${bidi}-color: ${okColor} }',
      '  p${class2} { border-${bidi}-color: ${evilColor} }',
      '  ${id1} { background: url("${okUrl}") }',
      '  ${id2} { background: url("${evilUrl}") }',
      '</style>',
      '</script>'
    ],
    data: {
      bidi: 'left',
      class1: '.class1', class2: '.class2', id1: '#foo',
      id2: '#bar',
      okColor: '#48d', evilColor: 'expression(alert(1337))',
      okUrl: 'http://example.com/animage.png',
      evilUrl: 'javascript:alert%281337%29'
    }
  },
  {
    desc: 'Dual use template',
    html: [
      '<!--',
      '  - The same template is called in two different contexts.',
      '  - The first time it is called where a JavaScript value is expected,',
      '  - and the second time where HTML tags and text are expected.',
      ' -->',
      '<script type="text/x-jquery-tmpl" id="aliceInJQuery">',
      '  <button onclick="alert(\'Viewing {{tmpl "#chapter"}}\')">',
      '    Say Chapter',
      '  </button>',
      '  <p>...</p>',
      '  <center><small>{{tmpl "#chapter"}}</small></center>',
      '</script>',
      '',
      '<script type="text/x-jquery-tmpl" id="chapter">',
      '${index} of ${count} : ${title}',
      '</script>'
    ],
    data: {
      index: 9, count: 12, title: '"IX. The Mock >Turtle\'s< Party"'
    }
  },
  {
    desc: 'Pre-sanitized HTML',
    html: [
      '<!--',
      '  - The names list can contain a mixture of plain text and ',
      '  - pre-sanitized HTML.  The plain text is escaped, the',
      '  - pre-sanitized HTML is not over-escaped, and tags are',
      '  - not emitted inside attributes.',
      ' -->',
      '<script type="text/x-jquery-tmpl" id="main">',
      '  <ul>',
      '    {{each names}}',
      '      <li title="${this}">${this}</li>',
      '    {{/each}}',
      '  </ul>',
      '</script>'
      ],
    data: {
       names: ["Alice the oft \"Quoted\"",
               { content: "Bob the <b>bold</b>", contentKind: 0 }]
    }
  }
];

function populateExampleDropdown() {
  var exampleDropdown = $('#exampleList');
  $.each(CANNED_EXAMPLES,
         function (_, example) {
           $('<button>').click(prefillExample(example))
               .text(example.desc).appendTo(exampleDropdown);
         });
}

function prefillExample(example) {
  return function () {
    $('#htmlContent').text(example.html.join('\n'));
    $('#data').text(fixupJson(JSON.stringify(example.data)));
    $('#sanitize-button')[0].focus();
  };
}

function noAutoescape(x) { return x; }
