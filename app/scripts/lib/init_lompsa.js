try {
  isNodeJS = typeof require == 'function' && require('child_process');
} catch (e) {
  isNodeJS = false;
}
DEBUG = false;

if (IS_TEST_NET === false) {
  if (("www.mofowallet.com" == window.location.host || 
       "mofowallet.com" == window.location.host) && (window.location.protocol != "https:")) {
    window.location.protocol = "https";
  }
  else if ("fimkrypto.github.io" == window.location.host) {
    window.location = "https://www.mofowallet.com/launch.html" + window.location.hash;
  }
}

var entityMap = {"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;',"/":'&#x2F;',"\n":'<br>'};
function escapeHtml(string) {
  return String(string).replace(/[&<>"'\/]|[\n]/g, function (s) {
    return entityMap[s];
  });
}