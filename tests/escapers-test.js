//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

var ASCII_CHARS = "";
for ( var i = 0; i < 0x80; ++i ) {
	ASCII_CHARS += String.fromCharCode( i );
}

/**
 * Strings that might change the parsing mode of scripts in which they are
 * embedded.
 */
var EMBEDDING_HAZARDS = [
			"</script", "</style", "<!--", "-->", "<![CDATA[", "]]>" ];

/**
 * Returns an object that coerces to the string "Hello, World!" the first time
 * it is coerced and throws an Error subsequenrly.
 * This helps us test that coercing methods always have a single consistent
 * view of the world.
 */
function makeFragileToString( value ) {
	value = String( value );
	var coerced = false;
	return {
		toString: function () {
			if ( coerced ) { throw new Error(); }
			coerced = true;
			return value;
		}
	};
}

function testEscapeJsString() {
	var escapeJsString = $.encode[ ESC_MODE_ESCAPE_JS_STRING ];

	// The minimal escapes.
	// Do not remove anything from this set without talking to your friendly local
	// security-team@.
	assertEquals(
			"\\u0000 \\u0022 \\u0027 \\\\ \\r \\n \\u2028 \\u2029",
			escapeJsString( "\u0000 \" \' \\ \r \n \u2028 \u2029" ) );

	for ( var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i ) {
		var hazard = EMBEDDING_HAZARDS[ i ];
		assertFalse( hazard, escapeJsString( hazard ).indexOf( hazard ) >= 0 );
	}

	// Check correctness of other Latins.
	var escapedAscii = (
			"\\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
			"\\u0008\\t\\n\\u000b\\f\\r\u000e\u000f" +
			"\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
			"\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
			" !\\u0022#$%\\u0026\\u0027()*+,-.\\/" +
			"0123456789:;\\u003c\\u003d\\u003e?" +
			"@ABCDEFGHIJKLMNO" +
			"PQRSTUVWXYZ[\\\\]^_" +
			"`abcdefghijklmno" +
			"pqrstuvwxyz{|}~\u007f" );

	assertEquals( escapedAscii, escapeJsString( ASCII_CHARS ) );

	assertEquals(
			"Hello, World!",
			escapeJsString( makeFragileToString( "Hello, World!" ) ) );
}

function testEscapeJsRegExpString() {
	var escapeJsRegex = $.encode[ ESC_MODE_ESCAPE_JS_REGEX ];

	// The minimal escapes.
	// Do not remove anything from this set without talking to your friendly local
	// security-team@.
	assertEquals(
			"\\u0000 \\u0022 \\u0027 \\\\ \\/ \\r \\n \\u2028 \\u2029" +
			// RegExp operators.
			" \\u0024\\u005e\\u002a\\u0028\\u0029\\u002d\\u002b\\u007b" +
			"\\u007d\\u005b\\u005d\\u007c\\u003f",
			escapeJsRegex(
					"\u0000 \" \' \\ / \r \n \u2028 \u2029" +
					" $^*()-+{}[]|?" ) );

	for ( var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i ) {
		var hazard = EMBEDDING_HAZARDS[ i ];
		assertFalse( hazard, escapeJsRegex( hazard ).indexOf( hazard ) >= 0 );
	}

	var escapedAscii = (
			"\\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
			"\\u0008\\t\\n\\u000b\\f\\r\u000e\u000f" +  // \b means word-break in JS.
			"\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
			"\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
			" !\\u0022#\\u0024%\\u0026\\u0027\\u0028\\u0029" +
			"\\u002a\\u002b\\u002c\\u002d\\u002e\\/" +
			"0123456789\\u003a;\\u003c\\u003d\\u003e\\u003f" +
			"@ABCDEFGHIJKLMNO" +
			"PQRSTUVWXYZ\\u005b\\\\\\u005d\\u005e_" +
			"`abcdefghijklmno" +
			"pqrstuvwxyz\\u007b\\u007c\\u007d~\u007f" );
	assertEquals( escapedAscii, escapeJsRegex( ASCII_CHARS ) );

	assertEquals(
			"Hello\\u002c World!",
			escapeJsRegex( makeFragileToString( "Hello, World!" ) ) );
}

