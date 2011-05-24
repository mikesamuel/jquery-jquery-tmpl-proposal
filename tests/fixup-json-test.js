//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

function testFixupJson() {
	var s = (
			"{ value: 42, color: red, name: \u0027John Doe\u0027,"
			+ " \"bars\": [\u0027foo1\u0027, \u0027foo2\u0027],"
			+ " foo: \u0027bar\u0027 }" );
	assertEquals(
			[
			 "{",
			 "  \"value\": 42,",
			 "  \"color\": \"red\",",
			 "  \"name\": \"John Doe\",",
			 "  \"bars\": [",
			 "    \"foo1\", \"foo2\"",
			 "  ],",
			 "  \"foo\": \"bar\"",
			 "}"
			].join( "\n" ),
			fixupJson( s ) );
}
