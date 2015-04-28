# ##############################################################################
#
# Builds mofowallet web edition and publishes the result on mofowallet.com
#
# ##############################################################################

echo "start building mofowallet"
# grunt build
echo "successfully built mofowallet"

# copy over all code to git/mofo
echo "copy mofo files to jekyll repo"
MOFO_FILES="dist/fonts dist/images dist/partials dist/plugins dist/scripts dist/styles dist/favicon.ico dist/i18n dist/amstockchart"
cp -r -p $MOFO_FILES ~/git/mofo
cp dist/index.html ~/git/mofo/launch.html
DATE=`date`
echo "<!--$DATE-->" >> ~/git/mofo/launch.html
echo "successfully copied mofo files to jekyll repo"

cd ~/git/mofo
echo "start jekyll build"
bundle exec jekyll build
echo "done"

git add --all
git commit -am 'Update mofo'
git push origin gh-pages