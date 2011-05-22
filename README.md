# JQuery Templates Strawman

Implements the [jQuery Templates Strawman](http://wiki.jqueryui.com/w/page/37898666/Template),

## Contents

The `src` directory contains the JavaScript implementation.
The `test` directory contains HTML benchmarks and a conformance suite.

This project actually contains several semi-independent implementations.

The _reference_ implementation (in `src/ref.js`) is a simple, inefficient, clear implementation of the spec.

The _strappend_ implementation (in `src/impl.js`) is a small, fast, implementation that should conform
with the reference implementation in every detail, but is more complicated due to speed/size constraints.

The other files in src are common supporting code for the two implementations.

If the strappend implementation differs from the reference implementation then strappend is wrong.
If the reference implementation is behaving differently than it should, then there is an error in the spec.

<table>
  <tr>
    <td><tt>Makefile</tt></td>
    <td>Builds the compiled JS.  Run <tt>make</tt> from the directory containing this README.</td>
  </tr>
  <tr>
    <td><tt>build/</tt></td>
    <td>Contains concatenated and compiled JS files after running <tt>make</tt></td>
  </tr>
  <tr>
    <td><tt>closure/</tt></td>
    <td>Tools used to minify the JS</td>
  </tr>
  <tr>
    <td><tt>src/</tt></td>
    <td>
      Source JS files that declare private names globally but
      <tt>make</tt> properly scopes the JS in <tt>build/</tt></td>
  </tr>
  <tr>
    <td><tt>&nbsp; &#x21b3;  jquery-templates-defs.js</tt></td>
    <td>Constants definitions for the lexical grammar and defaults.</td>
  </tr>
  <tr>
    <td><tt>&nbsp; &#x21b3;  jquery-templates-parser.js</tt></td>
    <td>Definitions of the parser which converts template source to an AST.</tt></td>
  </tr>
  <tr>
    <td><tt>&nbsp; &#x21b3; jquery-template-ref.js</tt></td>
    <td>Reference implementation.  Slow, verbose, but simple.</td>
  </tr>
  <tr>
    <td><tt>&nbsp; &#x21b3; jquery-template-impl.js</tt></td>
    <td>Strappend implementation.  More efficient than the reference implementation.</td>
  </tr>
  <tr>
    <td><tt>&nbsp; &#x21b3; jquery-templates-api.js</tt></td>
    <td>Defines the <tt>$.template</tt> API.</td>
  </tt>
  <tr>
    <td><tt>&nbsp; &#x21b3; jquery-templates-autoesc.js</tt></td>
    <td>Implements na&iuml;ve autoescaping.</td>
  </tt>
  <tr>
    <td><tt>tests/</tt></td>
    <td>Test suites and benchmarks.</td>
  </tr>
  <tr>
    <td><tt>&nbsp; &#x21b3; conformance-suite.html</tt></td>
    <td>A test-suite for the jQuery templates specification.</td>
  </tr>
  <tr>
    <td><tt>&nbsp; &#x21b3; templates-benchmarks.html</tt></td>
    <td>Benchmarks for jQuery and other template implementations</td>
  </tr>
</table>

## Building And Running Tests

The source files under `js/` are written to minimize dependencies on jQuery and to minify well.  They declare
private helper functions globally.

Running

> `make`

(or its [Windows equivalent](http://msdn.microsoft.com/en-us/library/dd9y37ha.aspx)) at the command line will generate properly scoped and minimized JavaScript files under the `build/` directory.

<table>
  <tr>
    <td><tt>build/</tt></td>
  </tr>
  <tr>
    <td><tt>&nbsp; &#x21b3; jquery-templates-reference.js</tt></td>
    <td>A simple, slow reference implementation that mirrors the spec.</td>
  </tr>
  <tr>
    <td><tt>&nbsp; &#x21b3; jquery-templates-strappend.js</tt></td>
    <td>An efficient implementation that provides good error messages.</td>
  </tr>
  <tr>
    <td><tt>&nbsp; &#x21b3; jquery-templates-compiled.js</tt></td>
    <td>An aggressively minimized version of strappend that does not include error reporting code.</td>
  </tr>
</table>

## Compiled Versions

The efficient strappend implementation functions in 3 modes:

1. Debug: jQuery templates are compiled as-needed in the client with rich error checks and error messages.
2. Production: jQuery templates are compiled as-needed in the client with `DEBUG = false` which removes most of the error checks and error messages to minimize download size and startup time.
3. Pre-compiled: jQuery templates are pre-compiled to JavaScript functions so the parser does not need to be shipped with the application, and code-minifiers can inline/optimize the application along with the template code.

### Debug mode

Normally to use jQuery templates, you ship code like the below:

<pre>
    &lt;script type="text/javascript" src="jquery-templates-strappend.js"&gt;&lt;/script&gt;
    &lt;script type="text/javascript" src="my-jquery-extension.js"&gt;&lt;/script&gt;
    &lt;script type="text/x-jquery-tmpl" id="sayhello"&gt;
      Hello, ${world}!
    &lt;/script&gt;
</pre>

which includes jQuery templates support code including the template parser and compiler and
a template definition.

At load time, the jQuery templates code will parse and compile templates as needed.

### Production mode

Debugging checks are not useful after you've run your unittests and
you know your templates are syntactically valid.  The debugging checks
take a significant amount of space; nice error messages don't compress
well.

The compiled version of the strappend includes the full template
parser and runtime, but without error checks that are usually
redundant in production.

<pre>
    &lt;script type="text/javascript" src="<b>jquery-templates-compiled.js</b>"&gt;&lt;/script&gt;
    &lt;script type="text/javascript" src="my-jquery-extension.js"&gt;&lt;/script&gt;
    &lt;script type="text/x-jquery-tmpl" id="sayhello"&gt;
      Hello, ${world}!
    &lt;/script&gt;
</pre>

### Pre-compiled

Pre-compiled mode is similar to production mode but offers some benefits for
projects that already have a compilation step, e.g. using JavaScript minifiers.

In pre-compiled mode, a script extracts templates from HTML or similar
source code and substitutes equivalent JavaScript code, so that the
result does not need to include a download of the template parser, and
the page load is not slowed down by invoking the parser.

So in pre-compiled mode, the example above would pre-compile to something like

<pre>
    &lt;script type="text/javascript" src="jquery-templates-runtimeonly.js"&gt;&lt;/script&gt;
    <b>&lt;script type="text/javascript"&gt;
      $.template("#sayhello", { tmpl: function ($data) { return "Hello, " + $.encode($data.world); } });
    &lt;/script&gt;</b>
</pre>

## Server Side JS

This differs from the original jQuery templates in that it contains no
DOM dependencies, and compiled templates produce a string of HTML
instead of a DOM so that it can work well with Node.js and other server-side
JavaScript frameworks.
