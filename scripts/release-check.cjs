// Local, non-deploying release checks. Integration tests own an ephemeral DB.
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const root=resolve(__dirname,'..');
const status=spawnSync('git',['status','--short','--branch'],{cwd:root,encoding:'utf8'});
process.stdout.write(status.stdout);
const checks=[
 ['backend syntax','backend',['run','check']],
 ['incident fixtures','backend',['run','evaluate:fixtures']],
 ['backend unit/API/security','backend',['test']],
 ['isolated PostgreSQL','backend',['run','test:integration']],
 ['frontend lint','frontend',['run','lint']],
 ['frontend typecheck','frontend',['run','typecheck']],
 ['frontend production build','frontend',['run','build']],
 ['backend dependency audit','backend',['audit','--audit-level=moderate']],
 ['frontend dependency audit','frontend',['audit','--audit-level=moderate']],
];
const results=[];
for(const [name,dir,args] of checks) {
 const start=Date.now();const run=spawnSync('npm',args,{cwd:resolve(root,dir),stdio:'inherit',timeout:180000});
 results.push({name,pass:run.status===0,durationMs:Date.now()-start});
 if(run.status!==0) process.exitCode=1;
}
console.log(JSON.stringify({results,productionVerified:false,ownerGates:'Backup/restore, deployed environment, live AI quality, payment lifecycle, recovery email, policies and alert delivery still require separate verification.'},null,2));
