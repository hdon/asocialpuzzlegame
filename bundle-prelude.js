/* DO NOT EDIT
 * Generated by bundle.js
 * This is a bundle containing require() and modules shared between server and web-browser.
 */
function require(modname)
{
  var moduleExports;
  if (modname in require._exports)
  {
    moduleExports = require._exports[modname];
    if (moduleExports._isFactoryFunction)
      return moduleExports(); // invoke module factory function
    return moduleExports;
  }
  throw new Error('No such module "'+modname+'"');
}
require._exports={};
/* Resolves a module's canonical name, given a reference from another module.
 * TODO support ../
 */
require._resolve = function(modname, from)
{
  from = from.substr(0,from.lastIndexOf("/")+1);
  if (modname.split("/")[0]==".")
    return from + modname.substr(2);
  else
    return modname;
};
require._requirer = function(from)
{
  return function(modname)
  {
    return require(require._resolve(modname, from));
  }
}