function testEscapeJsValue() {
	var escapeJsValue = $.encode[ ESC_MODE_ESCAPE_JS_VALUE ];

	assertEquals(  // Adds quotes.
			"'Don\\u0027t run with \\u0022scissors\\u0022.\\n'",
			escapeJsValue( "Don't run with \"scissors\".\n" ) );
	assertEquals( " 4 ", escapeJsValue( 4 ) );
	assertEquals( " 4.5 ", escapeJsValue( 4.5 ) );
	assertEquals( " true ", escapeJsValue( true ) );
	assertEquals( " null ", escapeJsValue( null ) );

	assertEquals(
			"'Hello, World!'",
			escapeJsValue( makeFragileToString( "Hello, World!" ) ) );
}

function testEscapeCssString() {
	var escapeCssString = $.encode[ ESC_MODE_ESCAPE_CSS_STRING ];

	// The minimal escapes.
	// Do not remove anything from this set without talking to your friendly local
	// security-team@.
	assertEquals(
			"\\0  \\22  \\27  \\5c  \\a  \\c  \\d ",
			escapeCssString( "\u0000 \" \' \\ \n \u000c \r" ) );

	for ( var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i ) {
		var hazard = EMBEDDING_HAZARDS[ i ];
		assertFalse( hazard, escapeCssString( hazard ).indexOf( hazard ) >= 0 );
	}

	var escapedAscii = (
			"\\0 \u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
			"\\8 \\9 \\a \\b \\c \\d \u000e\u000f" +
			"\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
			"\u0018\u0019\u001A\u001B\u001C\u001D\u001E\u001F" +
			" !\\22 #$%\\26 \\27 \\28 \\29 \\2a +,-.\\2f " +
			"0123456789\\3a \\3b \\3c \\3d \\3e ?" +
			"\\40 ABCDEFGHIJKLMNO" +
			"PQRSTUVWXYZ[\\5c ]^_" +
			"`abcdefghijklmno" +
			"pqrstuvwxyz\\7b |\\7d ~\u007f" );
	assertEquals( escapedAscii, escapeCssString( ASCII_CHARS ) );

	assertEquals(
			"Hello, World!",
			escapeCssString( makeFragileToString( "Hello, World!" ) ) );
}

function testFilterCssValue() {
	var filterCssValue = $.encode[ ESC_MODE_FILTER_CSS_VALUE ];

	assertEquals( "33px", filterCssValue( "33px" ) );
	assertEquals( "-.5em", filterCssValue( "-.5em" ) );
	assertEquals( "inherit", filterCssValue( "inherit" ) );
	assertEquals( "display", filterCssValue( "display" ) );
	assertEquals( "none", filterCssValue( "none" ) );
	assertEquals( "#id", filterCssValue( "#id" ) );
	assertEquals( ".class", filterCssValue( ".class" ) );
	assertEquals( "red", filterCssValue( "red" ) );
	assertEquals( "#aabbcc", filterCssValue( "#aabbcc" ) );
	assertEquals( "zSafehtmlz", filterCssValue( "expression" ) );
	assertEquals( "zSafehtmlz", filterCssValue( "Expression" ) );
	assertEquals( "zSafehtmlz", filterCssValue( "\\65xpression" ) );
	assertEquals( "zSafehtmlz", filterCssValue( "\\65 xpression" ) );
	assertEquals( "zSafehtmlz", filterCssValue( "-moz-binding" ) );
	assertEquals(
			"zSafehtmlz",
			filterCssValue( "</style><script>alert('foo')</script>/*" ) );

	for ( var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i ) {
		var hazard = EMBEDDING_HAZARDS[ i ];
		assertFalse( hazard, filterCssValue( hazard ).indexOf( hazard ) >= 0 );
	}

	assertEquals(
			"zSafehtmlz",
			filterCssValue( makeFragileToString( "Hello, World!" ) ) );
	assertEquals(
			"Hello-World",
			filterCssValue( makeFragileToString( "Hello-World" ) ) );
}

