export const dimensions=['visual quality','usability','creativity','information hierarchy','mobile adaptation','perceived responsiveness'];
export function validateReviewExport(input,packet){
 if(input?.schemaVersion!==1||input.classification!=='human-entered ratings'||input.participant!==packet.participant||JSON.stringify(input.sourceFreeze)!==JSON.stringify(packet.sourceFreeze)||!Array.isArray(input.reviews))throw new Error('Reviewer identity or source freeze does not match this package');
 const allowed=new Map(packet.items.map(item=>[item.token,item])),seen=new Set(),reviews=[];
 for(const review of input.reviews){
  const item=allowed.get(review.token);
  if(!item||seen.has(review.token))throw new Error('Unknown review item or duplicate entry');seen.add(review.token);
  if(!review.ratings||Object.keys(review.ratings).some(key=>!dimensions.includes(key)))throw new Error('Unknown rating dimension');
  const ratings={};let rated=false;
  for(const dimension of dimensions){const value=review.ratings[dimension]??null;if(value!==null&&(!Number.isInteger(value)||value<1||value>5))throw new Error('Ratings must be integers between 1 and 5, or null');ratings[dimension]=value;rated||=value!==null;}
  if(typeof review.notes!=='string'||review.notes.length>2000)throw new Error('Review notes must be text of at most 2000 characters');
  if(!rated&&!review.notes.trim())continue;
  if((item.captureAvailable&&review.captureReviewed!==true)||(item.artifactAvailable&&review.handsOnAttempted!==true))throw new Error('Confirm capture and hands-on review for each available mode');
  if(!item.captureAvailable&&!item.artifactAvailable&&rated)throw new Error('Unavailable evidence cannot receive quality ratings');
  reviews.push({token:review.token,captureReviewed:review.captureReviewed===true,handsOnAttempted:review.handsOnAttempted===true,ratings,notes:review.notes});
 }
 if(!reviews.length||!reviews.some(review=>dimensions.some(dimension=>review.ratings[dimension]!==null)))throw new Error('No reviewer ratings were entered');
 return{schemaVersion:1,classification:'human-entered ratings',participant:packet.participant,sourceFreeze:packet.sourceFreeze,recordedAt:new Date().toISOString(),reviews};
}
