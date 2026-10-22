"use strict";
const { execFile } = require("node:child_process");
const path = require("node:path");
const { promisify } = require("node:util");
const exec = promisify(execFile);
const ROOT = __dirname;
const required = ["AV_FLAGSHIP_MASTER", "AV_FLAGSHIP_CANDIDATE", "AV_FLAGSHIP_ASSIGNMENTS", "AV_FLAGSHIP_LEDGER"];
function configured() { return required.every(k => Boolean(process.env[k])); }
function send(res,status,body) {res.writeHead(status,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(body));}
async function releaseHandler(req,res,auth) {
 const pathname = new URL(req.url,"https://store-console.aerocoreos.com").pathname;
 if(pathname!=="/api/flagship/release/plan" && pathname!=="/api/flagship/release/publish" && pathname!=="/api/flagship/release/rollback") return false;
 if(req.method!=="POST") {send(res,405,{ok:false,error:"method_not_allowed"});return true;}
 const origin=req.headers.origin || "";
 if(origin!=="https://store-console.aerocoreos.com") {send(res,403,{ok:false,error:"origin_required"});return true;}
 if(!configured()){send(res,503,{ok:false,error:"scoped_release_not_configured"});return true;}
 try {
   const cap=process.env.AV_FLAGSHIP_RELEASE_CAPABILITY || "catalog.flagship.publish";
   const access=await auth.checkCapability(req,{capability:cap,resourceType:"store",resourceId:"flagship"});
   if(!access.allowed){send(res,403,{ok:false,error:"capability_denied"});return true;}
   const action=pathname.split("/").pop();
   if(action!=="plan" && process.env.AV_FLAGSHIP_RELEASE_ENABLED!=="true") {send(res,503,{ok:false,error:"scoped_release_disabled"});return true;}
   let body={};const chunks=[];for await(const chunk of req){chunks.push(chunk);if(Buffer.concat(chunks).length>4096) throw new Error("body_too_large");}
   if(chunks.length) body=JSON.parse(Buffer.concat(chunks).toString("utf8"));
   const argv=[path.join(ROOT,"scoped-release.py"),action,"--master",process.env.AV_FLAGSHIP_MASTER,"--candidate",process.env.AV_FLAGSHIP_CANDIDATE,"--assignments",process.env.AV_FLAGSHIP_ASSIGNMENTS,"--ledger",process.env.AV_FLAGSHIP_LEDGER,"--store","flagship"];
   if(action==="publish"){argv.push("--enable-publish");if(process.env.AV_FLAGSHIP_DESTINATION_VERIFIED==="true") argv.push("--destination-verified");}
   if(action==="rollback"){if(typeof body.snapshot!=="string" || !body.snapshot.startsWith(path.resolve(process.env.AV_FLAGSHIP_LEDGER,"snapshots","flagship")+path.sep)) throw new Error("invalid_snapshot");argv.push("--snapshot",body.snapshot);}
   const {stdout}=await exec("python3",argv,{timeout:15000,maxBuffer:1024*1024});
   send(res,200,{ok:true,action,result:JSON.parse(stdout)});
 }catch(error){
   const status=Number(error?.status)||422;
   const code=status===401?"authentication_required":status===403?"authorization_denied":"scoped_release_rejected";
   send(res,status===401||status===403?status:422,{ok:false,error:code});
 }
 return true;
}
module.exports={releaseHandler,configured};
