(function () {
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-
/*jslint evil: true, unparam: true, maxerr: 50 */

/**
 * @fileoverview
 * Common definitions for jQuery templates and plugin passes
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */


/**
 * @define {boolean}
 * True if malformed templates should result in informative error messages.
 * May be turned off in production to reduce minified size.
 * When false, most of the error reporting is turned off during parsing and
 * compilation, so the production bundle should be used with templates that
 * have already passed basic sanity checks.
 */
var DEBUG = true;

/**
 * A boolean-esque value that minifies better than true.
 * @const
 */
var TRUTHY = 1;

/**
 * A boolean-esque value that minifies better than false.
 * @const
 */
var FALSEY = 0;


// JQuery Lexical Grammar.

/**
 * Regular expression text for a substitution.  ${...}.
 * @const
 */
var SUBSTITUTION_RE = (
		"\\$\\{"
		+ "[^}]*"               // ${...} cannot contain curlies but {{=...}} can.
		+ "\\}" );

/**
 * Regular expression text for a directive name.
 * @const
 */
var NAME_RE = "[=a-z][a-z0-9]*";

/**
 * Regular expression text for a directive start|end marker.
 * @const
 */
var MARKER_RE = (
		"\\{\\{"
		+ "(?:"
		+ NAME_RE + "[\\s\\S]*?" // A start marker.
		+ "|/" + NAME_RE + "\\s*" // An end marker.
		+ ")"
		+ "\\}\\}" );

/**
 * Global regular expression that matches a single template token.
 * @const
 */
var TOKEN = new RegExp(
		"(?=" + SUBSTITUTION_RE
		+ "|" + MARKER_RE + ")",
		"gi" );

/**
 * Global regular expression that can be used to decompose a marker.
 * @const
 */
var MARKER = new RegExp(
		"^\\{\\{"
		+ "(/?)"  // Iff a close marker, group 1 is truthy.
		+ "(=|[a-z][a-z0-9]*)"  // Marker name in group 2.
		+ "([\\s\\S]*)"  // Marker content in group 3.
		+ "\\}\\}",
		"i" );

/**
 * Regular expression text for a variable name.
 * @const
 */
// We may need to exclude keywords if these are used outside a param decl.
var VAR_NAME_RE = "[a-z_$]\\w*";

/** Matches the content of an <code>{{each}}</code> directive. @const */
var EACH_DIRECTIVE_CONTENT = new RegExp(
		"^"  // Start at the beginning,
		+ "\\s*"
		+ "(?:"  // Optional parenthetical group with var names.
			+ "\\(\\s*"
			+ "(" + VAR_NAME_RE + ")"  // Key variable name in group 1.
			+ "\\s*"
			+ "(?:"
				+ ",\\s*"
				+ "(" + VAR_NAME_RE + ")"  // Value variable name in group 2.
				+ "\\s*"
			+ ")?"
			+ "\\)\\s*"
		+ ")?"
		+ "("  // Container expression in group 3.
			+ "\\S"  // A non-space character followed by any run of non-space chars.
			+ "(?:[\\s\\S]*\\S)?"
		+ ")"
		+ "\\s*"
		+ "$",  // Finish at the end.
		"i" );

/** Matches the content of a <code>{{tmpl}}</code> directive. @const */
var TMPL_DIRECTIVE_CONTENT = new RegExp(
		"^"
		+ "\\s*"
		+ "(?:"  // Optional parenthetical group with data and option exprs.
			+ "\\("
			+ "([\\s\\S]*)"  // Data and option maps go in group 1.
			+ "\\)"
			+ "\\s*"
		+ ")?"
		+ "([^\\s()](?:[^()]*[^\\s()])?)"  // Template name/selector in group 2.
		+ "\\s*"
		+ "$"
		);

/**
 * The default variable name for the key used when none is specified in an
 * <code>{{each}}</code> directive.
 * @const
 */
var DEFAULT_EACH_KEY_VARIABLE_NAME = "$index";

/**
 * The default variable name used for the value when none is specified in an
 * <code>{{each}}</code> directive.
 * @const
 */
var DEFAULT_EACH_VALUE_VARIABLE_NAME = "$value";


// API name constants
// These constants help us write code that is JSLint friendly, and compresses
// well with closure compiler.
/**
 * Extern property name for the member of $ that contains plugins to run.
 * @const
 */
var TEMPLATE_PLUGINS_PROP_NAME = "templatePlugins";

/**
 * Name of the map from template names to compiled/parsed template.
 * @const
 */
var TEMPLATES_PROP_NAME = "templates";

/**
 * Name of the extern method used to define/lookup templates.
 * @const
 */
var TEMPLATE_METHOD_NAME = "template";

/**
 * Method of a template object that renders the template.
 * @const
 */
var TMPL_METHOD_NAME = "tmpl";

/**
 * The default set of block directives.
 * @const
 */
var DEFAULT_BLOCK_DIRECTIVES = { "each": TRUTHY, "if": TRUTHY, "wrap": TRUTHY };
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * @fileoverview
 * The frontend of the JQuery template compiler
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

/**
 * Guess, conservatively for well-formed templates, the set of
 * directives that require an end-marker.
 *
 * @param {!string} templateText
 * @return {!Object.<string, number>}
 */
function guessBlockDirectives( templateText ) {
	/**
	 * @type !Object.<string, number>
	 */
	var blockDirectives = {};
	// For each token like {{/foo}} put "foo" into the block directives map.
	$.each(
			templateText.split( TOKEN ),
			function ( _, tok ) {
				var match;
				if ( ( match = tok.match( /^\{\{\/([a-z][a-z0-9]*)[\s\S]*\}\}/i ) ) ) {
					blockDirectives[ match[ 1 ] ] = TRUTHY;
				}
			} );
	return blockDirectives;
}

/**
 * Parse a template to a parse tree.
 * Parse trees come in two forms:
 * <ul>
 *   <li>{@code "string"} : a snippet of HTML text.</li>
 *   <li>{@code ["name", "content", ...]} where {@code "name"}
 *      is a directive name like {@code "if"} or the string {@code "="} for
 *      substitutions.  The content is the string after the name in the open
 *      marker, so for <code>{{if foo==bar}}Yes{{/if}}</code>, the content is
 *      {@code " foo==bar"}.  The "..." above is filled with child parse trees
 *      of the form described here.</li>
 * </ul>
 * <p>
 * For example, the parse tree for
 * <pre>
 * &lt;b&gt;{{if sayHello}}Hello{{else}}Goodbye{{/if}}&lt;/b&gt;, ${world}!
 * </pre>
 * is
 * <pre>
 * [
 *  "",               // Name of root is blank.
 *  "",               // Content of root is blank.
 *  "&lt;b&gt;",      // Zero-th child is a snippet of HTML.
 *  [                 // An embedded directive is an array.
 *   "if",            // Name comes first
 *   " sayHello",     // Content of {{if}}
 *   "Hello",         // A snippet of HTML.
 *   ["else", ""],    // {{else}} is an inline directive inside {{if}}.
 *   "Goodbye"
 *  ],                // End of the {{if ...}}...{{/if}}.
 *  "&lt;/b&gt;, ",   // Another snippet of HTML.
 *  ["=", "world"],   // A substitution.  ${x} is an abbreviation for {{=x}}.
 *  "!"
 * ]
 * </pre>
 *
 * @param {!string} templateText The text to parse.
 * @param {!Object.<string, number>} blockDirectives Maps directive names such
 *     as {@code "if"} to {link #TRUTHY} if they require/allow an end marker.
 *     {@link #DEFAULT_BLOCK_DIRECTIVES} and the output of
 *     {@link #guessBlockDirectives} both obey this contract.
 * @return {!Array.<string|Array>|string} A parse tree node.
 */
function parseTemplate( templateText, blockDirectives ) {
	// The root of the parse tree.
	var root = [ "", "" ],
			// A stack of nodes which have been entered but not yet exited.
			stack = [ root ],
			// The topmost element of the stack
			top = root,
			// Count of "}}" sequences that need to be seen to end the {{!...}}.
			commentDepth = 0;
	$.each(
			templateText
					// Handle {#...#} style non-nesting comments.
					.replace( /\{#[\s\S]*?#\}/g, "" )
					// Handle {{! ... }} style comments which can contain arbitrary nested
					// {{...}} sections.
					.replace( /\{\{!?|\}\}|(?:[^{}]|\{(?!\{)|\}(?!\}))+/g,
										function ( token ) {
											if ( token === "{{!" ) {
												++commentDepth;
												return "";
											} else if ( commentDepth ) {  // Inside a {{!...}}.
												if ( token === "}}" ) {
													--commentDepth;
												} else if ( token === "{{" ) {
													++commentDepth;
												}
												return "";
											} else {  // Actually emit the token.
												return token;
											}
										} )
					// Split against a global regexp to find all token boundaries.
					.split( TOKEN ),
			function ( _, token ) {
				var m = token.match( MARKER );
				if ( m ) {  // A marker.
					// "/" in group 1 if an end marker.
					// Name in group 2.  Content in group 3.
					if ( m[ 1 ] ) {  // An end marker
						if ( DEBUG && top[ 0 ] !== m[ 2 ] ) {
							throw new Error( "Misplaced " + token + " in " + templateText );
						}
						top = stack[ --stack.length - 1 ];
					} else {  // A start marker.
						var node = [ m[ 2 ], m[ 3 ] ];
						if ( DEBUG ) {
							if ( m[ 2 ] === "=" ) {
								try {
									// For some reason, on Safari,
									//     Function("(i + (j)")
									// fails with a SyntaxError as expected, but
									//     Function("return (i + (j)")
									// does not.
									// Filed as https://bugs.webkit.org/show_bug.cgi?id=59795
									Function( "(" + m[ 3 ] + ")" );
								} catch ( e1 ) {
									throw new Error( "Invalid template substitution: " + m[ 3 ] );
								}
							} else if ( m[ 2 ] === "tmpl" ) {
								var tmplContent = m[ 3 ].match( TMPL_DIRECTIVE_CONTENT );
								try {
									Function( "([" + tmplContent[ 1 ] + "])" );
									Function( "(" + tmplContent[ 2 ] + ")" );
								} catch ( e2 ) {
									throw new Error(
											"Invalid {{" + m[ 2 ] + "}} content: " + m[ 3 ] );
								}
							}
						}
						top.push( node );  // Make node a child of top.
						if ( blockDirectives[ m[ 2 ] ] === TRUTHY ) {
							// If it is a block directive, make sure the stack and top are
							// set up so that the next directive or text span parsed will be
							// a child of node.
							stack.push( top = node );
						}
					}
					// TOKEN only breaks on the starts of markers, not the end.
					// Consume marker so tail can be treated as HTML snippet text.
					token = token.substring( m[ 0 ].length );
				} else if ( token.substring( 0, 2 ) === "${" ) {  // A substitution.
					// Since TOKEN above splits on only the starts of tokens, we need to
					// find the end and allow any remainder to fall-through to the HTML
					// HTML snippet case below.
					var end = token.indexOf( "}" );
					top.push( [ "=", token.substring( 2, end ) ] );
					if ( DEBUG ) {
						var content = top[ top.length - 1 ][ 1 ];
						try {
							// See notes on {{=...}} sanity check above.
							Function( "(" + content + ")" );
						} catch ( e3 ) {
							throw new Error( "Invalid template substitution: " + content );
						}
					}
					// Consume marker so tail can be treated as an HTML snippet below.
					token = token.substring( end + 1 );
				}
				if ( token ) {  // An HTML snippet.
					top.push( token );
				}
			} );
	if ( DEBUG && stack.length > 1 ) {
		throw new Error(
				"Unclosed block directives "
				+ stack.slice( 1 ).map( function ( x ) { return x[ 0 ]; } ) + " in "
				+ templateText );
	}
	return root;
}


// Utilities for debugging parser plugins.

/**
 * Given a template parse tree, returns source text that would parse to that
 * parse tree.  This can be useful for debugging but not required.
 *
 * @param {Array.<string|Array>|string} parseTree as produced by
 *     {@link #parseTemplate}.
 * @param {Object.<string, number>} opt_blockDirectives.
 */
function renderParseTree( parseTree, opt_blockDirectives ) {
	var buffer = [];
	( function render( _, parseTree ) {
		if ( "string" !== typeof parseTree ) {
			var name = parseTree[ 0 ], n = parseTree.length;
			if ( name === "=" && !/\}/.test( parseTree[ 1 ] ) ) {
				buffer.push( "${", parseTree[ 1 ], "}" );
			} else {
				if ( name ) { buffer.push( "{{", name, parseTree[ 1 ], "}}" ); }
				$.each( parseTree.slice( 2 ), render );
				if ( name && ( n !== 2 || !opt_blockDirectives
						 || opt_blockDirectives[ name ] === TRUTHY ) ) {
					buffer.push( "{{/", name, "}}" );
				}
			}
		} else {
			buffer.push( parseTree.replace( /\{([\{#])/, "{{##}$1" ) );
		}
	}( 2, parseTree ) );
	return buffer.join( "" );
}
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * A simple inefficient backend for the JQuery template compiler
 * based on http://wiki.jqueryui.com/w/page/37898666/Template
 *
 * @author Mike Samuel <mikesamuel@gmail.com>
 */

/** Like <code>$.extend</code> but copies undefined properties. */
function extendWithUndef( target, source ) {
	var k;
	for ( k in source ) {
		target[ k ] = source[ k ];
	}
	return target;
}

function compileToFunction( parseTree ) {
	if ( !Object.create ) {
		Object.create = function () { return {}; };
	}
	if ( !Object.defineProperty ) {
		Object.defineProperty = function ( obj, prop, pd ) {
			var PROP_DESCRIP_GET = "get",
					PROP_DESCRIP_SET = "set",
					PROP_DESCRIP_VALUE = "value";
			if ( Object.hasOwnProperty.call( pd, PROP_DESCRIP_VALUE ) ) {
				obj[ prop ] = pd[ PROP_DESCRIP_VALUE ];
			} else if ( "undefined" !== typeof obj.__defineGetter__ ) {
				if ( pd[ PROP_DESCRIP_GET ] ) {
					obj.__defineGetter__( prop, pd[ PROP_DESCRIP_GET ] );
				}
				if ( pd[ PROP_DESCRIP_SET ] ) {
					obj.__defineSetter__( prop, pd[ PROP_DESCRIP_SET ] );
				}
			}
			return obj;
		};
	}

	function createTemplateScope( data ) {
		// Object.create(null) creates an object with no prototype.
		// It does not inherit non-enumerables such as toString, etc. so
		// it has predictable behavior when used with with (...) { ... }
		return extendWithUndef( Object.create( null ), data );
	}

	function extendTemplateScope( parentScope, variables ) {
		return extendWithUndef( Object.create( parentScope ), variables );
	}

	// Evaluates expression text that appears inside directive content
	// in the given scope.
	function evaluateInScope( expressionText, scope, options ) {
		if ( arguments.length !== 3 ) {
			throw new Error();
		}
		// Flush out expressionText that does not have properly balanced
		// curly brackets, such as {{= foo()) } { (bar() }}
		Function( "(" + expressionText + ")" );
		// Now that we know that any curlies are properly balanced, go
		// ahead and wrap it in the proper scope and actually execute it.
		// We use Function instead of eval to truncate the lexical environment
		// at the root environment.
		return Function(
				"$data", "$item",
				"$data = $data || {};"
				+ "if ('$' in $data) { throw new Error('$ overridden'); }"
				+ "$item = $item || {};"
				// Make sure that "arguments" can not be defined.
				// This will prevent unintentional access to arguments.
				+ "with (Object.defineProperty(Object.create(null), 'arguments', {"
				+ "'get': function () {"
				+   "throw new Error('arguments is not defined');"
				+ "}})) {"
				+ "with ($data) { return (" + expressionText + ") } }" )(
				scope, options );
	}

	function recurseToBody( body, scope, options ) {
		if ( arguments.length !== 3 ) {
			throw new Error();
		}
		var htmlBuffer = "", i, n;
		for ( i = 0, n = body.length; i < n; ++i ) {
			htmlBuffer += interpret( body[ i ], scope, options );
		}
		return htmlBuffer;
	}

	function interpret( parseTree, scope, options ) {
		if ( "string" === typeof parseTree ) {
			return parseTree;
		}

		var content = parseTree[ 1 ];
		var body = parseTree.slice( 2 );
		var match;
		var name = parseTree[ 0 ];
		if ( name === "each" ) {
			match = content.match( EACH_DIRECTIVE_CONTENT );
			var key = match[ 1 ] || DEFAULT_EACH_KEY_VARIABLE_NAME;
			var value = match[ 2 ] || DEFAULT_EACH_VALUE_VARIABLE_NAME;
			var expression = match[ 3 ];
			var extensions = {};
			extensions[ key ] = -1;
			extensions[ value ] = null;
			var childScope = extendTemplateScope( scope, extensions );
			var htmlBuffer = "";
			$.each(
					// Expression is not evaluated in childScope.
					evaluateInScope( expression, scope, options ),
					function ( k, v ) {
						childScope[ key ] = k;
						childScope[ value ] = v;
						htmlBuffer += recurseToBody( body, childScope, options );
					} );
			return htmlBuffer;
		} else if ( name === "else" ) {
			return !/\S/.test( content )
				|| evaluateInScope( content, scope, options );
		} else if ( name === "if" ) {
			var pos, elseIndex, i;
			for ( pos = 0; pos < body.length; pos = elseIndex + 1 ) {
				elseIndex = body.length;
				for ( i = pos; i < elseIndex; ++i ) {
					if ( body[ i ][ 0 ] === "else" ) {
						elseIndex = i;
					}
				}
				var conditionResult = pos === 0
						? evaluateInScope( content, scope, options )
						: interpret( body[ pos - 1 ], scope, options );
				if ( conditionResult ) {
					return recurseToBody( body.slice( pos, elseIndex ), scope, options );
				}
			}
			return "";
		} else if ( name === "tmpl" ) {
			match = content.match( TMPL_DIRECTIVE_CONTENT );
			var dataAndOptions = $.extend(
					[ scope, options ],
					evaluateInScope( "[" + match[ 1 ] + "]", scope, options ) );
			var calleeData = dataAndOptions[ 0 ];
			var calleeOptions = dataAndOptions[ 1 ];
			var calleeName = match[ 2 ];
			return $[ TEMPLATE_METHOD_NAME ](
					evaluateInScope( calleeName, scope, options )
					)[ TMPL_METHOD_NAME ]( calleeData, calleeOptions );
		} else if ( name === "=" ) {
			var contentBefore = "", contentAfter = "";
			// Given content ="x=>f=>g",
			// we get contentBefore="g(f(", content="x", contentAfter="))"
			content = content.replace(
					/(=>[\w.$\[\]]+)+$/, function ( postDethunk ) {
						postDethunk = postDethunk.split( "=>" );
						contentAfter = new Array( postDethunk.length ).join( ")" );
						contentBefore = postDethunk.reverse().join( "(" );
						return "";
					} );
			var result = evaluateInScope( content, scope, options );
			// De-thunkify if necessary.
			if ( "function" === typeof result ) {
				result = result.call( scope );
			}
			return new Function(
					"return(" + contentBefore + "(arguments[0]))" + contentAfter
					)( result );
		}
		throw new Error( JSON.stringify( parseTree ) );
	}

	function fixupOrphanedSurrogatesAndNuls( s ) {
		return s
				// Fix up orphaned high surrogates.  Alternately replace w/ "\ufffd".
				.replace( /[\ud800-\udbff](?![\udc00-\udfff])/g,
								 function ( orphanedHighSurrogate ) {
									 return "&#" + orphanedHighSurrogate.charCodeAt( 0 ) + ";";
								 } )
				// Fix up orphaned low surrogates.  Alternately replace w/ "$1\ufffd".
				.replace( /(^|[^\ud800-\udbff])([\udc00-\udfff])/g,
								 function ( _, preceder, orphanedLowSurrogate ) {
									 return preceder + "&#"
											 + orphanedLowSurrogate.charCodeAt( 0 ) + ";";
								 } )
				.replace( /\u0000/g, "&#0;" );
	}

	return function ( data, options ) {
		return fixupOrphanedSurrogatesAndNuls( recurseToBody(
				parseTree.slice( 2 ), createTemplateScope( data ), options ) );
	};
}
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * @fileoverview
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
			// Look at {{tmpl}} calls to produce the minimal set of templates that
			// need to be compiled together.
			$.each( parseTree, function findDeps( _, node ) {
				if ( node[ 0 ] === "tmpl" || node[ 0 ] === "wrap" ) {
					var match = node[ 1 ].match( TMPL_DIRECTIVE_CONTENT );
					if ( match ) {
						// Unpack the template name, e.g. "foo" in {{tmpl "foo"}}.
						var depName = Function( "return " + match[ 2 ] )();
						if ( needsCompile( depName )
								 && processedNames[ depName ] !== TRUTHY ) {
							process(
									depName,
									parseTrees[ depName ] = $[ TEMPLATES_PROP_NAME ][ depName ] );
						}
					}
				}
			} );
		}
	} );
	// Produces a function that will apply all the passes already run to new
	// dependencies so that if a pass pulls in imports, it can bring them
	// up to date.
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
	// Apply the passes to parseTrees.
	$.each( makePrepassCaller(
						$[ TEMPLATE_PLUGINS_PROP_NAME ].length )( parseTrees ),
					function ( templateName, parseTree ) {
						var tmplObj = { "tmpl": compileToFunction( parseTree ) };
						if ( templateName !== opt_exclusion ) {
							$[ TEMPLATES_PROP_NAME ][ templateName ] = tmplObj;
						} else {
							result = tmplObj;
						}
					} );
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
//-*- mode: js2-mode; indent-tabs-mode: t; tab-width: 2; -*-

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var escapeMapForHtml = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;"
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function replacerForHtml( ch ) {
	return escapeMapForHtml[ ch ]
			// Intentional assignment that caches the result of encoding ch.
			|| ( escapeMapForHtml[ ch ] = "&#" + ch.charCodeAt( 0 ) + ";" );
}

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
var escapeMapForJs = {
	// We do not escape "\x08" to "\\b" since that means word-break in RegExps.
	"\x09": "\\t",
	"\x0a": "\\n",
	"\x0c": "\\f",
	"\x0d": "\\r",
	"\/": "\\\/",
	"\\": "\\\\"
};

/**
 * A function that can be used with {@code String.replace}.
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
function replacerForJs( ch ) {
	var hex;
	return escapeMapForJs[ ch ]
			|| (
					hex = ch.charCodeAt( 0 ).toString( 16 ),
					// "\u2028" -> "\\u2028" and is cached in escapeMapForJs.
					escapeMapForJs[ ch ] = "\\u0000".substring( 0, 6 - hex.length ) + hex
					);
}

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var htmlSpecialChar = /[\x00"&'<>]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 * @const
 */
var jsSpecialChar = /[\x00\x08-\x0d"&'\/<->\\\x85\u2028\u2029]/g;

/**
 * A helper for the Soy directive |escapeHtml
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
function escapeHtml( value ) {
	return value === undefined
			? "" : String( value ).replace( htmlSpecialChar, replacerForHtml );
}

/**
 * Encodes a value as a JavaScript literal.
 *
 * @param {*} value The value to escape.  May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A JavaScript code representation of the input.
 */
function escapeJsValue( value ) {
	return "'" + String( value ).replace( jsSpecialChar, replacerForJs ) + "'";
}

/**
 * @const
 * @private
 */
var ENCODE_METHOD_NAME = "encode";
$[ ENCODE_METHOD_NAME ] = escapeHtml;
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
							if ( "string" !== typeof parseTree ) {
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
 }())
