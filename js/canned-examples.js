// Examples that illustrate use cases that show up in a dropdown in the REPL.


var cannedExamples = [
  { name: "Python Raw String",
    sugaryJs: "raw`foo\\nbar`",
    result: 'foo\\nbar'
  },

  { name: "Safe HTML",
    sugaryJs: (
      'url = "http://example.com/",\n'
      + 'message = query = "Hello & Goodbye",\n'
      + 'color = "red",\n'
      + 'safehtml`<a href="${url}?q=${query}" onclick=alert(${message})'
      + ' style="color: ${color}">${message}</a>`'),
    result: (
      '<a href="http://example.com/?q=Hello%20%26%20Goodbye"'
      + ' onclick=alert(&#39;Hello&#32;\\x26&#32;Goodbye&#39;)'
      + ' style="color: red">Hello &amp; Goodbye</a>')
  },

  { name: "Safe HTML with bad inputs",
    sugaryJs: (
      'url = "javascript:alert(1337)//",\n'
      + 'query = "\\"><script>alert(13)</script>",\n'
      + 'message = \'"Hello World\',\n'
      + 'color = "expression(alert(1337))",\n'
      + 'message2 = "<script>alert(1337)</script>",\n'
      + 'safehtml`<a href="${url}?q=${query}" onclick=alert(${message})'
      + ' style="color: ${color}">${message2}</a>`'),
    result: (
      '<a href="#zSafehtmlz?q=%22%3E%3Cscript%3Ealert%2813%29%3C%2Fscript%3E"'
      + ' onclick=alert(&#39;\\x22Hello&#32;World&#39;)'
      + ' style="color: zSafehtmlz">&lt;script&gt;alert(1337)&lt;/script&gt;</a>')
  },

  { name: "Number and Date formatting",
    sugaryJs: (
      'n = 42,\n'
      + 'question = "life, the universe, everything",\n'
      + 'msg`The answer to $question is $n:+.6  as of ${new Date(2011, 2, 14)}:yyyy-MM-dd`'),
    result: (
      'The answer to life, the universe, everything is +42.0000 as of 2011-03-14')
  },

  { name: "Safe HTML messages",
    sugaryJs: (
      'n = 42,\n'
      + 'message = "I <3 Ponies!",\n'
      + 'html_msg`<a href="/foo?q=${n}:+.6">${message}</a>`'
      ),
    result: '<a href="/foo?q=%2B42.0000">I &lt;3 Ponies!</a>'
  },

  { name: "Dynamic regular expression",
    sugaryJs: (
      'price = "-$123.50",\n'
      + 're`^price\\s*:\\s*$price\\b:gi`'),
    result: '/^price\\s*:\\s*\\-\\$123\\.50\\b/gi'
  }];
