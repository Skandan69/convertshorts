import assert from 'node:assert/strict';
import {consumeAuthCallback,authReturnURL} from '../apps/studio/auth-callback.js';
function consume(hash){let cleaned;const value=consumeAuthCallback({hash},{replaceState:(_a,_b,url)=>cleaned=url});return {value,cleaned};}
assert.equal(authReturnURL('https://convertshorts.com'),'https://convertshorts.com/apps/');
assert.deepEqual(consume('#account'),{value:null,cleaned:undefined});
const recovery=consume('#access_token=fixture-access&refresh_token=fixture-refresh&type=recovery&expires_in=60');
assert.equal(recovery.cleaned,'/apps/#account');assert.equal(recovery.value.needsPasswordReset,true);assert.equal(recovery.value.expires_in,60);
assert.equal(consume('#access_token=fixture&refresh_token=fixture&type=signup').value.needsPasswordReset,false);
assert.equal(consume('#access_token=fixture&refresh_token=fixture&expires_in=NaN').value.expires_in,3600);
assert.ok(consume('#access_token=fixture').value.error);
const expired=consume('#error=access_denied&error_description=Private%20provider%20details&error_code=otp_expired');
assert.equal(expired.cleaned,'/apps/#account');assert.ok(/expired/.test(expired.value.error));assert.ok(!expired.value.error.includes('Private'));
console.log('PASS safe auth callback routing, recovery detection, expiry defaults and credential-free errors.');