function testFilterHtmlAttribute() {
	var filterHtmlAttribute = $.encode[ ESC_MODE_FILTER_HTML_ATTRIBUTE ];

	assertEquals( "dir", filterHtmlAttribute( "dir" ) );
	assertEquals(
			"zSafehtmlz", filterHtmlAttribute( "><script>alert('foo')</script" ) );
	assertEquals( "zSafehtmlz", filterHtmlAttribute( "style" ) );
	assertEquals( "zSafehtmlz", filterHtmlAttribute( "onclick" ) );
	assertEquals( "zSafehtmlz", filterHtmlAttribute( "href" ) );
	assertEquals( "dir=\"ltr\"", filterHtmlAttribute( "dir=ltr" ) );

	for ( var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i ) {
		var hazard = EMBEDDING_HAZARDS[ i ];
		assertFalse( hazard, filterHtmlAttribute( hazard ).indexOf( hazard ) >= 0 );
	}

	assertEquals(
			"zSafehtmlz",
			filterHtmlAttribute( makeFragileToString( "Hello=World" ) ) );
	assertEquals(
			"title",
			filterHtmlAttribute( makeFragileToString( "title" ) ) );
}

function testFilterHtmlElementName() {
	var filterHtmlElementName = $.encode[ ESC_MODE_FILTER_HTML_ELEMENT_NAME ];

	assertEquals( "h1", filterHtmlElementName( "h1" ) );
	assertEquals( "zSafehtmlz", filterHtmlElementName( "script" ) );
	assertEquals( "zSafehtmlz", filterHtmlElementName( "style" ) );
	assertEquals( "zSafehtmlz", filterHtmlElementName( "SCRIPT" ) );
	assertEquals(
			"zSafehtmlz", filterHtmlElementName( "><script>alert('foo')</script" ) );
	assertEquals( "zSafehtmlz", filterHtmlElementName( "<h1>" ) );

	for ( var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i ) {
		var hazard = EMBEDDING_HAZARDS[ i ];
		assertFalse(
				hazard, filterHtmlElementName( hazard ).indexOf( hazard ) >= 0 );
	}

	assertEquals(
			"zSafehtmlz",
			filterHtmlElementName( makeFragileToString( "script" ) ) );
	assertEquals(
			"h1",
			filterHtmlElementName( makeFragileToString( "h1" ) ) );
}

function testEscapeUri() {
	var escapeUri = $.encode[ ESC_MODE_ESCAPE_URI ];

	// The minimal escapes.
	// Do not remove anything from this set without talking to your friendly local
	// security-team@.
	assertEquals(
			"%00%0A%0C%0D%22%23%26%27%2F%3A%3D%3F%40%28%29%3B%5B%5D%7B%7D",
			escapeUri( "\u0000\n\f\r\"#&'/:=?@();[]{}" ) );

	for ( var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i ) {
		var hazard = EMBEDDING_HAZARDS[ i ];
		assertFalse( hazard, escapeUri( hazard ).indexOf( hazard ) >= 0 );
	}

	var escapedAscii = (
			"%00%01%02%03%04%05%06%07%08%09%0A%0B%0C%0D%0E%0F" +
			"%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F" +
			"%20!%22%23%24%25%26%27%28%29*%2B%2C-.%2F" +
			"0123456789%3A%3B%3C%3D%3E%3F" +
			"%40ABCDEFGHIJKLMNO" +
			"PQRSTUVWXYZ%5B%5C%5D%5E_" +
			"%60abcdefghijklmno" +
			"pqrstuvwxyz%7B%7C%7D~%7F" );
	assertEquals( escapedAscii, escapeUri( ASCII_CHARS ) );
	// Test full-width.  The two characters at the right are a full-width '#' and
	// ':'.
	assertEquals( "%EF%BC%83%EF%BC%9A", escapeUri( "\uff03\uff1a" ) );
	// Test other unicode codepoints.
	assertEquals( "%C2%85%E2%80%A8", escapeUri( "\u0085\u2028" ) );

	assertEquals(
			"Hello%2C%20World!",
			escapeUri( makeFragileToString( "Hello, World!" ) ) );
}

