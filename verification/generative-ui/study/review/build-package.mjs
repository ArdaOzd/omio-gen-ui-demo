import{mkdir,readFile,writeFile,readdir,copyFile,access}from'node:fs/promises';
import{resolve,join}from'node:path';
import{buildReviewPackage}from'./package.mjs';
const[source,output,participant]=process.argv.slice(2);
if(!source||!output||!participant)throw new Error('Usage: node build-package.mjs <matrix-artifacts-directory> <new-output-directory> anonymous-001');
const directory=resolve(source),destination=resolve(output),records=[];
for(const name of(await readdir(directory)).sort()){
 if(!name.endsWith('.json')||['results.json','run-status.json'].includes(name))continue;
 const record=JSON.parse(await readFile(join(directory,name),'utf8'));if(!record.id||!record.variant)continue;if(!/^[a-z0-9-]+$/.test(record.id))throw new Error('Invalid recorded cell ID');
 try{await access(join(directory,`${record.id}.png`));record.captureAvailable=true}catch{record.captureAvailable=false}
 records.push(record);
}
const packet=buildReviewPackage(records,{participant});
await mkdir(destination,{recursive:false});await mkdir(join(destination,'public'));await mkdir(join(destination,'public','captures'));await mkdir(join(destination,'private'),{mode:0o700});await mkdir(join(destination,'private','raw-captures'),{mode:0o700});
for(const item of packet.public.items)if(item.captureAvailable)await copyFile(join(directory,`${packet.private.items[item.token].cellId}.png`),join(destination,'private','raw-captures',`${item.token}.png`));
await writeFile(join(destination,'public','manifest.json'),JSON.stringify(packet.public,null,2));await writeFile(join(destination,'public','ratings-template.json'),JSON.stringify(packet.template,null,2));await writeFile(join(destination,'private','identity-map.json'),JSON.stringify(packet.private,null,2),{mode:0o600});
console.log(JSON.stringify({output:destination,participant,items:packet.public.items.length,humanRatings:null,skipped:packet.private.skipped.length}));
