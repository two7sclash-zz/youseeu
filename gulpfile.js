// Requiring Gulp
var gulp = require('gulp'); 
var watch = require('gulp-watch');
var mammoth = require("mammoth");
var dive = require('dive');
var jsdom = require("jsdom");
var path = require('path');
var fileSave = require('file-save');
var header = require('gulp-header');
var htmltidy = require('gulp-htmltidy');
var replace = require('gulp-replace');
var debug = require('gulp-debug');
var gulpMultinject = require('gulp-multinject');
var htmlreplace = require('gulp-html-replace');

// Basic Gulp task syntax
gulp.task('word2html', function () {
    
  dive("app", function(err, file) {
      
      function transformElement(element) {
            if (element.children) {
                element.children.forEach(transformElement);
            }
            if (element.type === "paragraph") {
                if (element.alignment === "center" && !element.styleId) {
                    element.styleId = "Heading2";
                }
            }
            
            //fileSave( file.replace('docx', 'json').toLowerCase() )
            //.write( JSON.stringify(element), 'utf8' )
            
            return element;
        }
     
        var options = {
            transformDocument: transformElement
        };
      
      if (path.extname(file) == ".docx") {
      mammoth.convertToHtml({path: file}, options)
        .then(function(result){
            var html = result.value; // The generated HTML 
            var messages = result.messages; // Any messages, such as warnings during conversion
            
            jsdom.env(html, ["http://code.jquery.com/jquery.js"], function (err, window) {
                var $ = window.$;
                
                $("p strong").each(function(){
                    if ( !$(this)[0].nextSibling ) {
                        $(this).unwrap().wrap('<h2></h2>');
                    }
                });
                $("h2 strong").contents().unwrap();
                $('h2').each(function(){
                    $(this).nextUntil('h2').add($(this)).wrapAll('<section class="sect2" data-role="collapsible"></section>');
                });
                $('.jsdom').before("<!-- build:js -->");
                $('.jsdom').after("<!-- endbuild -->");
                $( "h2:contains('YSU Experiential Exercises Group Project Activity Instructions Template')" ).parent('section').remove();
                $( "p:contains('LO:')" ).remove();
                $( "p:contains('LO Narrative:')" ).remove();
                $( "p:contains('Bloom')" ).remove();
                
                fileSave( file.toLowerCase().replace('docx', 'html') )
                .write( window.document.body.innerHTML, 'utf8' )
            });
            
            console.log("Log:",file, messages);
            
        })
        .done(); 
      }
 
    });  
    
})


gulp.task('watch', ['word2html'], function() {
  watch('app/*.html')
            .pipe( htmltidy() )
            .pipe(replace('</head>', '<!--INJECT:adminNamespace-->\n<!--END INJECT-->\n</head>'))
            .pipe(replace(/&lt;.*&gt;/g, ''))
            .pipe(htmlreplace({
                'js': ''
            }))
            .pipe(gulpMultinject([
                'http://code.jquery.com/jquery-1.11.1.min.js',
                'http://code.jquery.com/mobile/1.4.5/jquery.mobile-1.4.5.min.js',
                'http://code.jquery.com/mobile/1.4.4/jquery.mobile-1.4.4.min.css',
                './main.css'
              ],
              'adminNamespace'
            ))
            .pipe( htmltidy() )
            .pipe(debug({title: 'Processed:'}))
            .pipe( gulp.dest('dist') )
  });