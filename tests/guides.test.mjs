import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { guides } from '../guide-data.js';
import { searchGuides, validProgress, readStored, escapeHtml } from '../guide-utils.js';

test('all supplied workflows are complete and reference available assets',async()=>{
  assert.equal(guides.length,12);assert.equal(new Set(guides.map(g=>g.id)).size,12);
  assert.deepEqual(guides.map(g=>g.code),['01','02','03a','03b','04','05','06','07','08','09','10','11']);
  for(const g of guides){assert.ok(g.title&&g.path&&g.summary&&g.tip&&g.outcome);assert.ok(g.steps.length>=4);await access(new URL('../'+g.image,import.meta.url));for(const s of g.steps)assert.ok(s.title&&s.body);for(const id of g.related)assert.ok(guides.some(g=>g.id===id));}
  assert.deepEqual(guides.find(g=>g.code==='03a').steps.map(s=>s.number),[1,2,3,4,5,6]);
  assert.deepEqual(guides.find(g=>g.code==='03b').steps.map(s=>s.number),[7,8,9,10,11]);
});
test('search includes workflow detail, topics and multiple keywords',()=>{
  assert.ok(searchGuides(guides,'%%%').length>=4);
  assert.equal(searchGuides(guides,'second interview')[0].code,'08');
  assert.equal(searchGuides(guides,'No Review')[0].code,'03b');
  assert.ok(searchGuides(guides,'','Timesheets').every(g=>g.category==='Timesheets'));
  assert.equal(searchGuides(guides,'unlikelymissingkeyword').length,0);
  assert.deepEqual(searchGuides(guides,'','All',true,['process-01']).map(g=>g.id),['process-01']);
});
test('persisted state rejects malformed and obsolete values',()=>{
  assert.deepEqual(validProgress({ 'process-01':[1,1,2,99,'3'], invalid:[1]},guides),{'process-01':[1,2]});
  assert.deepEqual(validProgress(null,guides),{});
  assert.deepEqual(readStored({getItem:()=>'{bad'},'test',[]),[]);
  assert.deepEqual(readStored({getItem:()=>{throw new Error('denied')}},'test',[]),[]);
});
test('support links are correct and app chrome has no client branding',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  for(const url of ['https://ie.comensura.net/CNET5/','https://uk.comensura.net/CNET5/']){assert.ok(app.includes(url));assert.ok(html.includes(url));}
  assert.ok(app.includes('support@comensura.co.uk'));assert.ok(!/veolia/i.test(app+html));assert.ok(!/General enquiries: Contact Vertage/.test(app));
  assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});
