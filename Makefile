REGULAR_AUTOESCAPE_SOURCES=src/minimal-escapers.js \
  src/jquery-templates-autoesc.js

CONTEXTESC_SOURCES=src/contextesc/context-defs.js \
  src/contextesc/escapers.js \
  src/contextesc/context-update.js \
  src/contextesc/contextesc.js

REFERENCE_SOURCES=src/jquery-templates-defs.js \
  src/jquery-templates-parser.js \
  src/jquery-templates-ref.js \
  src/jquery-templates-api.js

STRAPPEND_SOURCES=src/jquery-templates-defs.js \
  src/jquery-templates-parser.js \
  src/jquery-templates-impl.js \
  src/jquery-templates-api.js

OUTPUT_JS=build/jquery-templates-reference.js \
  build/jquery-templates-strappend.js \
  build/jquery-templates-compiled.js \
  build/jquery-templates-contextesc-compiled.js \
  build/jquery-templates-noparser-compiled.js \
  build/jquery-templates-contextesc-noparser-compiled.js

EXTERNS=--externs closure/externs.js \
  --externs closure/jquery-1.5.js \
  --externs closure/webkit_console.js

CLOSURE_COMPILER=java -jar closure/compiler.jar \
   --compilation_level ADVANCED_OPTIMIZATIONS

all: $(OUTPUT_JS) sizereport

clean:
	rm -f $(OUTPUT_JS) README.html

build/jquery-templates-reference.js: $(REFERENCE_SOURCES) $(REGULAR_AUTOESCAPE_SOURCES)
	@(echo "(function () {"; cat $^; echo " }())") > $@

build/jquery-templates-strappend.js: $(STRAPPEND_SOURCES) $(REGULAR_AUTOESCAPE_SOURCES)
	@(echo "(function () {"; cat $^; echo " }())") > $@

build/jquery-templates-compiled.js: $(STRAPPEND_SOURCES) $(REGULAR_AUTOESCAPE_SOURCES)
	@echo $^ | perl -pe 's/(?:^|\s+)(\S)/ --js $$1/g' \
	| xargs $(CLOSURE_COMPILER) \
	    $(EXTERNS) \
	    --define DEBUG=false \
	    --output_wrapper="(function(){%output%}())" \
	    | perl -pe 's/\bwindow.//g; s/;\}/}/g' \
	    > $@ \
	    || (rm $@; false)

build/jquery-templates-noparser-compiled.js: $(STRAPPEND_SOURCES) $(REGULAR_AUTOESCAPE_SOURCES)
	@echo $^ | perl -pe 's/(?:^|\s+)(\S)/ --js $$1/g' \
	| xargs $(CLOSURE_COMPILER) \
	    $(EXTERNS) \
	    --define DEBUG=false \
	    --define JQUERY_TMPL_PRECOMPILED=true \
	    --output_wrapper="(function(){%output%}())" \
	    | perl -pe 's/\bwindow.//g; s/;\}/}/g' \
	    > $@ \
	    || (rm $@; false)

build/jquery-templates-contextesc-compiled.js: $(STRAPPEND_SOURCES) $(CONTEXTESC_SOURCES) 
	@echo $^ | perl -pe 's/(?:^|\s+)(\S)/ --js $$1/g' \
	| xargs $(CLOSURE_COMPILER) \
	    $(EXTERNS) \
	    --define DEBUG=false \
	    --output_wrapper="(function(){%output%}())" \
	    | perl -pe 's/\bwindow.//g; s/;\}/}/g' \
	    > $@ \
	    || (rm $@; false)

build/jquery-templates-contextesc-noparser-compiled.js: $(STRAPPEND_SOURCES) $(CONTEXTESC_SOURCES) 
	@echo $^ | perl -pe 's/(?:^|\s+)(\S)/ --js $$1/g' \
	| xargs $(CLOSURE_COMPILER) \
	    $(EXTERNS) \
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
