// Takes the HTML textarea, finds templates in script tags, and type checks them
// displaying the resulting template source in the output, and registering named
// templates with jQuery.
function sanitize() {
  var inputContainer = $('#htmlContent')[0];
  var outputContainer = $('#sanitizer-output');
  var templateSelect = $('#template-select');
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

    var sanitizedTemplates = contextuallyEscapeTemplates(templates);

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
        return baseOrder || (a.length - b.length);
      });

    var outputHtml = $('<div/>');
    var outputTemplateText = {};
    for (var i = 0, n = outputTemplateNames.length; i < n; ++i) {
      templateName = outputTemplateNames[i];
      sanitizedTemplateText = renderJQueryTemplate(
          sanitizedTemplates[templateName])
          .replace(/(\{\{(else|tmpl)(?:\}?[^}])*\}\})\{\{\/\2\}\}/g, '$1');
      var isNew = !Object.hasOwnProperty($.template, templateName);
      var sanitizedTemplate = jQuery.template(
          templateName, sanitizedTemplateText);
      $('<h3/>').text(templateName).appendTo(outputHtml);
      $('<pre/>').html(markupSanitizedTemplates(sanitizedTemplateText))
          .appendTo(outputHtml);
      if (isNew) {
        $('<option/>', { value: templateName, title: sanitizedTemplateText })
            .text(templateName).appendTo(templateSelect);
      }
    }
    outputContainer.empty();
    outputHtml.appendTo(outputContainer);

    // scroll the output into view.
    $('html, body').animate({
      scrollTop: outputContainer.offset().top
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
var ESC_MODE_HELP = [];
ESC_MODE_HELP[ESC_MODE_ESCAPE_HTML] = 'text \u2192 HTML';
ESC_MODE_HELP[ESC_MODE_ESCAPE_HTML_RCDATA] = 'text \u2192 RCDATA';
ESC_MODE_HELP[ESC_MODE_ESCAPE_HTML_ATTRIBUTE] = 'text \u2192 HTML attr';
ESC_MODE_HELP[ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE]
    = 'text \u2192 unquoted attr';
ESC_MODE_HELP[ESC_MODE_FILTER_HTML_ELEMENT_NAME] = 'filters element names';
ESC_MODE_HELP[ESC_MODE_FILTER_HTML_ATTRIBUTE] = 'filters attribute names';
ESC_MODE_HELP[ESC_MODE_ESCAPE_JS_STRING] = 'fo\o \u2192 fo\\o';
ESC_MODE_HELP[ESC_MODE_ESCAPE_JS_VALUE] = 'foo \u2192 "foo"';
ESC_MODE_HELP[ESC_MODE_ESCAPE_JS_REGEX] = 'a+b \u2192 a\+b';
ESC_MODE_HELP[ESC_MODE_ESCAPE_CSS_STRING] = 'fo\o \u2192 fo\\o for CSS';
ESC_MODE_HELP[ESC_MODE_FILTER_CSS_VALUE] = 'filter CSS values';
ESC_MODE_HELP[ESC_MODE_ESCAPE_URI] = 'text \u2192 URI';
ESC_MODE_HELP[ESC_MODE_NORMALIZE_URI] = 'normalizes quotes in URIs';
ESC_MODE_HELP[ESC_MODE_FILTER_NORMALIZE_URI]
    = 'normalizes URI and rejects javascript:';
ESC_MODE_HELP[ESC_MODE_NO_AUTOESCAPE] = 'does nothing';

// Adds help text to 
function markupSanitizedTemplates(templateText) {
  templateText = escapeHtml(templateText);
  templateText = templateText.replace(
      /\bSAFEHTML_ESC\[(\d+)\]/g,
      function (_, escMode) {
        return '<abbr class="escapingMode"'
            + ' title="' + escapeHtml(ESC_MODE_HELP[escMode] || '') + '">'
            + _ + '</abbr>';
      });
  return templateText;
}

// Runs the template specified in the select dropdown with the JSON in the
// data box.
function runTemplate() {
  var templateName = $('#template-select')[0].value;
  var outputContainer = $('#template-output');
  var data;
  try {
    var dataInput = $('#data')[0];
    data = JSON.parse(
      fixupJson(dataInput.value),
      function (key, value) {
        if (typeof value === 'object'
            && 'content' in value
            && value.contentKind === (value.contentKind | 0)) {
          value.toString = function () { return this.content; };
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
  templateResult.appendTo(outputContainer);
  $('<h3/>').text('Result source').appendTo(outputContainer);
  $('<pre/>').text(resultHtml).appendTo(outputContainer);

  $('html, body').animate({
    scrollTop: outputContainer.offset().top
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
      '<script type="text/x-jquery-tmpl" id="main">',
      '  <button onclick="alert(\'Viewing {{tmpl "#page"}}\')">?</button>',
      '  <p>...</p>',
      '  <center><small>{{tmpl "#page"}}</small></center>',
      '</script>',
      '',
      '<script type="text/x-jquery-tmpl" id="page">',
      '${index} of ${count} : ${title}',
      '</script>'
    ],
    data: {
      index: 7, count: 20, title: '"VII. A mad tea-party"'
    }
  },
  {
    desc: 'Pre-sanitized HTML',
    html: [
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
         function (index, value) {
           $('<option/>', { value: index }).text(value.desc)
             .appendTo(exampleDropdown);
         });
}

function prefillExample(exampleIndex) {
  var example = CANNED_EXAMPLES[exampleIndex];
  if (example) {
    $('#htmlContent').text(example.html.join('\n'));
    $('#data').text(fixupJson(JSON.stringify(example.data)));
  }
}