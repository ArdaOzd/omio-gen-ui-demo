import{readFile,writeFile}from'node:fs/promises';
import{execFileSync}from'node:child_process';
import{createHash}from'node:crypto';
import{cpus,totalmem,platform,release,arch}from'node:os';
import{join}from'node:path';
import{fileURLToPath}from'node:url';
import{catalogHash,catalogVersion}from'../../../src/generative/catalog/generated/catalog.ts';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const command=(binary,args)=>{try{return execFileSync(binary,args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:5000}).trim()}catch{return null}};
export async function collectRunEnvironment({runtime,fixture,browser,seed,concurrency}){
 const packageSource=await readFile(join(root,'package.json'),'utf8'),lock=await readFile(join(root,'package-lock.json')),manifest=JSON.parse(packageSource),installedPackages={};
 for(const name of Object.keys({...manifest.dependencies,...manifest.devDependencies}).sort()){const installed=JSON.parse(await readFile(join(root,'node_modules',name,'package.json'),'utf8'));if(installed.name!==name||typeof installed.version!=='string')throw new Error('Installed package identity unavailable');installedPackages[name]=installed.version;}
 const checkoutRevision=command('git',['rev-parse','HEAD']),changedSource=command('git',['diff','--name-only','HEAD','--','src','agent','backend','package.json','package-lock.json','vite.config.js']);
 if(checkoutRevision!==runtime.appRevision||changedSource===null||changedSource!=='')throw new Error('Study checkout does not match the frozen served source');
 const eligibility=JSON.parse(await readFile(join(root,'verification/generative-ui/study/task-coverage-2026-10-03.json'),'utf8'));if(eligibility.sourceVersion!==fixture.sourceVersion)throw new Error('Source bounds eligibility evidence belongs to another fixture');
 const facts={sourceGlobalDateBounds:eligibility.globalFixtureDateBounds,sourceBoundsProvenance:'Same verified fixture generation as task-coverage-2026-10-03.json; distinct from browser resource windows',schemaVersion:1,checkoutRevision,runtime,fixture,catalog:{version:catalogVersion,hash:catalogHash},runtimes:{node:process.version,npm:command('npm',['--version']),python:command('python3',['--version']),browser},hardware:{platform:platform(),osRelease:release(),architecture:arch(),cpuModel:cpus()[0]?.model??null,cpuCount:cpus().length,totalMemoryBytes:totalmem()},installedPackages,packageLockSHA256:createHash('sha256').update(lock).digest('hex'),protocol:{conditionScope:'whole-cell-start',withheldWordingSeed:seed,concurrency,modelSeed:null,temperature:null,networkShaping:'none except declared delayed-coverage fault',cacheSharing:'Backend SQLite and model provider shared; browser contexts and workers isolated',firstUIMeasurement:'New travel-surface mount only; in-place replacements can remain null, not zero latency'}};
 return{...facts,id:createHash('sha256').update(JSON.stringify(facts)).digest('hex'),recordedAt:new Date().toISOString()};
}
export async function saveRunEnvironment(output,environment){
 const path=join(output,'run-environment.json');let previous;try{previous=JSON.parse(await readFile(path,'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
 if(previous){if(previous.id!==environment.id)throw new Error('Existing corpus run environment changed; preserve it and use a new output directory');return previous}
 await writeFile(path,JSON.stringify(environment,null,2),{flag:'wx'});return environment;
}