function testNormalizeUriAndFilterNormalizeUri() {
	var normalizeUri = $.encode[ ESC_MODE_NORMALIZE_URI ];
	var filterNormalizeUri = $.encode[ ESC_MODE_FILTER_NORMALIZE_URI ];

	// The minimal escapes.
	// Do not remove anything from this set without talking to your friendly local
	// security-team@.
	var minimal = "\u0000\n\f\r\"'(){}";
	for ( var i = 0, n = minimal.length; i < n; ++i ) {
		var ch = minimal.charAt( i );
		assertTrue( ch + " -> " + normalizeUri( ch ),
							 /^%[0-9a-f]{2}$/i.test( normalizeUri( ch ) ) );
	}

	for ( var i = 0, n = EMBEDDING_HAZARDS.length; i < n; ++i ) {
		var hazard = EMBEDDING_HAZARDS[ i ];
		assertFalse( hazard, normalizeUri( hazard ).indexOf( hazard ) >= 0 );
		assertFalse( hazard, filterNormalizeUri( hazard ).indexOf( hazard ) >= 0 );
	}

	var escapedAscii = (
			"%00%01%02%03%04%05%06%07%08%09%0A%0B%0C%0D%0E%0F" +
			"%10%11%12%13%14%15%16%17%18%19%1A%1B%1C%1D%1E%1F" +
			"%20!%22#$%25&%27%28%29*+,-./" +
			"0123456789:;%3C=%3E?" +
			"@ABCDEFGHIJKLMNO" +
			"PQRSTUVWXYZ[%5C]%5E_" +
			"%60abcdefghijklmno" +
			"pqrstuvwxyz%7B%7C%7D~%7F" );
	assertEquals( escapedAscii, normalizeUri( ASCII_CHARS ) );
	assertEquals( "#" + escapedAscii, filterNormalizeUri( "#" + ASCII_CHARS ) );

	// Test full-width.  The two characters at the right are a full-width '#'
	// and ':'.
	var escapedFullWidth = "%EF%BC%83%EF%BC%9A";
	var fullWidth = "\uff03\uff1a";
	assertEquals( escapedFullWidth, normalizeUri( fullWidth ) );
	assertEquals( escapedFullWidth, filterNormalizeUri( fullWidth ) );
	// Test malformed escape sequences
	assertEquals( "%20%2A%2a%252G%25", normalizeUri( "%20%2A%2a%2G%" ) );
	assertEquals( "%20%2A%2a%252G%25", filterNormalizeUri( "%20%2A%2a%2G%" ) );

	// Test filtering of URI starts.
	assertEquals( "#zSafehtmlz", filterNormalizeUri( "javascript:" ) );
	assertEquals( "#zSafehtmlz", filterNormalizeUri( "javascript:alert(1337)" ) );
	assertEquals( "#zSafehtmlz", filterNormalizeUri( "vbscript:alert(1337)" ) );
	assertEquals( "#zSafehtmlz", filterNormalizeUri( "livescript:alert(1337)" ) );
	assertEquals( "#zSafehtmlz", filterNormalizeUri( "data:,alert(1337)" ) );
	assertEquals(
			"#zSafehtmlz",
			filterNormalizeUri( "data:text/javascript,alert%281337%29" ) );
	assertEquals( "#zSafehtmlz", filterNormalizeUri( "file:///etc/passwd" ) );
	assertFalse(
			filterNormalizeUri( "javascript\uff1aalert(1337);" )
			.indexOf( "javascript\uff1a" ) >= 0 );

	// Testcases from http://ha.ckers.org/xss.html
	assertEquals( "#zSafehtmlz", filterNormalizeUri( "JaVaScRiPt:alert(1337)" ) );
	assertEquals(
			"#zSafehtmlz",
			filterNormalizeUri(
					// Using HTML entities to obfuscate javascript:alert('XSS');
					"&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;" +
					"&#58;&#97;&#108;&#101;&#114;&#116;" +
					"&#40;&#39;&#88;&#83;&#83;&#39;&#41;" ) );
	assertEquals(
			"#zSafehtmlz",
			filterNormalizeUri(  // Using longer HTML entities to obfuscate the same.
					"&#0000106&#0000097&#0000118&#0000097" +
					"&#0000115&#0000099&#0000114&#0000105" +
					"&#0000112&#0000116&#0000058&#0000097" +
					"&#0000108&#0000101&#0000114&#0000116" +
					"&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041" ) );
	assertEquals(
			"#zSafehtmlz",
			filterNormalizeUri(  // Using hex HTML entities to obfuscate the same.
					"&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74" +
					"&#x3A&#x61&#x6C&#x65&#x72&#x74&#x28&#x27&#x58&#x53&#x53&#x27&#x29" )
			);
	assertEquals(
			"#zSafehtmlz", filterNormalizeUri( "jav\tascript:alert('XSS');" ) );
	assertEquals(
			"#zSafehtmlz", filterNormalizeUri( "jav&#x09;ascript:alert('XSS');" ) );
	assertEquals(
			"#zSafehtmlz", filterNormalizeUri( "jav&#x0A;ascript:alert('XSS');" ) );
	assertEquals(
			"#zSafehtmlz", filterNormalizeUri( "jav&#x0D;ascript:alert('XSS');" ) );
	assertEquals(
			"#zSafehtmlz",
			filterNormalizeUri(
					"\nj\n\na\nv\na\ns\nc\nr\ni\np\nt\n:" +
					"\na\nl\ne\nr\nt\n(\n1\n3\n3\n7\n)" ) );
	assertEquals(
			"#zSafehtmlz", filterNormalizeUri( "\u000e  javascript:alert('XSS');" ) );

	// Things we should accept.
	assertEquals(
			"http://google.com/", filterNormalizeUri( "http://google.com/" ) );
	assertEquals(
			"https://google.com/", filterNormalizeUri( "https://google.com/" ) );
	assertEquals(
			"HTTP://google.com/", filterNormalizeUri( "HTTP://google.com/" ) );
	assertEquals( "?a=b&c=d", filterNormalizeUri( "?a=b&c=d" ) );
	assertEquals( "?a=b:c&d=e", filterNormalizeUri( "?a=b:c&d=e" ) );
	assertEquals( "//foo.com:80/", filterNormalizeUri( "//foo.com:80/" ) );
	assertEquals( "//foo.com/", filterNormalizeUri( "//foo.com/" ) );
	assertEquals( "/foo:bar/", filterNormalizeUri( "/foo:bar/" ) );
	assertEquals( "#a:b", filterNormalizeUri( "#a:b" ) );
	assertEquals( "#", filterNormalizeUri( "#" ) );
	assertEquals( "/", filterNormalizeUri( "/" ) );
	assertEquals( "", filterNormalizeUri( "" ) );

	assertEquals(
			"Hello,%20World!",
			normalizeUri( makeFragileToString( "Hello, World!" ) ) );
	assertEquals(
			"Hello,%20World!",
			filterNormalizeUri( makeFragileToString( "Hello, World!" ) ) );
	assertEquals(
			"#zSafehtmlz",
			filterNormalizeUri( makeFragileToString( "Hello:World!" ) ) );
}

