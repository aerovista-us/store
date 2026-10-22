"use strict";
const test=require("node:test"), assert=require("node:assert/strict");
const {Readable}=require("node:stream");
const {releaseHandler}=require("./flagship-release-http");
async function call(origin,decision,method="POST") {
 const req=Readable.from([]);req.url="/api/flagship/release/publish";req.method=method;req.headers={origin};
 let status,body;
 await releaseHandler(req,{writeHead:s=>status=s,end:s=>{body=JSON.parse(s)}},{checkCapability:async()=>decision});
 return {status,body};
}
test("reject cross-origin publish",async()=>{const r=await call("https://other.example",{allowed:true});assert.equal(r.status,403);assert.equal(r.body.error,"origin_required")});
test("missing configured paths fails closed",async()=>{const r=await call("https://store-console.aerocoreos.com",{allowed:true});assert.equal(r.status,503);assert.equal(r.body.error,"scoped_release_not_configured")});
test("deny unsupported method",async()=>{const r=await call("https://store-console.aerocoreos.com",{allowed:true},"GET");assert.equal(r.status,405)});
