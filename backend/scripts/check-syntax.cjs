const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
function check(dir) {
 for (const entry of readdirSync(dir,{withFileTypes:true})) {
  const path=join(dir,entry.name);
  if(entry.isDirectory()) check(path);
  else if(/\.(?:js|cjs)$/.test(path)) {
   const result=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});
   if(result.status!==0)process.exitCode=1;
  }
 }
}
for(const dir of ['src','scripts','test','integration']) check(dir);
