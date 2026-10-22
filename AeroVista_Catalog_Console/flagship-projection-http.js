"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
function send(res,status,data,headers={}){res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","access-control-allow-origin":"*","x-content-type-options":"nosniff",...headers});res.end(JSON.stringify(data));}
function readProjection(){
 const ledger=process.env.AV_FLAGSHIP_LEDGER;
 if(!ledger)throw new Error("unconfigured");
 const filename=path.join(ledger,"flagship.json");
 const catalog=JSON.parse(fs.readFileSync(filename,"utf8"));
 if(catalog?.meta?.store!=="flagship"||!Array.isArray(catalog.products)||!catalog.products.length)throw new Error("invalid_projection");
 const ids=catalog.products.map(p=>p.id);
 if(ids.some(id=>typeof id!=="string"||!id)||new Set(ids).size!==ids.length)throw new Error("invalid_ids");
 return {catalog,revision:crypto.createHash("sha256").update(JSON.stringify(catalog)).digest("hex")};
}
function projectionHandler(req,res){
 const url=new URL(req.url||"/","http://localhost");
 if(url.pathname!=="/v1/storefront/flagship/catalog")return false;
 if(req.method!=="GET" && req.method!=="HEAD"){send(res,405,{ok:false,error:"method_not_allowed"});return true;}
 if(process.env.AV_FLAGSHIP_PUBLIC_PROJECTION_ENABLED!=="true"){send(res,503,{ok:false,error:"projection_disabled"});return true;}
 try{const {catalog,revision}=readProjection(); const payload={...catalog,meta:{...catalog.meta,revision}};send(res,200,payload,{"etag":'"'+revision+'"'});}
 catch{send(res,503,{ok:false,error:"projection_unavailable"});}
 return true;
}
module.exports={projectionHandler,readProjection};
