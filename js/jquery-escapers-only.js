// If jQuery templates are rewritten ahead of time, then the only bit needed is
// the escaper functions.

if (COMPILED) {
  window['$']['extend'](window['$']['encode'], SANITIZER_FOR_ESC_MODE);
} else {
  window['$']['each'](SANITIZER_FOR_ESC_MODE,
      function (i, value) {
        if (value && !value['name']) {
          value['name'] = ('' + value).match(/^function\s+(\w+)/)[0];
        }
      });
}
