"""Verify crawlable feature content without executing JavaScript."""
from pathlib import Path
from html.parser import HTMLParser
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SLUGS = ['image-tools', 'pdf-tools', 'video-tools', 'design-studio', 'video-editor']
BASE = 'https://convertshorts.com'

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.meta = {}
        self.canonicals = []
        self.hrefs = []
        self.ids = []
        self.h1 = self.details = self.mains = 0
        self.title = ''
        self.json = ''
        self.read_title = self.read_json = False
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag == 'meta': self.meta[a.get('name', a.get('property'))] = a.get('content')
        if tag == 'link' and a.get('rel') == 'canonical': self.canonicals.append(a['href'])
        if tag == 'a': self.hrefs.append(a.get('href', ''))
        if tag == 'h1': self.h1 += 1
        if tag == 'details': self.details += 1
        if tag == 'main': self.mains += 1
        if tag == 'title': self.read_title = True
        if tag == 'script' and a.get('type') == 'application/ld+json': self.read_json = True
    def handle_endtag(self, tag):
        if tag == 'title': self.read_title = False
        if tag == 'script': self.read_json = False
    def handle_data(self, data):
        if self.read_title: self.title += data
        if self.read_json: self.json += data

titles, descriptions = set(), set()
ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
sitemap = ET.parse(ROOT / 'sitemap.xml')
urls = {n.find('s:loc', ns).text: n for n in sitemap.findall('s:url', ns)}
for slug in SLUGS:
    source = (ROOT / f'{slug}.html').read_text()
    page = Page(source)
    url = f'{BASE}/{slug}'
    assert page.h1 == page.mains == 1, slug
    assert page.details >= 6, slug
    assert len(page.ids) == len(set(page.ids)), f'{slug}: duplicate IDs'
    assert page.canonicals == [url], slug
    assert 'noindex' not in page.meta['robots'], slug
    assert page.title == page.meta['og:title'] == page.meta['twitter:title'], slug
    assert page.meta['description'] == page.meta['og:description'] == page.meta['twitter:description'], slug
    assert page.meta['og:url'] == url, slug
    assert page.title not in titles and page.meta['description'] not in descriptions, slug
    titles.add(page.title); descriptions.add(page.meta['description'])
    assert source.index('id="workspace"') < source.index('class="feature-guide"'), slug
    for href in page.hrefs:
        if href.startswith('#'): assert href[1:] in page.ids, (slug, href)
        elif href.startswith('/'):
            target = href.split('#')[0].split('?')[0].lstrip('/') or 'index'
            assert (ROOT / target).exists() or (ROOT / f'{target}.html').exists(), (slug, href)
    graph = json.loads(page.json)['@graph']
    types = {n['@type']: n for n in graph}
    assert set(types) == {'WebPage', 'WebApplication', 'BreadcrumbList'}, slug
    assert types['WebPage']['mainEntity']['@id'] == types['WebApplication']['@id'], slug
    assert types['WebPage']['breadcrumb']['@id'] == types['BreadcrumbList']['@id'], slug
    assert types['WebApplication']['offers']['price'] == '0', slug
    assert types['BreadcrumbList']['itemListElement'][-1]['item'] == url, slug
    assert url in urls and urls[url].find('s:lastmod', ns) is not None, slug
    print(f'PASS {slug}: static content, unique metadata, canonical, schema, links and sitemap')
