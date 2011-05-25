//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

function interleave( literalParts, values ) {
	var arr = [ literalParts[ 0 ] ];
	var n = values.length;
	for ( var i = 0, j = 0; i < n; ) {
		arr[ ++j ] = values[ i ];
		arr[ ++j ] = literalParts[ ++i ];
	}
	return arr;
}

$.template(
		"test",
		"<a href=\"${url}?q=${query}\" onclick=alert(${msg})"
		+ " style=\"color: ${color}\">${linkText}</a>" );

function testSafeHtmlGoodInputs() {
	var data = {
		url: "http://www.google.com/search",
		query: "Hello World",
		msg: "Hello World",
		color: "red",
		linkText: "Hello & Goodbye"
	};
	assertEquals(
			"<a href=\"http://www.google.com/search?q=Hello%20World\""
			+ " onclick=alert(&#39;Hello&#32;World&#39;)"
			+ " style=\"color: red\">Hello &amp; Goodbye</a>",
			$.template( "test" ).tmpl( data ) );
}

function testSafeHtmlBadInputs() {
	var data = {
		url: "javascript:alert(1337)//",
		query: "\"><script>alert(13)</script>",
		msg: "\"Hello World",
		color: "expression(alert(1337))",
		linkText: "<script>alert(1337)</script>"
	};
	assertEquals(
			"<a href=\"#zSafehtmlz?q=%22%3E%3Cscript%3Ealert%2813%29%3C%2Fscript%3E\""
			+ " onclick=alert(&#39;\\x22Hello&#32;World&#39;)"
			+ " style=\"color: zSafehtmlz\">"
			+ "&lt;script&gt;alert(1337)&lt;/script&gt;</a>",
			$.template( "test" ).tmpl( data ) );
}

function testThunks() {
	var data = {
		url: "http://www.google.com/search",
		query: "Hello World",
		msg: function () { return "Hello World"; },
		color: { toString: function () { return "red"; } },
		linkText: "Hello & Goodbye"
	};
	assertEquals(
			"<a href=\"http://www.google.com/search?q=Hello%20World\""
			+ " onclick=alert(&#39;Hello&#32;World&#39;)"
			+ " style=\"color: red\">Hello &amp; Goodbye</a>",
			$.template( "test" ).tmpl( data ) );
}
