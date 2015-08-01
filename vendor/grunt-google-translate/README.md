# grunt-google-translate

> Automatically generate localized json files using angular-translate source files, and Google Translate REST API

## Getting Started
This plugin requires Grunt `~0.4.4`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-google-translate --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-google-translate');
```

## The "google_translate" task

### Overview
In your project's Gruntfile, add a section named `google_translate` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  google_translate: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### options.googleApiKey
Type: `String`
Default value: ``

The API key used to access Google Translation services.

#### options.sourceLanguageCode
Type: `String`
Default value: `en`

The language code that will be treated as the "source".

#### options.srcPath
Type: `String`
Default value: `./il8n/**/en.json`

The path Grunt will use to find the available source files.

#### options.restrictToLanguages
Type: `Array`
Default value: `[]`

If included, the translation will be limited to the language codes provided in the array.  For example:

['de','fr']

will only create German and French translations.

### Usage Examples

This example will first generate Spanish and German translations from English.  It will then USE the German translation as the source, and generate a French translation.

```js
grunt.initConfig({
    google_translate: {
      default_options: {
        options: {
            srcPath: './il8n/**/en.json'
            sourceLanguageCode: 'en',
            googleApiKey: '<INSERT GOOGLE API KEY HERE>',
            restrictToLanguages: ['es', 'de']
        }
      },
    german_to_french: {
        options: {
            googleApiKey: '<INSERT GOOGLE API KEY HERE>',
            restrictToLanguages: ['fr'],
            sourceLanguageCode: 'de'
        }
      }
    }
 });
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_
