/*
 * grunt-google-translate
 * https://github.com/MartyIce/grunt-google-translate
 *
 * Copyright (c) 2014 Marty Mavis
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
//        '<%= nodeunit.tests %>',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp'],
    },

    // Configuration to be run (and then tested).
    google_translate: {
      default_options: {
        options: {
            googleApiKey: 'AIzaSyCccl9zJIUgjCORxdpZ8YLn8Qr5Twu_-fg',
            restrictToLanguages: ['af']
        }
      },
    german_to_french: {
        options: {
            googleApiKey: 'AIzaSyCccl9zJIUgjCORxdpZ8YLn8Qr5Twu_-fg',
            restrictToLanguages: ['fr'],
            sourceLanguageCode: 'de'
        }
      }
    }

//    // Unit tests.
//    nodeunit: {
//      tests: ['test/*_test.js'],
//    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
//  grunt.registerTask('test', ['clean', 'google_translate', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'google_translate']);
//  grunt.registerTask('default', ['jshint', 'test']);

};
