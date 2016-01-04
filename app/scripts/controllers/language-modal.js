/**
 * The MIT License (MIT)
 * Copyright (c) 2016 Krypto Fin ry and the FIMK Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * */
(function () {
'use strict';
var module = angular.module('fim.base');
module.controller('LanguageModalController', function (items, $scope, settings, $modalInstance) {
  $scope.items = items;
  $scope.close = function () {
    settings.update('initialization.user_selected_language', true);
    $modalInstance.close($scope.items);
  }

  $scope.languages = [
    ['en', 'English', 'English', true],
    ['fi', 'Suomi', 'Finnish', true],
    ['af', 'Afrikaans', 'Afrikaans'],
    ['sq', 'Shqip', 'Albanian'],
    ['ar', 'العربية', 'Arabic'],
    ['az', 'azərbaycan dili', 'Azerbaijani'],
    ['eu', 'euskara', 'Basque'],
    ['bn', 'বাংলা', 'Bengali'],
    ['be', 'беларуская мова', 'Belarusian'],
    ['bg', 'български език', 'Bulgarian'],
    ['ca', 'català', 'Catalan'],
    ['zh', '简化中国', 'Chinese_Simplified'],
    ['zh-TW', '中國傳統', 'Chinese_Traditional'],
    ['hr', 'hrvatski jezik', 'Croatian'],
    ['cs', 'čeština, český jazyk', 'Czech'],
    ['da', 'dansk', 'Danish'],
    ['nl', 'Nederlands', 'Dutch'],
    ['eo', 'Esperanto', 'Esperanto'],
    ['et', 'eesti', 'Estonian'],
    ['tl', 'Wikang Filipino', 'Filipino'],
    ['fr', 'Français', 'French'],
    ['gl', 'Galego', 'Galician'],
    ['ka', 'ქართული', 'Georgian'],
    ['de', 'Deutsch', 'German'],
    ['el', 'Ελληνικά', 'Greek'],
    ['gu', 'ગુજરાતી', 'Gujarati'],
    ['ht', 'Kreyòl Ayisyen', 'Haitian_Creole'],
    ['iw', 'עברית', 'Hebrew'],
    ['hi', 'हिन्दी', 'Hindi'],
    ['hu', 'Magyar', 'Hungarian'],
    ['is', 'Íslenska', 'Icelandic'],
    ['id', 'Bahasa Indonesia', 'Indonesian'],
    ['ga', 'Gaeilge', 'Irish'],
    ['it', 'Italiano', 'Italian'],
    ['ja', '日本語', 'Japanese'],
    ['kn', 'ಕನ್ನಡ', 'Kannada'],
    ['ko', '조선말', 'Korean'],
    ['la', 'Latina', 'Latin'],
    ['lv', 'Latviešu', 'Latvian'],
    ['lt', 'Lietuvių', 'Lithuanian'],
    ['mk', 'Mакедонски', 'Macedonian'],
    ['ms', 'Bahasa Melayu', 'Malay'],
    ['mt', 'Malti', 'Maltese'],
    ['no', 'Norsk', 'Norwegian'],
    ['fa', 'فارسی', 'Persian'],
    ['pl', 'Polski', 'Polish'],
    ['pt', 'Português', 'Portuguese'],
    ['ro', 'Română', 'Romanian'],
    ['ru', 'Русский', 'Russian'],
    ['sr', 'Српски', 'Serbian'],
    ['sk', 'Slovenčina', 'Slovak'],
    ['sl', 'Slovenščina', 'Slovenian'],
    ['es', 'Español', 'Spanish'],
    ['sw', 'Kiswahili', 'Swahili'],
    ['sv', 'Svenska', 'Swedish'],
    ['ta', 'தமிழ்', 'Tamil'],
    ['te', 'తెలుగు', 'Telugu'],
    ['th', 'ไทย', 'Thai'],
    ['tr', 'Türkçe', 'Turkish'],
    ['uk', 'українська мова', 'Ukrainian'],
    ['ur', 'اردو', 'Urdu'],
    ['vi', 'Việtnam', 'Vietnamese'],
    ['cy', 'Cymraeg', 'Welsh'],
    ['yi', 'ייִדיש', 'Yiddish']
  ];

});
})();