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
DEBUG=true
VERSION=0.3.3
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

if [ "$DEBUG" = "true" ]; then
  exit 0
fi

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

# ==============================================================================
# Package it all up
# ==============================================================================

DATE=`date +%Y-%m-%d`

TARGET_WIN="$BASE.windows-$VERSION.zip"
TARGET_LIN="$BASE.linux-$VERSION.zip"
TARGET_MAC="$BASE.osx-$VERSION.zip"

# The version number is used to pick up the changelog which describes the release
CHANGELOG="changelogs/mofowallet-$VERSION.txt"
ANNOUNCEMENT="announcements/mofowallet-$VERSION.txt"

rm -f $ANNOUNCEMENT

SHA_SUM_1=`sha256sum "dist/releases/$TARGET_WIN"`
MD5_SUM_1=`md5sum "dist/releases/$TARGET_WIN"`
SHA_SUM_1=${SHA_SUM_1%\ *}
MD5_SUM_1=${MD5_SUM_1%\ *}

SHA_SUM_2=`sha256sum "dist/releases/$TARGET_LIN"`
MD5_SUM_2=`md5sum "dist/releases/$TARGET_LIN"`
SHA_SUM_2=${SHA_SUM_2%\ *}
MD5_SUM_2=${MD5_SUM_2%\ *}

SHA_SUM_3=`sha256sum "dist/releases/$TARGET_MAC"`
MD5_SUM_3=`md5sum "dist/releases/$TARGET_MAC"`
SHA_SUM_3=${SHA_SUM_2%\ *}
MD5_SUM_3=${MD5_SUM_2%\ *}

BANNER=$(cat <<'END_HEREDOC'
 /$$$$$$$$ /$$$$$$ /$$      /$$          Release : #VERSION#          
| $$_____/|_  $$_/| $$$    /$$$          Date    : #DATE#          
| $$        | $$  | $$$$  /$$$$                  
| $$$$$     | $$  | $$ $$/$$ $$          http://fimk.fi       
| $$__/     | $$  | $$  $$$| $$          http://mofowallet.com
| $$        | $$  | $$\  $ | $$          http://forum.fimk.fi          
| $$       /$$$$$$| $$ \/  | $$          https://github.com/fimkrypto/mofowallet
|__/      |______/|__/     |__/                 
                     /$$                                       /$$              
                    | $$                                      | $$              
                    | $$   /$$  /$$$$$$  /$$   /$$  /$$$$$$  /$$$$$$    /$$$$$$ 
                    | $$  /$$/ /$$__  $$| $$  | $$ /$$__  $$|_  $$_/   /$$__  $$
                    | $$$$$$/ | $$  \__/| $$  | $$| $$  \ $$  | $$    | $$  \ $$
                    | $$_  $$ | $$      | $$  | $$| $$  | $$  | $$ /$$| $$  | $$
                    | $$ \  $$| $$      |  $$$$$$$| $$$$$$$/  |  $$$$/|  $$$$$$/
                    |__/  \__/|__/       \____  $$| $$____/    \___/   \______/ 
                                         /$$  | $$| $$                          
                                        |  $$$$$$/| $$                          
                                         \______/ |__/            


                                presents:


             /$$      /$$            /$$$$$$                               
            | $$$    /$$$           /$$__  $$                              
            | $$$$  /$$$$  /$$$$$$ | $$  \__//$$$$$$                       
            | $$ $$/$$ $$ /$$__  $$| $$$$   /$$__  $$                      
            | $$  $$$| $$| $$  \ $$| $$_/  | $$  \ $$                      
            | $$\  $ | $$| $$  | $$| $$    | $$  | $$                      
            | $$ \/  | $$|  $$$$$$/| $$    |  $$$$$$/                      
            |__/     |__/ \______/ |__/     \______/                       
                                                                           
                                                                           
                                                                           
                         /$$      /$$           /$$ /$$             /$$    
                        | $$  /$ | $$          | $$| $$            | $$    
                        | $$ /$$$| $$  /$$$$$$ | $$| $$  /$$$$$$  /$$$$$$  
                        | $$/$$ $$ $$ |____  $$| $$| $$ /$$__  $$|_  $$_/  
                        | $$$$_  $$$$  /$$$$$$$| $$| $$| $$$$$$$$  | $$    
                        | $$$/ \  $$$ /$$__  $$| $$| $$| $$_____/  | $$ /$$
                        | $$/   \  $$|  $$$$$$$| $$| $$|  $$$$$$$  |  $$$$/
                        |__/     \__/ \_______/|__/|__/ \_______/   \___/  

END_HEREDOC
)

cat > $ANNOUNCEMENT <<EOF
$BANNER

`cat $CHANGELOG`



                             ~~~ DOWNLOAD ~~~

https://github.com/fimkrypto/mofowallet/releases/download/v$VERSION/$TARGET_WIN
 
SHA256 $SHA_SUM_1
MD5    $MD5_SUM_1

https://github.com/fimkrypto/mofowallet/releases/download/v$VERSION/$TARGET_LIN
 
SHA256 $SHA_SUM_2
MD5    $MD5_SUM_2

https://github.com/fimkrypto/mofowallet/releases/download/v$VERSION/$TARGET_MAC
 
SHA256 $SHA_SUM_3
MD5    $MD5_SUM_3

EOF

orig=#VERSION#
sed -i "s/${orig}/${VERSION}/g" $ANNOUNCEMENT

orig=#DATE#
sed -i "s/${orig}/${DATE}/g" $ANNOUNCEMENT

gpg --clearsign --batch $ANNOUNCEMENT
mv $ANNOUNCEMENT.asc $ANNOUNCEMENT

echo "========================================================================="
echo "== Successfully generated new version"
echo "=="
echo "=="
echo "== Checklist.."
echo "=="
echo "== 1. Did you update the version number in README.txt ?"
echo "=="
echo "=="
echo "== Final actions.."  
echo "=="
echo "== 1. Github release: https://github.com/fimkrypto/fimk/releases/tag/v$VERSION"
echo "== 2. Update version aliases"
echo "==    nrsversion=$VERSION $SHA_SUM"
echo "=="
echo "=="
echo "========================================================================="