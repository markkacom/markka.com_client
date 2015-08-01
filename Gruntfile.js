// Generated on 2014-06-12 using generator-angular 0.9.0-1
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-html2js');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-node-webkit-builder');
  //grunt.loadNpmTasks('grunt-google-translate');
  grunt.loadTasks('vendor/grunt-google-translate/tasks');

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Configurable paths for the application
  var appConfig = {
    app: require('./bower.json').appPath || 'app',
    dist: 'dist',
    tmp: '.tmp'
  };

  var languages = [
    { n: "Afrikaans", c:"af" },
    { n: "Albanian", c:"sq" },
    { n: "Arabic", c:"ar" },
    { n: "Azerbaijani", c:"az" },  
    { n: "Basque", c:"eu" },
    { n: "Bengali", c:"bn" },
    { n: "Belarusian", c:"be" },  
    { n: "Bulgarian", c:"bg" },
    { n: "Catalan", c:"ca" },
    { n: "Chinese Simplified", c:"zh" },
    { n: "Chinese Traditional", c:"zh-TW" },
    { n: "Croatian", c:"hr" },
    { n: "Czech", c:"cs" },
    { n: "Danish", c:"da" },
    { n: "Dutch", c:"nl" },
    { n: "English", c:"en" },
    { n: "Esperanto", c:"eo" },
    { n: "Estonian", c:"et" },
    { n: "Filipino", c:"tl" },
    { n: "Finnish", c:"fi" },
    { n: "French", c:"fr" },
    { n: "Galician", c:"gl" },
    { n: "Georgian", c:"ka" },
    { n: "German", c:"de" },
    { n: "Greek", c:"el" },
    { n: "Gujarati", c:"gu" },  
    { n: "Haitian Creole", c:"ht" },
    { n: "Hebrew", c:"iw" },
    { n: "Hindi", c:"hi" },  
    { n: "Hungarian", c:"hu" },  
    { n: "Icelandic", c:"is" },  
    { n: "Indonesian", c:"id" },  
    { n: "Irish", c:"ga" },
    { n: "Italian", c:"it" },
    { n: "Japanese", c:"ja" },
    { n: "Kannada", c:"kn" },
    { n: "Korean", c:"ko" },
    { n: "Latin", c:"la" },
    { n: "Latvian", c:"lv" },
    { n: "Lithuanian", c:"lt" },
    { n: "Macedonian", c:"mk" },
    { n: "Malay", c:"ms" },
    { n: "Maltese", c:"mt" },
    { n: "Norwegian", c:"no" },
    { n: "Persian", c:"fa" },
    { n: "Polish", c:"pl" },
    { n: "Portuguese", c:"pt" },
    { n: "Romanian", c:"ro" },
    { n: "Russian", c:"ru" },
    { n: "Serbian", c:"sr" },
    { n: "Slovak", c:"sk" },
    { n: "Slovenian", c:"sl" },
    { n: "Spanish", c:"es" },
    { n: "Swahili", c:"sw" },
    { n: "Swedish", c:"sv" },
    { n: "Tamil", c:"ta" },
    { n: "Telugu", c:"te" },
    { n: "Thai", c:"th" },
    { n: "Turkish", c:"tr" },
    { n: "Ukrainian", c:"uk" },
    { n: "Urdu", c:"ur" },
    { n: "Vietnamese", c:"vi" },
    { n: "Welsh", c:"cy" },
    { n: "Yiddish", c:"yi" }  
  ];
  var restrictToLanguages = languages.map(function (language) { return language.c });

  // Define the configuration for all the tasks
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Project settings
    yeoman: appConfig,

    nodewebkit: {
      options: {
        version: '0.11.6',
        // https://github.com/mllrsohn/node-webkit-builder#optionswinico
        // macIcns: './icon.icns',
        // winIco: './win-icon.ico',
        build_dir: './dist',
        // choose what platforms to compile for here
        osx32: true,
        osx64: true,
        win32: true,
        win64: true,
        linux32: true,
        linux64: true
      },
      src: [
        './app/**/*',
        './node_modules/java-properties/**/*'
      ]
    },

    google_translate: {
      default_options: {
        options: {
          srcPath: '<%= yeoman.app %>/i18n/**/en.json',
          sourceLanguageCode: 'en',
          googleApiKey: 'AIzaSyB_ByI7WlHNfELDOCqyJ-57_UhSjwJt-D8',
          restrictToLanguages: restrictToLanguages /*.slice(-13).slice(0, 1)*/
        }
      }
    },

    // Watches files for changes and runs tasks based on the changed files
    watch: {
      bower: {
        files: ['bower.json'],
        tasks: ['wiredep']
      },
      js: {
        files: [
          '<%= yeoman.app %>/scripts/{,*/}*.js',
          '<%= yeoman.app %>/plugins/{,*/}*.js'
        ],
        tasks: ['newer:jshint:all'],
        options: {
          livereload: '<%= connect.options.livereload %>'
        }
      },
      jsTest: {
        files: ['test/spec/{,*/}*.js'],
        tasks: ['newer:jshint:test', 'karma']
      },
      styles: {
        files: [
          '<%= yeoman.app %>/styles/{,*/}*.css',
          '<%= yeoman.app %>/styles/variables.less',
          '<%= yeoman.app %>/plugins/{,*/}*.css'
        ],
        tasks: ['newer:copy:styles', 'autoprefixer', 'exec:bootswatch']
      },
      sass: {
        files: ['<%= yeoman.app %>/styles/{,*/}*.sass'],
        tasks: ['sass:dist']
      },
      less: {
        files: ['<%= yeoman.app %>/styles/{,*/}*.less'],
        tasks: ['less:dist']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files: [
          '<%= yeoman.app %>/{,*/}*.html',
          '.tmp/styles/{,*/}*.css',
          '<%= yeoman.app %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },

    exec: {
      bootswatch: {
        command: 'ruby bootswatch.rb',
        stdout: true        
      }
    },    

    // The actual grunt server settings
    connect: {
      options: {
        port: 9000,
        // Change this to '0.0.0.0' to access the server from outside.
        hostname: 'localhost',
        livereload: 35729
      },
      livereload: {
        options: {
          open: true,
          middleware: function (connect) {
            return [
              connect.static('.tmp'),
              connect().use(
                '/bower_components',
                connect.static('./bower_components')
              ),
              connect.static(appConfig.app)
            ];
          }
        }
      },
      test: {
        options: {
          port: 9001,
          middleware: function (connect) {
            return [
              connect.static('.tmp'),
              connect.static('test'),
              connect().use(
                '/bower_components',
                connect.static('./bower_components')
              ),
              connect.static(appConfig.app)
            ];
          }
        }
      },
      dist: {
        options: {
          open: true,
          base: '<%= yeoman.dist %>'
        }
      }
    },

    // Sass
    sass: {
      dist: {
        options: {
          style: 'expanded'
        },
        files: {
          '<%= yeoman.tmp %>/styles/main.css': '<%= yeoman.app %>/styles/main.sass',       // 'destination': 'source'
          '<%= yeoman.app %>/styles/main.css': '<%= yeoman.app %>/styles/main.sass'
        }
      }
    },

    // Less
    less: {
      dist: {
        options: {
          style: 'expanded'
        },
        files: {
          '<%= yeoman.tmp %>/styles/main-less.css': '<%= yeoman.app %>/styles/main.less',       // 'destination': 'source'
          '<%= yeoman.app %>/styles/main-less.css': '<%= yeoman.app %>/styles/main.less'
        }
      }
    },

    // Turn partials into single partial script
    html2js: {
      options: {
        // custom options, see below
      },
      main: {
        src: [
          '<%= yeoman.app %>/partials/{,*/}*.html',
          '<%= yeoman.app %>/plugins/{,*/}*.html'
        ],
        dest: '.tmp/scripts/templates.js'
      },
    },

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish'),
        force: true
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= yeoman.app %>/scripts/controllers/*.js',
          '<%= yeoman.app %>/scripts/directives/*.js',
          '<%= yeoman.app %>/scripts/services/*.js',
          '<%= yeoman.app %>/scripts/*.js',
          '<%= yeoman.app %>/plugins/{,*/}*.js'
        ]
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['test/spec/{,*/}*.js']
      }
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= yeoman.dist %>/{,*/}*',
            '!<%= yeoman.dist %>/.git*'
          ]
        }]
      },
      server: '.tmp'
    },

    // Add vendor prefixed styles
    autoprefixer: {
      options: {
        browsers: ['last 1 version']
      },
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/styles/',
          src: '{,*/}*.css',
          dest: '.tmp/styles/'
        }]
      }
    },

    // Automatically inject Bower components into the app
    wiredep: {
      app: {
        src: ['<%= yeoman.app %>/index.html'],
        ignorePath: new RegExp('^<%= yeoman.app %>/|../')
      }
    },

    // Renames files for browser caching purposes
    filerev: {
      dist: {
        src: [
          '<%= yeoman.dist %>/scripts/{,*/}*.js',
          '<%= yeoman.dist %>/styles/{,*/}*.css',
          //'<%= yeoman.dist %>/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}',
          //'<%= yeoman.dist %>/styles/fonts/*'
        ]
      }
    },

    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      html: '<%= yeoman.app %>/index.html',
      options: {
        dest: '<%= yeoman.dist %>',
        flow: {
          html: {
            steps: {
              js: ['concat', 'uglifyjs'],
              css: ['cssmin']
            },
            post: {}
          }
        }
      }
    },

    // Performs rewrites based on filerev and the useminPrepare configuration
    usemin: {
      html: ['<%= yeoman.dist %>/{,*/}*.html'],
      css: ['<%= yeoman.dist %>/styles/{,*/}*.css'],
      options: {
        assetsDirs: ['<%= yeoman.dist %>','<%= yeoman.dist %>/images']
      }
    },

    // The following *-min tasks will produce minified files in the dist folder
    // By default, your `index.html`'s <!-- Usemin block --> will take care of
    // minification. These next options are pre-configured if you do not wish
    // to use the Usemin blocks.
    // cssmin: {
    //   dist: {
    //     files: {
    //       '<%= yeoman.dist %>/styles/main.css': [
    //         '.tmp/styles/{,*/}*.css'
    //       ]
    //     }
    //   }
    // },
    uglify: {
      dist: {
        files: {
          '<%= yeoman.dist %>/scripts/scripts.js': [
            '<%= yeoman.dist %>/scripts/scripts.js'
          ]
        }
      }
    },
    // concat: {
    //   dist: {}
    // },

    imagemin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.{png,jpg,jpeg,gif}',
          dest: '<%= yeoman.dist %>/images'
        }]
      }
    },

    svgmin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.svg',
          dest: '<%= yeoman.dist %>/images'
        }]
      }
    },

    htmlmin: {
      dist: {
        options: {
          collapseWhitespace: true,
          conservativeCollapse: true,
          collapseBooleanAttributes: true,
          removeCommentsFromCDATA: true,
          removeOptionalTags: true
        },
        files: [{
          expand: true,
          cwd: '<%= yeoman.dist %>',
          src: ['*.html', 'views/{,*/}*.html','partials/{,*/}*.html','plugins/{,*/}*.html'],
          dest: '<%= yeoman.dist %>'
        }]
      }
    },

    // ngmin tries to make the code safe for minification automatically by
    // using the Angular long form for dependency injection. It doesn't work on
    // things like resolve or inject so those have to be done manually.
    ngmin: {
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/concat/scripts',
          src: '*.js',
          dest: '.tmp/concat/scripts'
        }]
      }
    },

    // Replace Google CDN references
    cdnify: {
      dist: {
        html: ['<%= yeoman.dist %>/*.html']
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.app %>',
          dest: '<%= yeoman.dist %>',
          src: [
            '*.{csv,ico,png,txt,js,swf}',
            '.htaccess',
            '*.html',
            'views/{,*/}*.html',
            'partials/{,*/}*.html',
            'i18n/*',
            'plugins/**/*',
            '!plugins/**/*.js',
            'amstockchart/**/*',
            'JSON/{,*/}*.json',
            'images/{,*/}*.{webp,wav}',
            'fonts/*'
          ]
        }, {
          expand: true,
          cwd: '.tmp/images',
          dest: '<%= yeoman.dist %>/images',
          src: ['generated/*']
        }, {
          expand: true,
          cwd: '<%= yeoman.app %>/bower_components/bootstrap/dist',
          src: [
            'fonts/*',
          ],
          dest: '<%= yeoman.dist %>'
        }, {
          expand: true,
          cwd: '<%= yeoman.app %>/bower_components/font-awesome',
          src: [
            'fonts/*',
          ],
          dest: '<%= yeoman.dist %>'
        }]
      },
      styles: {
        expand: true,
        cwd: '<%= yeoman.app %>/styles',
        dest: '.tmp/styles/',
        src: '{,*/}*.css'
      },
      devDist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.app %>',
          dest: '<%= yeoman.dist %>',
          src: [
            '*.{csv,ico,png,txt,js,swf}',
            '.htaccess',
            '*.html',
            'views/{,*/}*.html',
            'partials/{,*/}*.html',
            'i18n/{,*/}*.json',
            'plugins/**/*',
            'JSON/{,*/}*.json',
            'images/{,*/}*.{webp}',
            'fonts/*',
            'bower_components/**/*',
            'scripts/**/*',
            'styles/**/*'
          ]
        }, {
          expand: true,
          cwd: '.tmp/images',
          dest: '<%= yeoman.dist %>/images',
          src: ['generated/*']
        }, {
          expand: true,
          cwd: 'bower_components/bootstrap/dist',
          src: 'fonts/*',
          dest: '<%= yeoman.dist %>'
        }]
      },      
    },

    // Run some tasks in parallel to speed up the build process
    concurrent: {
      server: [
        'copy:styles'
      ],
      test: [
        'copy:styles'
      ],
      dist: [
        'copy:styles',
        'imagemin',
        'svgmin'
      ]
    },

    // Test settings
    karma: {
      unit: {
        configFile: 'test/karma.conf.js',
        singleRun: true
      }
    },
  });


  grunt.registerTask('serve', 'Compile then start a connect web server', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'connect:dist:keepalive']);
    }

    grunt.task.run([
      'clean:server',
      'wiredep',
      'concurrent:server',
      'autoprefixer',
      'connect:livereload',
      'watch'
    ]);
  });

  grunt.registerTask('server', 'DEPRECATED TASK. Use the "serve" task instead', function (target) {
    grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
    grunt.task.run(['serve:' + target]);
  });

  grunt.registerTask('test', [
    'clean:server',
    'concurrent:test',
    'autoprefixer',
    'connect:test',
    'karma'
  ]);

  grunt.registerTask('build', [
    'clean:dist',
    //'html2js',
    //'google_translate',
    'wiredep',
    'useminPrepare',
    'concurrent:dist',
    'autoprefixer',
    'concat',
    'ngmin',
    // 'nodewebkit',
    'copy:dist',
    'cdnify',
    'sass:dist',
    'less:dist',
    'cssmin',
    'uglify',
    'filerev',
    'usemin',
    //'htmlmin',
  ]);

  grunt.registerTask('build-uncompressed', [
    'clean:dist',
    //'html2js',
    //'google_translate',
    'wiredep',
    'useminPrepare',
    'concurrent:dist',
    'autoprefixer',
    // 'concat',
    //'ngmin',
    // 'nodewebkit',
    'copy:devDist',
    // 'cdnify',
    'sass:dist',
    'less:dist',
    'cssmin',
    // 'uglify',
    'filerev',
    // 'usemin',
    //'htmlmin',
  ]);  

  grunt.registerTask('default', [
    'newer:jshint',
    'test',
    'build'
  ]);
};
