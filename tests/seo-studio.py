from pathlib import Path
from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location('seo',Path(__file__).with_name('seo-pages.py'));m=module_from_spec(spec);spec.loader.exec_module(m)
seen=set()
for slug in ['creative-studio','creative-studio-pricing','ai-image-generator','ai-video-generator','ai-music-generator','ai-workflow-builder']:
 s=(m.ROOT/(slug+'.html')).read_text();p=m.Page(s);url=m.BASE+'/'+slug
 assert p.h1==p.mains==1
 assert p.canonicals==[url] and url in m.urls
 assert p.title==p.meta['og:title']==p.meta['twitter:title'] and p.title not in seen
 assert p.meta['description']==p.meta['og:description']==p.meta['twitter:description']
 assert p.meta['og:image'].endswith('/assets/creative/desert-arch.webp')
 assert p.json_blocks and 'coming soon' in s.lower() and '500 MB' in s and '30 days' in s
 for href in p.hrefs:
  if href.startswith('/'):
   target=href.split('#')[0].split('?')[0].lstrip('/') or 'index'
   assert (m.ROOT/target).exists() or (m.ROOT/(target+'.html')).exists(),href
 assert len(p.ids)==len(set(p.ids));seen.add(p.title)
 print('PASS studio SEO:',slug)
