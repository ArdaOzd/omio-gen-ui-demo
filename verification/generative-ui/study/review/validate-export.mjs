import{readFile,writeFile}from'node:fs/promises';
import{validateReviewExport}from'./export-validation.mjs';
const[manifestFile,reviewFile,outputFile]=process.argv.slice(2);
if(!manifestFile||!reviewFile)throw new Error('Usage: node validate-export.mjs <public-manifest.json> <human-review-export.json> [new-output.json]');
const validated=validateReviewExport(JSON.parse(await readFile(reviewFile,'utf8')),JSON.parse(await readFile(manifestFile,'utf8')));
if(outputFile)await writeFile(outputFile,JSON.stringify(validated,null,2),{flag:'wx'});
console.log(JSON.stringify({participant:validated.participant,humanEnteredItems:validated.reviews.length,classification:validated.classification}));
