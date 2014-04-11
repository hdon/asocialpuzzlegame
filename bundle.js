/* This won't work for cyclic module dependencies.
 */
var fs = require('fs')
  , path = require('path')
  , prelude
  , modTemplate
  , output = ''
  ;

prelude     = ''+fs.readFileSync('bundle-prelude.js');
modTemplate = ''+fs.readFileSync('bundle-module.js');
output += prelude;

fs.readdirSync('common').
  filter(function(s){return s.substr(s.length-3)=='.js'}).
  forEach(function(filename) {
    var modname, source;
    modname = './common/'+path.basename(filename);
    modname = modname.substr(0, modname.length-3);

    console.log('bundling module', modname);
    source = ''+fs.readFileSync('common/'+filename);
    output += modTemplate.
      replace(/"%MAGIC_MODULE_NAME%"/g, '"'+modname+'"').
      replace(/"%MAGIC_MODULE_SOURCE%"/g, source);
});

output += '/* End of bundled code */\n';
fs.writeFileSync('www/modules.js', output);