function testEscapeHtml() {
	var escapeHtml = $.encode[ ESC_MODE_ESCAPE_HTML ];

	var escapedAscii = (
			"&#0;\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
			"\b\t\n\u000b\f\r\u000e\u000f" +
			"\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
			"\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
			" !&#34;#$%&amp;&#39;()*+,-./" +
			"0123456789:;&lt;=&gt;?" +
			"@ABCDEFGHIJKLMNO" +
			"PQRSTUVWXYZ[\\]^_" +
			"`abcdefghijklmno" +
			"pqrstuvwxyz{|}~\u007f" );
	assertEquals( escapedAscii, escapeHtml( ASCII_CHARS ) );
	assertEquals( escapedAscii, $.encode( ASCII_CHARS ) );

	function escapeHtmlSanitized( s ) {
		return escapeHtml( {
				contentKind: 0, content: s, toString: function () { return "" + s; }
		} );
	}

	assertEquals( "", "" + escapeHtmlSanitized( "" ) );
	assertEquals(
			"Hello, World!",
			"" + escapeHtmlSanitized( "Hello, World!" ) );
	assertEquals(
			"<b>Hello, World!</b>",
			"" + escapeHtmlSanitized( "<b>Hello, World!</b>" ) );
	assertEquals(
			"<b>Hello, \"World!\"</b>",
			"" + escapeHtmlSanitized( "<b>Hello, \"World!\"</b>" ) );
	assertEquals( "42", "" + escapeHtmlSanitized( 42 ) );

	assertEquals(
			"<b>Hello, World!</b>",
			"" + escapeHtmlSanitized(
					makeFragileToString( "<b>Hello, World!</b>" ) ) );
}

