REGULAR_AUTOESCAPE_SOURCES=src/minimal-escapers.js

CONTEXTESC_SOURCES=src/contextesc/context-defs.js src/contextesc/escapers.js

REFERENCE_SOURCES=src/jquery-templates-defs.js src/jquery-templates-parser.js src/jquery-templates-ref.js src/jquery-templates-builtins.js

STRAPPEND_SOURCES=src/jquery-templates-defs.js src/jquery-templates-parser.js src/jquery-templates-impl.js src/jquery-templates-builtins.js

OUTPUT_JS=build/jquery-templates-reference.js build/jquery-templates-strappend.js build/jquery-templates-compiled.js build/jquery-templates-noparser-compiled.js build/jquery-templates-contextesc-noparser-compiled.js

all: $(OUTPUT_JS) sizereport

clean:
	rm -f $(OUTPUT_JS) README.html

build/jquery-templates-reference.js: $(REGULAR_AUTOESCAPE_SOURCES) $(REFERENCE_SOURCES)
	@(echo "(function () {"; cat $^; echo " })()") > $@

build/jquery-templates-strappend.js: $(REGULAR_AUTOESCAPE_SOURCES) $(STRAPPEND_SOURCES)
	@(echo "(function () {"; cat $^; echo " })()") > $@

build/jquery-templates-compiled.js: $(REGULAR_AUTOESCAPE_SOURCES) $(STRAPPEND_SOURCES)
	@echo $^ | perl -pe 's/(?:^|\s+)(\S)/ --js $$1/g' \
	| xargs java -jar closure/compiler.jar \
	    --compilation_level ADVANCED_OPTIMIZATIONS \
	    --externs src/externs.js \
	    --define DEBUG=false \
	    --output_wrapper="(function(){%output%}())" \
	    | perl -pe 's/\bwindow.//g; s/;\}/}/g' \
	    > $@ \
	    || (rm $@; false)

build/jquery-templates-noparser-compiled.js: $(REGULAR_AUTOESCAPE_SOURCES) $(STRAPPEND_SOURCES)
	@echo $^ | perl -pe 's/(?:^|\s+)(\S)/ --js $$1/g' \
	| xargs java -jar closure/compiler.jar \
	    --compilation_level ADVANCED_OPTIMIZATIONS \
	    --externs src/externs.js \
	    --define DEBUG=false \
	    --define JQUERY_TMPL_PRECOMPILED=true \
	    --output_wrapper="(function(){%output%}())" \
	    | perl -pe 's/\bwindow.//g; s/;\}/}/g' \
	    > $@ \
	    || (rm $@; false)

build/jquery-templates-contextesc-noparser-compiled.js: $(CONTEXTESC_SOURCES) $(STRAPPEND_SOURCES)
	@echo $^ | perl -pe 's/(?:^|\s+)(\S)/ --js $$1/g' \
	| xargs java -jar closure/compiler.jar \
	    --compilation_level ADVANCED_OPTIMIZATIONS \
	    --externs src/externs.js \
	    --define DEBUG=false \
	    --define JQUERY_TMPL_PRECOMPILED=true \
	    --output_wrapper="(function(){%output%}())" \
	    | perl -pe 's/\bwindow.//g; s/;\}/}/g' \
	    > $@ \
	    || (rm $@; false)

sizereport: $(OUTPUT_JS)
	@for version in $^; do \
	  echo $$version; \
	  echo ==============================================; \
          gzip -9 -c $$version > /tmp/gzipped; \
	  wc -c $$version /tmp/gzipped; \
	  echo; \
	done

README.html: README.md
	@python $(MARKDOWN_HOME)/markdown.py README.md > README.html
