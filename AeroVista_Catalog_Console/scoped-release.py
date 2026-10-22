#!/usr/bin/env python3
"""Fail-closed, store-specific release ledger. No writes to Square or the shared master."""
import argparse,fcntl,hashlib,json,os,pathlib,tempfile,datetime
STORES={'flagship','gear','cindy'}
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def sha(v):return hashlib.sha256(canonical(v)).hexdigest()
def load(p):return json.loads(pathlib.Path(p).read_text())
def atomic(p,value):
 p=pathlib.Path(p);p.parent.mkdir(parents=True,exist_ok=True)
 fd,tmp=tempfile.mkstemp(dir=str(p.parent),prefix='.pending-')
 try:
  with os.fdopen(fd,'wb') as f:f.write(canonical(value)+b'\n');f.flush();os.fsync(f.fileno())
  os.replace(tmp,p)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
def validate(catalog,assignments,store):
 if store not in STORES:raise ValueError('unknown store')
 p=catalog['products'];ids=[x['id'] for x in p]
 if len(ids)!=len(set(ids)):raise ValueError('duplicate catalog IDs')
 approved=assignments.get('assignments')
 if assignments.get('schemaVersion')!=1 or not isinstance(approved,dict) or set(ids)!=set(approved):raise ValueError('reviewed assignment ID-set mismatch')
 if assignments.get('sourceProductCount') not in (None,len(ids)):raise ValueError('assignment product count mismatch')
 for id in ids:
  a=approved[id]
  if a.get('reviewed') is not True or not isinstance(a.get('stores'),list) or any(s not in STORES for s in a['stores']):raise ValueError('unreviewed or invalid assignment: '+id)
 selected={x['id']:x for x in p if store in approved[x['id']]['stores']}
 return selected,approved
def plan(master,candidate,assign,store):
 before,approved=validate(master,assign,store)
 incoming,_=validate(candidate,assign,store)
 if set(x['id'] for x in master['products'])!=set(x['id'] for x in candidate['products']):raise ValueError('master ID-set drift')
 if set(before)!=set(incoming):raise ValueError('store scope drift')
 base={x['id']:x for x in master['products']};new={x['id']:x for x in candidate['products']}
 for id in base:
  if id not in before and base[id]!=new[id]:raise ValueError('out-of-scope product edited: '+id)
 diffs=[]
 for id in sorted(before):
  a,b=before[id],incoming[id]
  if a==b:continue
  keys=sorted(k for k in set(a)|set(b) if a.get(k)!=b.get(k))
  if set(keys)-{'category','collection','image','description_text','description_html','seo_title','seo_description','price','variants'}:raise ValueError('unapproved field change: '+id)
  for av,bv in zip(a.get('variants',[]),b.get('variants',[])):
   for k in ('variation_id','sku','size','color'):
    if av.get(k)!=bv.get(k):raise ValueError('Square identity changed: '+id)
  if len(a.get('variants',[]))!=len(b.get('variants',[])) or a.get('square_item_id')!=b.get('square_item_id'):raise ValueError('Square identity changed: '+id)
  if ('price' in keys or 'variants' in keys) and id!='lumina-premium-mid-weight-hoodie':raise ValueError('price change requires explicit approval: '+id)
  diffs.append({'id':id,'fields':{k:{'before':a.get(k),'after':b.get(k)} for k in keys}})
 return {'store':store,'selectedCount':len(before),'diff':diffs,'before':{'meta':{'store':store},'products':[before[k] for k in sorted(before)]},'after':{'meta':{'store':store},'products':[incoming[k] for k in sorted(incoming)]},'masterHash':sha(master),'assignmentsHash':sha(assign)}
def execute(args):
 master,candidate,assign=map(load,(args.master,args.candidate,args.assignments))
 p=plan(master,candidate,assign,args.store)
 ledger=pathlib.Path(args.ledger);ledger.mkdir(parents=True,exist_ok=True)
 lock=ledger/'.lock'
 with lock.open('w') as lf:
  fcntl.flock(lf,fcntl.LOCK_EX)
  target=ledger/(args.store+'.json')
  if args.command=='plan':
   print(json.dumps({k:v for k,v in p.items() if k not in ('before','after')},indent=2));return
  if args.command=='publish':
   if not args.enable_publish:raise ValueError('publish requires --enable-publish and verified downstream adapter')
   if not args.destination_verified:raise ValueError('storefront destination unverified')
   current=load(target) if target.exists() else p['before']
   if sha(current)!=sha(p['before']):raise ValueError('scoped current snapshot drift')
   stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
   key=stamp+'-'+sha(p['after'])[:14];directory=ledger/'snapshots'/args.store/key
   directory.mkdir(parents=True,exist_ok=False)
   for name,body in [('before',current),('after',p['after']),('manifest',{k:v for k,v in p.items() if k not in ('before','after')})]:
    f=directory/(name+'.json')
    with f.open('xb') as stream:stream.write(canonical(body)+b'\n');stream.flush();os.fsync(stream.fileno())
   atomic(target,p['after']);print(json.dumps({'published':str(target),'snapshot':str(directory),'hash':sha(p['after'])}))
  elif args.command=='rollback':
   if not args.snapshot:raise ValueError('rollback requires snapshot')
   directory=pathlib.Path(args.snapshot).resolve()
   if not directory.is_relative_to((ledger/'snapshots'/args.store).resolve()):raise ValueError('snapshot outside store')
   old=load(directory/'before.json');new=load(directory/'after.json')
   if sha(load(target))!=sha(new):raise ValueError('rollback target changed since release')
   atomic(target,old);print(json.dumps({'rolledBack':str(target),'hash':sha(old)}))
if __name__=='__main__':
 ap=argparse.ArgumentParser()
 ap.add_argument('command',choices=['plan','publish','rollback'])
 for k in ('master','candidate','assignments','ledger','store'):ap.add_argument('--'+k,required=True)
 ap.add_argument('--snapshot');ap.add_argument('--enable-publish',action='store_true');ap.add_argument('--destination-verified',action='store_true')
 try:execute(ap.parse_args())
 except Exception as e:ap.exit(2,'DENIED: '+str(e)+'\n')
