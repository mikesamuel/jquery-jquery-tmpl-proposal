// An exports file, useful for compiling contextUpdate to a standalone JSCompiler library.
// Not needed for normal usage, or if all clients of contextUpdate.js are in the same
// compilation unit.
// Requires contextUpdate.js

this['rawTextContextUpdater'] = {
    'processRawText': processRawText,
    'ESC_MODE_FOR_STATE': ESC_MODE_FOR_STATE,
    'STATE_HTML_PCDATA': STATE_HTML_PCDATA,
    'STATE_HTML_RCDATA': STATE_HTML_RCDATA,
    'STATE_HTML_BEFORE_TAG_NAME': STATE_HTML_BEFORE_TAG_NAME,
    'STATE_HTML_TAG_NAME': STATE_HTML_TAG_NAME,
    'STATE_HTML_TAG': STATE_HTML_TAG,
    'STATE_HTML_ATTRIBUTE_NAME': STATE_HTML_ATTRIBUTE_NAME,
    'STATE_HTML_BEFORE_ATTRIBUTE_VALUE': STATE_HTML_BEFORE_ATTRIBUTE_VALUE,
    'STATE_HTML_COMMENT': STATE_HTML_COMMENT,
    'STATE_HTML_NORMAL_ATTR_VALUE': STATE_HTML_NORMAL_ATTR_VALUE,
    'STATE_CSS': STATE_CSS,
    'STATE_CSS_COMMENT': STATE_CSS_COMMENT,
    'STATE_CSS_DQ_STRING': STATE_CSS_DQ_STRING,
    'STATE_CSS_SQ_STRING': STATE_CSS_SQ_STRING,
    'STATE_CSS_URI': STATE_CSS_URI,
    'STATE_CSS_DQ_URI': STATE_CSS_DQ_URI,
    'STATE_CSS_SQ_URI': STATE_CSS_SQ_URI,
    'STATE_JS': STATE_JS,
    'STATE_JS_LINE_COMMENT': STATE_JS_LINE_COMMENT,
    'STATE_JS_BLOCK_COMMENT': STATE_JS_BLOCK_COMMENT,
    'STATE_JS_DQ_STRING': STATE_JS_DQ_STRING,
    'STATE_JS_SQ_STRING': STATE_JS_SQ_STRING,
    'STATE_JS_REGEX': STATE_JS_REGEX,
    'STATE_URI': STATE_URI,
    'STATE_ERROR': STATE_ERROR,
    'ESC_MODE_ESCAPE_HTML': ESC_MODE_ESCAPE_HTML,
    'ESC_MODE_ESCAPE_HTML_RCDATA': ESC_MODE_ESCAPE_HTML_RCDATA,
    'ESC_MODE_ESCAPE_HTML_ATTRIBUTE': ESC_MODE_ESCAPE_HTML_ATTRIBUTE,
    'ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE': ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE,
    'ESC_MODE_FILTER_HTML_IDENT': ESC_MODE_FILTER_HTML_IDENT,
    'ESC_MODE_ESCAPE_JS_STRING': ESC_MODE_ESCAPE_JS_STRING,
    'ESC_MODE_ESCAPE_JS_VALUE': ESC_MODE_ESCAPE_JS_VALUE,
    'ESC_MODE_ESCAPE_JS_REGEX': ESC_MODE_ESCAPE_JS_REGEX,
    'ESC_MODE_ESCAPE_CSS_STRING': ESC_MODE_ESCAPE_CSS_STRING,
    'ESC_MODE_FILTER_CSS_VALUE': ESC_MODE_FILTER_CSS_VALUE,
    'ESC_MODE_ESCAPE_URI': ESC_MODE_ESCAPE_URI,
    'ESC_MODE_NORMALIZE_URI': ESC_MODE_NORMALIZE_URI,
    'ESC_MODE_FILTER_NORMALIZE_URI': ESC_MODE_FILTER_NORMALIZE_URI,
    'ESC_MODE_NO_AUTOESCAPE': ESC_MODE_NO_AUTOESCAPE
};
