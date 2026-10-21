// Isolated real React hook/panel integration. No HTTP, hosted data or environment files.
// node scripts/check-request-threads-ui.mjs <existing Playwright package path> [screenshots directory]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const viteRequire = createRequire(require.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
const { chromium } = await import(pathToFileURL(path.join(process.argv[2], 'index.mjs')));
const output = process.argv[3]; if (output) await mkdir(output, { recursive: true });
const entry = `
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter,RouterProvider,Outlet} from 'react-router-dom';
import {DraftProvider} from './src/context/DraftContext';
import {ToastProvider} from './src/components/ui/Toast';
import RequestThreadPanel from './src/components/requests/RequestThreadPanel';
import RequestDetail from './src/pages/RequestDetail';
const root=createRoot(document.getElementById('root'));let revision=0;
function Wrapper(){return <ToastProvider><DraftProvider><Outlet/></DraftProvider></ToastProvider>}
function Page(){const [status,setStatus]=useState(window.qa.status);window.qaStatus=value=>{window.qa.status=value;setStatus(value)};
return window.qa.fullPage ? <RequestDetail/> : <section className="container page-section request-detail"><h1>QA request</h1><div className="request-layout"><div className="request-sidebar"><RequestThreadPanel request={{id:'request',owner_id:'owner',borrower_id:'borrower',status,owner:{full_name:'QA Owner'},borrower:{full_name:'QA Borrower'}}} onStatusChange={()=>setStatus(window.qa.status)}/></div></div></section>}
window.qaReset=(options={})=>{
 window.qa={actor:'owner',status:'requested',entries:[],calls:[],...options};
 window.qaRPC=async(name,args)=>{
  const q=window.qa;q.calls.push({name,args});
  if(name==='report_for_request')return {data:{report:null,can_file:false},error:null};
  if(name==='student_profile')return {data:{trust:{level:'new'}},error:null};
  if(q.delay)await new Promise(resolve=>setTimeout(resolve,q.delay));
  if(name==='request_thread'){
   if(q.readError)return {data:null,error:{message:'PRIVATE NETWORK ERROR'}};
   if(q.denied)return {data:null,error:{message:'BH_THREAD_FORBIDDEN'}};
   let rows=q.entries;
   if(args.p_before_id)rows=rows.slice(0,rows.findIndex(e=>e.id===args.p_before_id));
   const entries=rows.slice(-50);const has=rows.length>50;const first=entries[0];
   return {data:{entries,has_earlier:has,next_before:has?{kind:first.kind,at:first.created_at,id:first.id}:null,request_status:q.status,
    can_send:['requested','approved','handed_over'].includes(q.status)&&q.entries.length<200,
    message_count:q.entries.length,limit:200,submission:q.entries.find(e=>e.id===args.p_client_id&&e.sender_id===q.actor)||null},error:null};
  }
  if(name==='send_request_message'){
   if(q.sendError)return {data:null,error:{message:q.sendError}};
   let saved=q.entries.find(e=>e.id===args.p_client_id);
   if(!saved){saved={kind:'message',id:args.p_client_id,sender_id:q.actor,body:args.p_body,created_at:new Date().toISOString()};q.entries.push(saved)}
   if(q.loseResponse){q.loseResponse=false;return {data:null,error:{message:'Lost response after commit'}}}
   return {data:{entry:saved,created:true},error:null};
  }
  throw new Error('Unexpected RPC '+name);
 };
 const router=createMemoryRouter([{element:<Wrapper/>,children:[{path:'/requests/:id',element:<Page/>}]}],{initialEntries:['/requests/request']});
 root.render(<React.StrictMode><RouterProvider key={++revision} router={router}/></React.StrictMode>);
};window.qaReset();`;
const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'jsx' },
  bundle: true, write: false, format: 'iife', jsx: 'automatic', plugins: [{ name: 'isolation', setup(api) {
    api.onLoad({ filter: /context[\\/]AuthContext\.jsx$/ }, () => ({ contents: "export const useAuth=()=>({user:{id:window.qa.actor},isVerified:window.qa.actor!=='unverified',isAdmin:window.qa.actor==='admin'});", loader: 'js' }));
    api.onLoad({ filter: /lib[\\/]supabase\.js$/ }, () => ({ contents: 'export const requireSupabase=()=>({rpc:(...args)=>window.qaRPC(...args)});', loader: 'js' }));
    api.onLoad({ filter: /hooks[\\/]useItem\.js$/ }, () => ({ contents: 'export default ()=>({item:null,loading:false,error:""});', loader: 'js' }));
    api.onLoad({ filter: /lib[\\/]profiles\.js$/ }, () => ({ contents: 'export const getStudentProfile=async()=>({trust:{level:"new"}}); export const photoUrl=async()=>null;', loader: 'js' }));
    api.onLoad({ filter: /hooks[\\/]useRequest\.js$/ }, () => ({ contents: `export default ()=>({request:{id:'10000000-0000-4000-8000-000000000001',reference:'BH-QA01',item_id:'item',owner_id:'owner',borrower_id:'borrower',status:window.qa.status,start_date:'2026-10-22',end_date:'2026-10-24',created_at:'2026-10-22T00:00:00Z',message:'',item:{id:'item',title:'Scientific calculator',listing_type:'free',meetup_note:'Meet at the library entrance.'},owner:{id:'owner',full_name:'QA Owner',course_year_section:'QA Course 1-A',photo_path:null},borrower:{id:'borrower',full_name:'QA Borrower',course_year_section:'QA Course 1-B',photo_path:null}},loading:false,error:'',refresh:async()=>{}});`, loader: 'js' }));
  } }] });
