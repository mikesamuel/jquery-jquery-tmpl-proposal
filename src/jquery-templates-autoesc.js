//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * Simple autoescape mode.
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

if ( !JQUERY_TMPL_PRECOMPILED ) {
	$[ TEMPLATE_PLUGINS_PROP_NAME ].push(
			// Naive auto-escape.
			function autoescape( parseTrees ) {
				$.each(
						parseTrees,
						function autoescapeOne( _, parseTree ) {
							if ( typeof parseTree !== "string" ) {
								if ( parseTree[ 0 ] === "=" ) {
									parseTree[ 1 ] += "=>$.encode";
								} else if ( parseTree[ 0 ] === "html" ) {
									parseTree[ 0 ] = "=";
								} else {
									$.each( parseTree, autoescapeOne );
								}
							}
						} );
				return parseTrees;
			} );
}
