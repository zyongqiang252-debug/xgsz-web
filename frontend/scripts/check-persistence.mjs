import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {assertTestDatabase} from './test-database.mjs';
const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
const database=process.env.XGSZ_PERSISTENCE_DATABASE_URL;
assertTestDatabase(database);
const base='http://127.0.0.1:18081';
const password=`Persistence-${randomUUID()}`;
let child,cookie='',csrf='';
async function start(){
  let logs='';child=spawn('java',['-jar','website/target/xgsz-website-1.0.0.jar','--server.port=18081','--spring.sql.init.mode=always',`--spring.datasource.url=${database}`],{cwd:projectRoot,windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',data=>{logs+=data;});child.stderr.on('data',data=>{logs+=data;});
  for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(`Persistence test server exited: ${logs.slice(-1000)}`);try{const response=await fetch(`${base}/api/health`);if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,200));}
  throw Error('Persistence test server did not become ready');
}
async function stop(){if(child&&child.exitCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited;}}
async function call(path,method='GET',body){
  const response=await fetch(base+'/api'+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-TOKEN':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
  for(const value of response.headers.getSetCookie())if(value.startsWith('JSESSIONID='))cookie=value.split(';')[0];
  const result=await response.json();if(!response.ok)throw Error(`${method} ${path}: ${response.status} ${result.message}`);return result.data;
}
async function session(){const state=await call('/auth/session');csrf=state.csrf;return state;}
try{
  await start();await session();
  await call('/auth/setup','POST',{username:'persistence-test',password});await call('/auth/login','POST',{username:'persistence-test',password});await session();
  const product=await call('/admin/products','POST',{name:'重启持久化验证产品',desc:'验证已提交数据在进程重启后保留',category:'general',published:true,features:[]});
  const home=await call('/admin/pages/home');await call('/admin/pages/home','PUT',{...home,heroTitle:'重启持久化验证首页'});
  const category=await call('/admin/catalog/categories','POST',{name:'持久化自定义分类',description:'重启后保留',enabled:true});
  const form=new FormData();form.set('file',new Blob([await readFile(new URL('../public/assets/xgsz-logo.jpg',import.meta.url))],{type:'image/jpeg'}),'logo.jpg');
  const uploaded=await fetch(base+'/api/admin/media',{method:'POST',headers:{Cookie:cookie,'X-CSRF-TOKEN':csrf},body:form});
  if(uploaded.status!==201)throw Error('Image upload failed');const media=(await uploaded.json()).data;
  const beforeImage=Buffer.from(await (await fetch(base+media.url)).arrayBuffer());
  await call('/admin/catalog/brands','POST',{name:'持久化验证品牌',description:'持久化图像',logo:media.url});
  await call('/public/inquiries','POST',{name:'持久化测试',phone:'13800138000',company:'自动验证',intent:'重启测试',message:'验证咨询入库',consent:true});
  await stop();cookie='';csrf='';await start();
  const state=await session();if(state.setupRequired)throw Error('Administrator was not persisted');
  await call('/auth/login','POST',{username:'persistence-test',password});await session();
  const content=await call('/admin/content');const inquiries=await call('/admin/inquiries');
  if(!content.products.some(x=>x.id===product.id&&x.name==='重启持久化验证产品')||!inquiries.some(x=>x.intent==='重启测试'))throw Error('Saved content or inquiry was lost');
  if(content.pages.home.heroTitle!=='重启持久化验证首页'||!content.categories.some(x=>x.key===category.key)||!content.brands.some(x=>x.logo===media.url))throw Error('Saved CMS content was lost');
  const afterImage=Buffer.from(await (await fetch(base+media.url)).arrayBuffer());if(!beforeImage.equals(afterImage))throw Error('Saved image was lost');
  console.log('PASS: restart preserved administrator, products, inquiries, CMS page edits, custom categories, brands and uploaded image bytes.');
}finally{await stop();}