function testEscapeHtmlAttribute() {
	var escapeHtmlAttribute = $.encode[ ESC_MODE_ESCAPE_HTML_ATTRIBUTE ];

	var escapedAscii = (
			"&#0;\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
			"\b\t\n\u000b\f\r\u000e\u000f" +
			"\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
			"\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
			" !&#34;#$%&amp;&#39;()*+,-./" +
			"0123456789:;&lt;=&gt;?" +
			"@ABCDEFGHIJKLMNO" +
			"PQRSTUVWXYZ[\\]^_" +
			"`abcdefghijklmno" +
			"pqrstuvwxyz{|}~\u007f" );
	assertEquals( escapedAscii, escapeHtmlAttribute( ASCII_CHARS ) );
	assertEquals(
			"Hello, World!",
			escapeHtmlAttribute( makeFragileToString( "Hello, World!" ) ) );


	function escapeHtmlAttributeSanitized( s ) {
		return escapeHtmlAttribute( { contentKind: 0, content: s } );
	}

	assertEquals( "", escapeHtmlAttributeSanitized( "" ) );
	assertEquals(
			"Hello, World!", escapeHtmlAttributeSanitized( "Hello, World!" ) );
	assertEquals(
			"Hello, World!", escapeHtmlAttributeSanitized( "<b>Hello, World!</b>" ) );
	assertEquals(
			"Hello, &#34;World!&#34;",
			escapeHtmlAttributeSanitized( "<b>Hello, \"World!\"</b>" ) );
	assertEquals( "42", escapeHtmlAttributeSanitized( 42 ) );
	assertEquals(
			"Hello, World!",
			escapeHtmlAttributeSanitized(
					makeFragileToString( "<b>Hello, World!</b>" ) ) );
}

