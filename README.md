# JQuery Templates Strawman

## Contents

This implements the [jQuery Templates Strawman](http://wiki.jqueryui.com/w/page/37898666/Template)
including 

The `src` directory contains the JavaScript implementation.
The `test` directory contains HTML benchmarks and a conformance suite.

This project actually contains several semi-independent implementations.

The _reference_ implementation (in `src/ref.js`) is a simple, inefficient, clear implementation of the spec.

The _strappend_ implementation (in `src/impl.js`) is a small, fast, implementation that should conform
with the reference implementation in every detail, but is more complicated due to speed/size constraints.

The other files in src are common supporting code for the two implementations.

If the strappend implementation differs from the reference implementation then strappend is wrong.
If the reference implementation is behaving differently than it should, then there is an error in the spec.

## Compiled Versions

The strappend implementations functions in 3 modes:

1. Pre-compiled: jQuery templates are pre-compiled to JavaScript functions so the parser does not need to be shipped with the application, and code-minifiers can inline/optimize the application along with the template code.
2. Production: jQuery templates are compiled as-needed in the client with `DEBUG = false` which removes most of the error checks and error messages to minimize download size and startup time.
3. Debug: jQuery templates are compiled as-needed in the client with rich error checks and error messages.

Run the Makefile to generate each of these versions.

## Server Side JS

This differs from the original jQuery templates in that it contains no
DOM dependencies, and compiled templates produce a string of HTML
instead of a DOM so that it can work well with Node.js and other server-side
JavaScript frameworks.
