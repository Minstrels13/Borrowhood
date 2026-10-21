// Isolated browser integration checks. Uses the existing Vite/esbuild and a supplied
// Playwright runtime (no dependency installation). All RPCs are in-memory, zero HTTP.
// node scripts/check-reports-ui.mjs <absolute playwright package directory> [artifact directory]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const viteRequire = createRequire(require.resolve('vite/package.json'));
const { build } = viteRequire('esbuild');
if (!process.argv[2]) throw new Error('Supply an existing Playwright package directory; do not install dependencies.');
const { chromium } = await import(pathToFileURL(path.join(process.argv[2], 'index.mjs')));
const output = process.argv[3];
if (output) await mkdir(output, { recursive: true });
const root = process.cwd();
const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {createMemoryRouter,RouterProvider,Outlet} from 'react-router-dom';
import {DraftProvider} from './src/context/DraftContext';
import {ToastProvider} from './src/components/ui/Toast';
import RequestReportPanel from './src/components/reports/RequestReportPanel';
import AdminQueue from './src/pages/AdminQueue';
import AdminReportDetail from './src/pages/AdminReportDetail';
const rid='10000000-0000-4000-8000-000000000001';
const qid='20000000-0000-4000-8000-000000000001';
const base={id:rid,reason:'not_returned',details:'Test report details',status:'open',borrower_response:null,responded_at:null,reviewing_at:null,outcome:null,resolution_note:null,resolved_at:null,created_at:'2026-10-20T04:00:00Z',updated_at:'2026-10-20T04:00:00Z',version:1};
const loan={id:qid,reference:'BH-QA01',owner_id:'owner',borrower_id:'borrower',status:'handed_over',end_date:'2020-01-01'};
const ui=createRoot(document.getElementById('root'));
let revision=0;
function Wrapper(){return <ToastProvider><DraftProvider><Outlet/></DraftProvider></ToastProvider>}
window.qaReset=(scenario,role='owner',route='/request')=>{
 window.qaActor=role;
 window.qaState={report:scenario==='none'||scenario==='read-error'?null:structuredClone(base),scenario,calls:[],writeFailure:null,delay:0};
 window.qaRPC=async(name,args)=>{
  const s=window.qaState; s.calls.push({name,args});
  if(s.delay) await new Promise(resolve=>setTimeout(resolve,s.delay));
  if(s.scenario==='read-error')return {data:null,error:{message:'TypeError: Failed to fetch PRIVATE'}};
  let data;
  if(name==='file_report'){
   s.report={...structuredClone(base),reason:args.p_reason,details:args.p_details}; data={id:rid,version:1};
  }else if(name==='respond_report'){
   if(s.writeFailure==='BH_P2_STALE')s.report.status='reviewing';
   else {s.report.borrower_response=args.p_response;s.report.version++;} data={id:rid,version:s.report.version};
  }else if(name==='start_report_review'){
   s.report.status='reviewing';s.report.reviewing_at='2026-10-21T04:00:00Z';s.report.version++;data={id:rid,version:s.report.version};
  }else if(name==='resolve_report'){
   s.report.status='resolved';s.report.outcome=args.p_outcome;s.report.resolution_note=args.p_note;s.report.resolved_at='2026-10-21T05:00:00Z';s.report.version++;data={id:rid,version:s.report.version};
  }else if(name==='report_for_request')data={report:s.report,can_file:window.qaActor==='owner'&&!s.report};
  else if(name==='admin_report_detail')data=s.report?{...s.report,reference:'BH-QA01',item:{id:'item',title:'Test calculator'},due_date:'2026-10-18',owner:{name:'Test owner with a deliberately long name for layout review',course_year_section:'Test course 1-A',email:'owner-with-a-long-address@example.invalid'},borrower:{name:'Test borrower',course_year_section:'Test course 2-B',email:'borrower@example.invalid'},self_review:window.qaActor==='owner',can_review:s.report.status==='open'&&window.qaActor!=='owner',can_resolve:s.report.status==='reviewing'&&window.qaActor!=='owner'}:null;
  else if(name==='admin_reports'){
   let entries=Array.from({length:13},(_,i)=>({id:rid.slice(0,-2)+String(i+1).padStart(2,'0'),reference:'BH-QA'+(i+1),item_title:'Test calculator',owner_name:'Test owner',borrower_name:'Test borrower',reason:'not_returned',due_date:'2026-10-18',status:args.p_status,created_at:base.created_at}));
   if(args.p_search)entries=entries.filter(row=>row.item_title.includes(args.p_search)||row.reference.includes(args.p_search));
   data={entries:entries.slice(args.p_offset,args.p_offset+12),total:entries.length,status_totals:{open:entries.length,reviewing:0,resolved:0}};
  }else if(name==='verification_queue')data=[];
  else if(name==='profile_change_queue')data={entries:[],total:0};
  else throw new Error('Unexpected mock RPC '+name);
  if(s.writeFailure&&!name.startsWith('admin_')&&name!=='report_for_request'){
   const message=s.writeFailure;s.writeFailure=null;return {data:null,error:{message}};
  }
  return {data:structuredClone(data),error:null};
 };
 const router=createMemoryRouter([{element:<Wrapper/>,children:[
  {path:'/request',element:<section className="container page-section"><h1>Test participant request</h1><RequestReportPanel request={loan}/></section>},
  {path:'/admin/verification',element:<AdminQueue/>},
  {path:'/admin/verification/reports/:id',element:<AdminReportDetail/>}
 ]}],{initialEntries:[route]});
 ui.render(<RouterProvider key={++revision} router={router}/>);
};
window.qaReset('none');
`;
const bundle = await build({ stdin: { contents: entry, resolveDir: root, loader: 'jsx' }, bundle: true,
  write: false, format: 'iife', jsx: 'automatic', plugins: [{ name: 'isolated-accounts-and-rpc', setup(api) {
    api.onLoad({ filter: /context[\\/]AuthContext\.jsx$/ }, () => ({ contents: "export const useAuth=()=>({user:{id:window.qaActor},isVerified:true,isAdmin:window.qaActor==='admin'});", loader: 'js' }));
    api.onLoad({ filter: /lib[\\/]supabase\.js$/ }, () => ({ contents: 'export const requireSupabase=()=>({rpc:(...args)=>window.qaRPC(...args)});', loader: 'js' }));
  } }] });
let css = await readFile('src/styles/variables.css', 'utf8') + '\n' + await readFile('src/styles/global.css', 'utf8');
const font = await readFile('src/assets/fonts/InterVariable.woff2');
css = css.replace(/url\([^)]*InterVariable\.woff2[^)]*\)/g, `url(data:font/woff2;base64,${font.toString('base64')})`);
const html = `<style>${css}</style><div id="root"></div><script>${bundle.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script>`;
const browser = await chromium.launch({ headless: true, channel: process.env.REPORTS_BROWSER_CHANNEL || 'chrome' });
let network = 0;
let assertions = 0;
const results = [];
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) => { network++; return route.abort(); });
    await page.setContent(html);
    const check = (condition, message) => { assert.ok(condition, `${width}: ${message}`); assertions++; };
    const reset = async (scenario, actor = 'owner', route = '/request') => {
      await page.evaluate(([...args]) => window.qaReset(...args), [scenario, actor, route]);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.getByText(/Loading report/).waitFor({ state: 'hidden' });
    };
    const shot = async (name) => { if (output) await page.screenshot({ path: path.join(output, `reports-${width}-${name}.png`), fullPage: true }); };
    await page.getByRole('button', { name: 'Report a problem', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Report a problem', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Report a problem', exact: true });
    await dialog.getByRole('radio', { name: /Other problem/ }).check();
    check(await dialog.getByRole('button', { name: 'Send report', exact: true }).isDisabled(), 'Other requires details');
    await dialog.getByRole('textbox', { name: /Details/ }).fill('Test explanation');
    check(await dialog.getByRole('button', { name: 'Send report', exact: true }).isEnabled(), 'valid report enabled');
    await page.keyboard.press('Escape');
    const discard = page.getByRole('dialog', { name: 'Discard unsaved changes?' });
    await discard.waitFor(); await discard.getByRole('button', { name: 'Stay here' }).click();
    check(await dialog.isVisible(), 'Escape dirty guard retains parent');
    await shot('file');
    check(await dialog.locator('.modal__body').evaluate(el => el.scrollWidth <= el.clientWidth), 'no internal modal horizontal overflow');
    check(await dialog.getByRole('radio').first().evaluate(el => el.getBoundingClientRect().width <= 44), 'radio does not inherit full-width text-input geometry');
    for (const button of await dialog.getByRole('button').all()) {
      const bounds = await button.boundingBox();
      if (bounds) check(bounds.height >= 44, 'dialog button target >=44');
    }
    await dialog.getByRole('button', { name: 'Send report', exact: true }).click();
    const sent = page.getByRole('dialog', { name: 'Report sent', exact: true });
    await sent.waitFor(); await sent.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('heading', { name: 'Report filed', exact: true }).waitFor();
    check(await page.getByRole('button', { name: 'Report a problem', exact: true }).count() === 0, 'existing report removes filing');
    await reset('open', 'borrower');
    await page.getByRole('button', { name: 'Add your response' }).click();
    const response = page.getByRole('dialog', { name: 'Respond to report', exact: true });
    await response.getByLabel('Your response', { exact: false }).fill('Test borrower response');
    await response.getByRole('button', { name: 'Send response', exact: true }).click();
    await response.waitFor({ state: 'hidden' });
    check(await page.getByText('Test borrower response', { exact: true }).count() === 1, 'response visible after confirmed save');
    check(await page.getByRole('button', { name: 'Add your response' }).count() === 0, 'second response hidden');
    await reset('open', 'borrower');
    await page.getByRole('button', { name: 'Add your response' }).click();
    await response.getByLabel('Your response', { exact: false }).fill('Keep this draft');
    await page.evaluate(() => { window.qaState.writeFailure = 'BH_P2_STALE'; });
    await response.getByRole('button', { name: 'Send response', exact: true }).click();
    await response.getByRole('button', { name: 'Retry', exact: true }).click();
    await response.getByText(/action is no longer available/).waitFor();
    check(await response.getByLabel('Your response', { exact: false }).inputValue() === 'Keep this draft', 'stale retry preserves text');
    check(await response.getByRole('button', { name: 'Send response', exact: true }).isDisabled(), 'review race disables response');
    await reset('none');
    await page.getByRole('button', { name: 'Report a problem', exact: true }).click();
    await dialog.getByRole('radio', { name: /Item not returned/ }).check();
    await page.evaluate(() => { window.qaState.writeFailure = 'TypeError: Failed to fetch PRIVATE'; });
    await dialog.getByRole('button', { name: 'Send report', exact: true }).click();
    await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
    await dialog.getByText(/already been filed/).waitFor();
    check(await page.getByText('TypeError: Failed to fetch PRIVATE', { exact: false }).count() === 0, 'raw error never shown');
    check(await page.evaluate(() => window.qaState.calls.filter(c => c.name === 'file_report').length) === 1, 'uncertain retry reads, never duplicates write');
    await reset('read-error');
    await page.getByRole('button', { name: 'Retry', exact: true }).waitFor();
    check(await page.getByRole('button', { name: 'Report a problem', exact: true }).count() === 0, 'read failure never enables filing');
    check(await page.getByText('No report has been filed', { exact: false }).count() === 0, 'read failure is not empty state');
    await reset('open', 'admin', '/admin/verification?tab=reports');
    check(await page.getByRole('tab', { name: /^Reports$/ }).count() === 1, 'Reports third queue tab exists');
    await page.getByRole('tab', { name: /^Account verification/ }).click();
    await page.getByRole('heading', { name: 'Account verification', exact: true }).waitFor();
    await page.getByRole('tab', { name: /^Profile changes/ }).click();
    await page.getByRole('button', { name: 'Refresh changes', exact: true }).waitFor();
    await page.getByRole('tab', { name: /^Reports$/ }).click();
    await page.getByRole('link', { name: /Review report/ }).first().waitFor();
    check(await page.getByRole('link', { name: /Review report/ }).count() === 12, 'queue first page bounded to 12');
    await page.getByRole('button', { name: 'Load more reports' }).click();
    await page.getByRole('link', { name: 'Review report on BH-QA13', exact: true }).waitFor();
    check(await page.getByRole('link', { name: /Review report/ }).count() === 13, 'Load more appends');
    await shot('queue');
    await page.getByRole('link', { name: 'Review report on BH-QA1', exact: true }).click();
    await page.getByRole('button', { name: 'Start review' }).waitFor();
    await page.getByRole('link', { name: '← Reports', exact: true }).click();
    await page.getByRole('link', { name: 'Review report on BH-QA1', exact: true }).waitFor();
    check(await page.getByRole('link', { name: 'Review report on BH-QA1', exact: true }).evaluate(el => el === document.activeElement), 'admin back returns focus to originating row');
    await page.getByRole('tab', { name: /Open/ }).focus(); await page.keyboard.press('ArrowRight');
    check(await page.getByRole('tab', { name: /Reviewing/ }).evaluate(el => el === document.activeElement), 'tab arrow retains focus');
    await reset('open', 'admin', '/admin/verification/reports/10000000-0000-4000-8000-000000000001');
    await page.getByRole('button', { name: 'Start review' }).click();
    await page.getByRole('button', { name: 'Resolve report', exact: true }).waitFor();
    await shot('detail');
    await page.getByRole('button', { name: 'Resolve report', exact: true }).click();
    const resolve = page.getByRole('dialog', { name: 'Resolve report', exact: true });
    await resolve.getByRole('radio', { name: /Dismissed/ }).check();
    check(await resolve.getByRole('button', { name: 'Resolve report', exact: true }).isDisabled(), 'resolve requires shared note');
    await resolve.getByLabel('Note (both students can read it)', { exact: false }).fill('Test shared resolution');
    await shot('resolve');
    await resolve.getByRole('button', { name: 'Resolve report', exact: true }).click();
    await resolve.waitFor({ state: 'hidden' });
    await page.getByText('Test shared resolution', { exact: true }).waitFor();
    check(await page.getByRole('button', { name: 'Resolve report', exact: true }).count() === 0, 'resolved is read-only');
    await reset('open', 'owner', '/admin/verification/reports/10000000-0000-4000-8000-000000000001');
    await page.getByText('Another admin must review this report.').waitFor();
    check(await page.getByRole('button', { name: 'Start review' }).count() === 0, 'participant admin cannot moderate');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no viewport horizontal overflow');
    check(errors.length === 0, `no uncaught page errors: ${errors.join(',')}`);
    results.push({ width, passed: true });
    await page.close();
  }
  assert.equal(network, 0, 'isolated UI makes zero network requests');
  const report = { assertions, networkRequests: network, results, note: 'Mocked UI only; not hosted role/security acceptance.' };
  if (output) await writeFile(path.join(output, 'reports-ui-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
