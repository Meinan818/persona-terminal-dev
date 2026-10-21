import gzip, glob, os, json
R=os.path.join(os.path.dirname(__file__),'..'); D=R+'/dist'
gz=lambda b: len(gzip.compress(b,9))
js=[f for f in glob.glob(D+'/assets/*.js') if not any(k in f for k in ['WebGPURenderer','CanvasRenderer'])]
code=sum(gz(open(f,'rb').read()) for f in js)+gz(open(D+'/index.html','rb').read())
SK=R+'/src/umbra/skins/p5r-red'
man=json.load(open(SK+'/manifest.json'))
imgs=[a for a in man['assets'] if a['firstPack']]
img=sum(os.path.getsize(SK+'/'+a['file']) for a in imgs)
fonts=sum(os.path.getsize(SK+'/'+f['file']) for f in man['fonts'] if f['pack']=='first')
data=gz(b''.join(open(f,'rb').read() for f in glob.glob(SK+'/**/*.json',recursive=True)))
css=gz(open(SK+'/ui.css','rb').read())
out=dict(codeKB=round(code/1024,1), imagesKB=round(img/1024,1), images=len(imgs), fontsKB=round(fonts/1024,1), dataKB=round(data/1024,1), uiCssKB=round(css/1024,1),
 skinShareKB=round((img+fonts+data+css)/1024,1), firstPackKB=round((code+img+fonts)/1024,1),
 perImage={a['id']:[a['w'],a['h'],round(os.path.getsize(SK+'/'+a['file'])/1024,1),a['source']] for a in imgs},
 texMB=round(sum(a['w']*a['h']*4 for a in imgs)/1048576,1))
json.dump(out,open(R+'/tools/out/budget.json','w'),indent=1); print(json.dumps(out,indent=1))
