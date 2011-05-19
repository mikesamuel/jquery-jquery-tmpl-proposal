REFERENCE_SOURCES=src/minimal-escapers.js src/jquery-templates-defs.js src/jquery-templates-parser.js src/jquery-templates-ref.js src/jquery-templates-builtins.js

STRAPPEND_SOURCES=src/minimal-escapers.js src/jquery-templates-defs.js src/jquery-templates-parser.js src/jquery-templates-impl.js src/jquery-templates-builtins.js

OUTPUT_JS=build/jquery-templates-reference.js build/jquery-templates-strappend.js build/jquery-templates-compiled.js

all: $(OUTPUT_JS) sizereport

clean:
	@rm -f $(OUTPUT_JS) README.html

build/jquery-templates-reference.js: $(REFERENCE_SOURCES)
	@(echo "(function () {"; cat $^; echo " })()") > $@

build/jquery-templates-strappend.js: $(STRAPPEND_SOURCES)
	@(echo "(function () {"; cat $^; echo " })()") > $@

build/jquery-templates-compiled.js: $(STRAPPEND_SOURCES)
	@echo $(STRAPPEND_SOURCES) | perl -pe 's/(?:^|\s+)(\S)/ --js $$1/g' \
	| xargs java -jar closure/compiler.jar \
	    --compilation_level ADVANCED_OPTIMIZATIONS \
	    --externs src/externs.js \
	    --define DEBUG=false \
	    --output_wrapper="(function(){%output%}())" \
	    | perl -pe 's/\bwindow.//g; s/;\}/}/g' \
	    > $@ \
	    || (rm $@; false)

sizereport: build/jquery-templates-compiled.js
	@echo Size of compiled version
	@wc -c build/jquery-templates-compiled.js
	@echo Size of compiled version gzipped
	@bash -c 'wc -c <(gzip -c build/jquery-templates-compiled.js)'

README.html: README.md
	@python $(MARKDOWN_HOME)/markdown.py README.md > README.html
