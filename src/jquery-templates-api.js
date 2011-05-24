//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * API methods and builtin compiler passes for JQuery templates
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

/**
 * @define {boolean}
 * Can be set to compile a version that does not include the parser
 * usable in environments where all templates have been precompiled.
 */
var JQUERY_TMPL_PRECOMPILED = false;


/**
 * An array of plugin passed, functions that take a parse tree and return
 * a parse tree, to run beore compilation.
 */
$[ TEMPLATE_PLUGINS_PROP_NAME ] = [];

function needsCompile( name ) {
	var tmpl = $[ TEMPLATES_PROP_NAME ][ name ];
	return tmpl && "function" !== typeof tmpl[ TMPL_METHOD_NAME ];
}

/**
 * Compiles the given bundle of parse trees together and stores the compiled
 * results in $.templates.
 *
 * @param parseTrees Mapping of template names to parse trees.
 * @param opt_exclusion Optional name of a template not to store in $.templates.
 */
function compileBundle( parseTrees, opt_exclusion ) {
	var processedNames = {};
	$.each( parseTrees, function process( name, parseTree ) {
		if ( processedNames[ name ] !== TRUTHY ) {
			processedNames[ name ] = TRUTHY;
			$.each( parseTree, function findDeps( _, node ) {
				if ( node[ 0 ] === "tmpl" || node[ 0 ] === "wrap" ) {
					var match = node[ 1 ].match( TMPL_DIRECTIVE_CONTENT );
					if ( match ) {
						var depName = Function( "return " + match[ 2 ] )();
						if ( needsCompile( depName )
								 && processedNames[ depName ] !== TRUTHY ) {
							process(
									depName,
									parseTrees[ depName ] = $[ TEMPLATES_PROP_NAME ][ depName ] );
						}
					}
				}
			});
		}
	});
	function makePrepassCaller( pluginIndex ) {
		return function ( parseTrees ) {
			var i;
			for ( i = 0; i < pluginIndex; ++i ) {
				parseTrees = $[ TEMPLATE_PLUGINS_PROP_NAME ][ i ](
						parseTrees, makePrepassCaller( i ) );
			}
			return parseTrees;
		};
	}
	var result;
	$.each( makePrepassCaller(
						$[ TEMPLATE_PLUGINS_PROP_NAME ].length )( parseTrees ),
					function ( templateName, parseTree ) {
						var tmplObj = { "tmpl": compileToFunction( parseTree ) };
						if ( templateName !== opt_exclusion ) {
							$[ TEMPLATES_PROP_NAME ][ templateName ] = tmplObj;
						} else {
							result = tmplObj;
						}
					});
	return result;
}

$[ TEMPLATES_PROP_NAME ] = {};

$[ TEMPLATE_METHOD_NAME ] = function self( name, templateSource ) {
	if ( JQUERY_TMPL_PRECOMPILED ) {
		return $[ TEMPLATES_PROP_NAME ][ name ];
	}
	var templates = $[ TEMPLATES_PROP_NAME ];
	var parseTrees;
	if ( arguments.length === 1 ) {
		if ( name.indexOf( "<" ) + 1 ) {
			return self( null, name );
		}
		if ( needsCompile( name ) ) {
			parseTrees = {};
			parseTrees[ name ] = templates[ name ];
			compileBundle( parseTrees );
		}
		return templates[ name ];
	}
	// We delay compiling until we've got a bunch of definitions together.
	// This allows plugins to process entire template graphs.
	var parseTree = parseTemplate(
			templateSource,
			$.extend( guessBlockDirectives( templateSource ),
								DEFAULT_BLOCK_DIRECTIVES ) );
	if ( name === null ) {
		return compileBundle( parseTrees = { "_": parseTree }, "_" );
	}
	templates[ name ] = parseTree;
};
