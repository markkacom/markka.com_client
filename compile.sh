# ##############################################################################
#
# This script compiles the Mofo Wallet source code for the various 
# supported nodewebkit platforms.
# 
# Supported platforms:
#
#   1. Windows (mofo.win.zip)
#   2. Linux   (mofo.lin.zip
#   3. MacOSX  (mofo.osx.zip)
#
# Requirements:
#
#   1. Compiled FIMK jar files (run compile.sh first)
#   2. Unpacked NXT jar files in dist/nxt
#   2. Installed grunt
#   3. Installed grunt nodewebkit
#
# Usage:
#
#   Usage is straightforward, just run this script and you'll end up with 
#   executables for all supported platforms. All platforms come with various 
#   helper libraries that for the embedded webkit libraries, these libraries 
#   (dll, so) are packaged together with the FIM Community Client source in 
#   a directory. That directory is then zipped. 
#
# ##############################################################################

VERSION=0.3
BASE=mofowallet

grunt nodewebkit

/bin/rm -r -f dist/linux
/bin/rm -r -f dist/win
/bin/rm -r -f dist/osx

mkdir dist/releases

echo "nodewebkit generated successfully"

FIM_FILES="../fimk/html/ ../fimk/lib/ ../fimk/logs/ ../fimk/fim.jar ../fimk/MIT-license.txt ../fimk/README.txt ../fimk/run.bat ../fimk/run.sh"
FIM_FILES_CONF="../fimk/conf/nxt-default.properties ../fimk/conf/logging-default.properties"

# ==============================================================================
# Linux
# ==============================================================================

# Copy FIM to the fim dir to allow addition of other servers later
mkdir -p dist/linux
mkdir -p dist/linux/fim
mkdir -p dist/linux/fim/conf
cp -r -p $FIM_FILES dist/linux/fim
cp -p $FIM_FILES_CONF dist/linux/fim/conf

# Copy over the mofowallet files
NW_LINUX="dist/mofowallet/linux32"
cp -r -p $NW_LINUX/* dist/linux

# Add the nxt installation files which are in dist/nxt (don't forget to remove the src folder !!)
cp -r -p dist/nxt dist/linux

# create the release zip
cd dist/linux
/bin/rm -f ../../dist/releases/$BASE.linux-$VERSION.zip
zip -qr -9 ../../dist/releases/$BASE.linux-$VERSION.zip .
cd ../..

echo "$BASE.linux-$VERSION.zip generated successfully"

# ==============================================================================
# Windows
# ==============================================================================

# Copy FIM to the fim dir to allow addition of other servers later
mkdir -p dist/win
mkdir -p dist/win/fim
mkdir -p dist/win/fim/conf
cp -r -p $FIM_FILES dist/win/fim
cp -p $FIM_FILES_CONF dist/win/fim/conf

# Copy over the mofowallet files
NW_WIN="dist/mofowallet/win"
cp -r -p $NW_WIN/* dist/win

# Add the nxt installation files which are in dist/nxt (don't forget to remove the src folder !!)
cp -r -p dist/nxt dist/win

# create the release zip
cd dist/win
/bin/rm -f ../../dist/releases/$BASE.windows-$VERSION.zip
zip -qr -9 ../../dist/releases/$BASE.windows-$VERSION.zip .
cd ../..

echo "$BASE.windows-$VERSION.zip generated successfully"

# ==============================================================================
# Osx 10.7 and up
# ==============================================================================

# Copy FIM to the fim dir to allow addition of other servers later
mkdir -p dist/osx
mkdir -p dist/osx/mofowallet.app/Contents/Resources/fim
mkdir -p dist/osx/mofowallet.app/Contents/Resources/fim/conf
cp -r -p $FIM_FILES dist/osx/mofowallet.app/Contents/Resources/fim
cp -p $FIM_FILES_CONF dist/osx/mofowallet.app/Contents/Resources/fim/conf

# Copy over the mofowallet files
NW_OSX="dist/mofowallet/osx"
cp -r -p $NW_OSX/* dist/osx

# Add the nxt installation files which are in dist/nxt (don't forget to remove the src folder !!)
cp -r -p dist/nxt dist/osx/mofowallet.app/Contents/Resources

# create the release zip
cd dist/osx
/bin/rm -f ../../dist/releases/$BASE.osx-$VERSION.zip
zip -qr -9 ../../dist/releases/$BASE.osx-$VERSION.zip .
cd ../..

echo "$BASE.osx-$VERSION generated successfully"
