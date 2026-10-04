import { expect,it } from 'vitest';
import { validatePresentPrefix } from './present-prefix';
const scope={artifactIds:new Set(['a']),datasetIds:new Set(['d'])};
it('allows a genuinely incomplete but bounded native tree',()=>{expect(()=>validatePresentPrefix('{"$type":"TravelSurface","artifactRef":"a","children":[{"$type":"FareCards","artifactRef":"a","datasetRef":"d"',scope)).not.toThrow()});
it('rejects unknown row-shaped aliases before complete props or rendering',()=>{expect(()=>validatePresentPrefix('{"$type":"TravelSurface","artifactRef":"a","payload":[',scope)).toThrow('Unknown partial')});
it('enforces plan depth and node budgets before completion',()=>{expect(()=>validatePresentPrefix('{"children":'.repeat(9),scope)).toThrow('structural');expect(()=>validatePresentPrefix('{'.repeat(81),scope)).toThrow()});