function testEscapeHtmlAttributeNospace() {
	var escapeHtmlAttributeNospace
			= $.encode[ ESC_MODE_ESCAPE_HTML_ATTRIBUTE_NOSPACE ];

	// The minimal escapes.
	// Do not remove anything from this set without talking to your friendly local
	// security-team@.
	assertEquals(
			"&#9;&#10;&#11;&#12;&#13;&#32;&#34;&#39;&#96;&lt;&gt;&amp;",
			escapeHtmlAttributeNospace( "\u0009\n\u000B\u000C\r \"'\u0060<>&" ) );

	var escapedAscii = (
			"&#0;\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
			"\b&#9;&#10;&#11;&#12;&#13;\u000e\u000f" +
			"\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
			"\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
			"&#32;!&#34;#$%&amp;&#39;()*+,&#45;.&#47;" +
			"0123456789:;&lt;&#61;&gt;?" +
			"@ABCDEFGHIJKLMNO" +
			"PQRSTUVWXYZ[\\]^_" +
			"&#96;abcdefghijklmno" +
			"pqrstuvwxyz{|}~\u007f" );
	assertEquals( escapedAscii, escapeHtmlAttributeNospace( ASCII_CHARS ) );
	assertEquals(
			"Hello,&#32;World!",
			escapeHtmlAttributeNospace( makeFragileToString( "Hello, World!" ) ) );

	function escapeHtmlAttributeNospaceSanitized( s ) {
		return escapeHtmlAttributeNospace( { contentKind: 0, content: s } );
	}

	assertEquals( "", escapeHtmlAttributeNospaceSanitized( "" ) );
	assertEquals(
			"Hello,&#32;World!",
			escapeHtmlAttributeNospaceSanitized( "Hello, World!" ) );
	assertEquals(
			"Hello,&#32;World!",
			escapeHtmlAttributeNospaceSanitized( "<b>Hello, World!</b>" ) );
	assertEquals(
			"Hello,&#32;&#34;World!&#34;",
			escapeHtmlAttributeNospaceSanitized( "<b>Hello, \"World!\"</b>" ) );
	assertEquals( "42", escapeHtmlAttributeNospaceSanitized( 42 ) );
	assertEquals(
			"Hello,&#32;World!",
			escapeHtmlAttributeNospaceSanitized(
					makeFragileToString( "<b>Hello, World!</b>" ) ) );
}

if ( DEBUG ) this.testNormalizeHtml = function () {

	// The minimal escapes.
	// Do not remove anything from this set without talking to your friendly local
	// security-team@.
	assertEquals(
			"&#34;&#39;&lt;&gt;",
			normalizeHtmlHelper( "\"'<>" ) );

	var escapedAscii = (
			"&#0;\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
			"\b\t\n\u000b\u000c\r\u000e\u000f" +
			"\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
			"\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
			" !&#34;#$%&&#39;()*+,-./" +
			"0123456789:;&lt;=&gt;?" +
			"@ABCDEFGHIJKLMNO" +
			"PQRSTUVWXYZ[\\]^_" +
			"`abcdefghijklmno" +
			"pqrstuvwxyz{|}~\u007f" );
	assertEquals( escapedAscii, normalizeHtmlHelper( ASCII_CHARS ) );
	assertEquals(
			"&lt;b&gt;Hello,&#32;World!&lt;/b&gt;",
			normalizeHtmlHelper(
					makeFragileToString( "<b>Hello,&#32;World!</b>" ) ) );
};

if ( DEBUG ) this.testNormalizeHtmlNospace = function () {
	// The minimal escapes.
	// Do not remove anything from this set without talking to your friendly local
	// security-team@.
	assertEquals(
			"&#9;&#10;&#11;&#12;&#13;&#32;&#34;&#39;&#96;&lt;&gt;",
			normalizeHtmlNospaceHelper( "\u0009\n\u000B\u000C\r \"'\u0060<>" ) );

	var escapedAscii = (
			"&#0;\u0001\u0002\u0003\u0004\u0005\u0006\u0007" +
			"\b&#9;&#10;&#11;&#12;&#13;\u000e\u000f" +
			"\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017" +
			"\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f" +
			"&#32;!&#34;#$%&&#39;()*+,&#45;.&#47;" +
			"0123456789:;&lt;&#61;&gt;?" +
			"@ABCDEFGHIJKLMNO" +
			"PQRSTUVWXYZ[\\]^_" +
			"&#96;abcdefghijklmno" +
			"pqrstuvwxyz{|}~\u007f" );
	assertEquals( escapedAscii, normalizeHtmlNospaceHelper( ASCII_CHARS ) );
	assertEquals(
			"&lt;b&gt;Hello,&#32;World!&lt;&#47;b&gt;",
			normalizeHtmlNospaceHelper(
					makeFragileToString( "<b>Hello,&#32;World!</b>" ) ) );
};