let css = await readFile('src/styles/variables.css', 'utf8') + '\n' + await readFile('src/styles/global.css', 'utf8');
const font = await readFile('src/assets/fonts/InterVariable.woff2');
css = css.replace(/url\([^)]*InterVariable\.woff2[^)]*\)/g, `url(data:font/woff2;base64,${font.toString('base64')})`);
const html = `<style>${css}</style><div id="root"></div><script>${bundle.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script>`;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
let checks = 0; let network = 0;
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/*', r => { network++; return r.abort(); });
    await page.route('http://127.0.0.1/thread-qa', r => r.fulfill({ contentType: 'text/html', body: html }));
    await page.goto('http://127.0.0.1/thread-qa');
    await page.evaluate(() => document.fonts.ready);
    const check = (ok, message) => { assert.ok(ok, `${width}: ${message}`); checks++; };
    const reset = async (options = {}) => {
      await page.evaluate(options => window.qaReset(options), options);
      await page.getByRole('heading', { name: options.fullPage ? /Scientific calculator/ : 'QA request' }).waitFor();
      if (!['admin', 'unverified', 'outsider'].includes(options.actor)) await page.getByRole('button', { name: 'Refresh messages' }).waitFor();
      await page.getByText('Loading messages…', { exact: true }).waitFor({ state: 'hidden' });
    };
    for (const actor of ['owner', 'borrower']) for (const status of ['requested', 'approved', 'handed_over', 'returned', 'declined', 'cancelled']) {
      await reset({ actor, status });
      const closed = ['returned', 'declined', 'cancelled'].includes(status);
      check(await page.getByRole('textbox').count() === (closed ? 0 : 1), `${actor} ${status} composer`);
    }
    await reset();
    await page.getByRole('textbox').fill('😀'.repeat(1001));
    check(await page.getByRole('button', { name: 'Send message' }).isDisabled(), 'Unicode over limit');
    await page.getByRole('textbox').fill('  Hello\nworld 😀  ');
    await page.evaluate(() => { window.qa.loseResponse = true; });
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.getByRole('button', { name: 'Retry message' }).waitFor();
    check(await page.getByRole('textbox').inputValue() === '  Hello\nworld 😀  ', 'lost response retains exact draft');
    await page.evaluate(() => { window.qa.readError = true; });
    await page.getByRole('button', { name: 'Retry message' }).click();
    await page.getByRole('alert').filter({ hasText: 'load messages' }).first().waitFor();
    check(await page.evaluate(() => window.qa.calls.filter(c => c.name === 'send_request_message').length) === 1, 'failed reconciliation does not resend');
    await page.evaluate(() => { window.qa.readError = false; });
    await page.getByRole('button', { name: 'Retry message' }).click();
    await page.getByText('Message sent.', { exact: true }).waitFor();
    check(await page.getByRole('textbox').inputValue() === '', 'confirmed recovery clears draft');
    check(await page.evaluate(() => window.qa.entries.length) === 1, 'recovered without duplicate');
    check(await page.locator('.request-thread__entry').count() === 1, 'confirmed entry visible');
    await reset();
    await page.getByRole('textbox').fill('Retry the same submission');
    await page.evaluate(() => { window.qa.sendError = 'PRIVATE NETWORK ERROR'; });
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.getByRole('button', { name: 'Retry message' }).waitFor();
    await page.evaluate(() => { window.qa.sendError = null; });
    await page.getByRole('button', { name: 'Retry message' }).click();
    await page.getByText('Message sent.', { exact: true }).waitFor();
    check(await page.evaluate(() => {
      const sends = window.qa.calls.filter(c => c.name === 'send_request_message');
      return sends.length === 2 && sends[0].args.p_client_id === sends[1].args.p_client_id;
    }), 'unsaved retry uses same UUID');
    await reset({ entries: Array.from({ length: 200 }, (_, i) => ({ kind: 'message', id: String(i),
      sender_id: 'borrower', body: 'Cap entry', created_at: '2026-10-22T01:00:00Z' })) });
    await page.getByText(/200-message limit reached/).waitFor();
    check(await page.getByRole('textbox').count() === 0, 'cap is read-only with readable history');
    check(await page.locator('.request-thread__entry').count() === 50, 'cap still pages history');
    const entries = Array.from({ length: 101 }, (_, i) => ({ kind: i === 0 ? 'opening' : 'message', id: String(i),
      sender_id: i % 2 ? 'owner' : 'borrower', body: i === 0 ? 'x'.repeat(1500) : `QA message ${i}`,
      created_at: '2026-10-22T01:00:00.000001Z' }));
    await reset({ entries });
    check(await page.locator('.request-thread__entry').count() === 50, 'latest50');
    if (width < 768) {
      check(await page.locator('.request-thread__entry:visible').count() === 3, 'mobile latest-three preview');
      await page.getByRole('button', { name: 'View all messages' }).click();
    }
    const history = page.getByRole('log', { name: 'Message history' });
    await history.focus();
    await page.keyboard.press('Home');
    await page.waitForFunction(() => document.querySelector('.request-thread__viewport').scrollTop === 0);
    const oldTop = await page.getByText('QA message 51', { exact: true }).evaluate(e => e.getBoundingClientRect().top);
    await page.getByRole('button', { name: 'Load earlier' }).click();
    await page.getByText('Earlier messages loaded.', { exact: true }).waitFor();
    check(await page.locator('.request-thread__entry').count() === 100, 'prepend50');
    await page.waitForFunction(top => Math.abs([...document.querySelectorAll('.request-thread__bubble p')].find(e => e.textContent === 'QA message 51').getBoundingClientRect().top - top) < 2, oldTop);
    check(true, 'older-page prepend preserves visible anchor inside history');
    await page.getByRole('button', { name: 'Load earlier' }).click();
    await page.getByText('Opening message', { exact: true }).waitFor();
    check(await page.locator('.request-thread__entry').count() === 101, 'opening on last page exactly once');
    await page.getByRole('textbox').fill('Keep my draft');
    await page.getByRole('button', { name: 'Refresh messages' }).click();
    await page.getByRole('button', { name: 'Load earlier' }).waitFor();
    check(await page.getByRole('textbox').inputValue() === 'Keep my draft', 'refresh retains draft');
    await page.evaluate(() => window.qaStatus('returned'));
    await page.getByText('Request returned · Messages are read-only.').waitFor();
    check(await page.getByRole('textbox').inputValue() === 'Keep my draft', 'terminal retains draft');
    check(await page.getByRole('button', { name: 'Send message' }).isDisabled(), 'terminal disables send');
    await page.getByRole('button', { name: 'Discard draft' }).click();
    await page.getByRole('dialog', { name: 'Discard unsaved changes?' }).waitFor();
    await page.getByRole('button', { name: 'Discard and continue' }).click();
    await page.getByRole('textbox').waitFor({ state: 'hidden' });
    await reset({ entries: entries.slice(0, 1) });
    await page.getByRole('textbox').fill('Draft');
    const callsBefore = await page.evaluate(() => window.qa.calls.length);
    await page.evaluate(() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    await page.getByRole('button', { name: 'Refresh messages' }).waitFor();
    await page.waitForFunction(n => window.qa.calls.length > n, callsBefore);
    check(await page.evaluate(n => window.qa.calls.length - n, callsBefore) === 1, 'focus/visibility coalesced');
    if (output) await page.screenshot({ path: path.join(output, `thread-${width}.png`), fullPage: true });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
    for (const button of await page.getByRole('button').all()) {
      const box = await button.boundingBox(); if (box) check(box.height >= 44, '44px target');
    }
    await page.evaluate(() => { window.qa.denied = true; });
    await page.getByRole('button', { name: 'Refresh messages' }).click();
    await page.getByText('Messages are not available for your account.').waitFor();
    check(await page.locator('.request-thread__entry').count() === 0, 'authorization loss clears history');
    check(await page.getByRole('textbox').count() === 0, 'authorization loss clears composer');
    for (const actor of ['admin', 'unverified', 'outsider']) {
      await reset({ actor }); check(await page.locator('.request-thread').count() === 0, `${actor} no panel`);
    }
    for (const length of ['short', 'long']) {
      const bodies = ['Could we meet at the library after class?', 'Yes, I can bring the calculator.', 'The entrance at 3 PM works for me.', 'Thank you! I will meet you there.'];
      const chat = Array.from({ length: length === 'short' ? 3 : 41 }, (_, i) => ({ kind: i === 0 ? 'opening' : 'message', id: String(i),
        sender_id: (length === 'short' ? i === 0 : i % 6 < 3) ? 'borrower' : 'owner', body: bodies[i % bodies.length],
        created_at: new Date(Date.UTC(2026, 9, 21, 0, i * 60)).toISOString() }));
      await reset({ entries: chat, fullPage: true });
      await page.getByText(/Updated \d/).waitFor();
      const area = page.getByRole('log', { name: 'Message history' });
      check(await area.getAttribute('aria-live') === 'polite', 'polite message log');
      check(await area.evaluate(e => Math.ceil(e.scrollTop + e.clientHeight) >= e.scrollHeight), 'newest visible on initial load');
      check(await area.evaluate(e => Math.abs(e.clientHeight - (innerWidth < 768 ? innerHeight / 2 : 390)) <= 2), 'bounded history height');
      if (width < 768 && length === 'long') {
        check(await page.locator('.request-thread__entry:visible').count() === 3, 'long thread collapsed on mobile');
        await page.getByRole('button', { name: 'View all messages' }).click();
      }
      check(await page.locator('.request-thread__sender:visible').count() < chat.length, 'consecutive messages share sender label');
      for (const bubble of await page.locator('.request-thread__bubble:visible').all()) {
        check(await bubble.evaluate(e => e.getBoundingClientRect().width <= e.closest('ol').getBoundingClientRect().width * .75 + 1), 'bubble at most75percent');
      }
      check(await page.getByRole('textbox').evaluate(e => getComputedStyle(e).fontSize === '16px'), '16px composer');
      check(await page.locator('.request-thread__privacy').evaluate(e => e.scrollWidth <= e.clientWidth && getComputedStyle(e).whiteSpace === 'nowrap'), 'privacy note fits on one line');
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'full request page has no horizontal overflow');
      if (width >= 768) check(await page.locator('.request-thread').evaluate(e => {
        const next = document.querySelector('.request-action-panel').getBoundingClientRect();
        const box = e.getBoundingClientRect(); return Math.abs(next.left - box.left) < 1 && box.top >= next.bottom;
      }), 'messages below action panel in desktop sidebar');
      await page.waitForFunction(() => { const a=document.querySelector('.request-thread__viewport'); return Math.ceil(a.scrollTop+a.clientHeight)>=a.scrollHeight; });
      if (output) await page.screenshot({ path: path.join(output, `request-${width}-${length}.png`), fullPage: true });
      await page.waitForFunction(() => { const a=document.querySelector('.request-thread__viewport'); return Math.ceil(a.scrollTop+a.clientHeight)>=a.scrollHeight; });
    }
    await reset();
    await page.getByRole('textbox').fill('Keyboard message');
    await page.getByRole('textbox').press('Tab');
    check(await page.getByRole('button', { name: 'Send message' }).evaluate(e => document.activeElement === e), 'keyboard reaches Send');
    await page.keyboard.press('Enter');
    await page.getByText('Message sent.', { exact: true }).waitFor();
    check(await page.getByRole('textbox').inputValue() === '', 'keyboard Send succeeds');
    check(errors.length === 0, JSON.stringify(errors)); await page.close();
  }
  assert.equal(network, 0);
  console.log(JSON.stringify({ passed: true, checks, network, widths: [390, 768, 1440] }));
} finally { await browser.close(); }
