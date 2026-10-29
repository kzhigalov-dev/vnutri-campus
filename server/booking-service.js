import {validateRequest,todayMoscow} from '../public/js/model.js';
import {roomById} from '../public/js/data.js';
import {renderBookingEmail} from '../public/js/email-template.js';
const uuid=/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'}});
const hex=buffer=>[...new Uint8Array(buffer)].map(x=>x.toString(16).padStart(2,'0')).join('');
const digest=async text=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
async function tokenFor(id,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return id+'.'+hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(id)));}
function configured(env){try{return env.BOOKING_ENABLED==='true'&&!!env.DB&&!!env.RESEND_API_KEY&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.MAIL_FROM||'')&&env.BOOKING_TOKEN_SECRET?.length>=32&&new URL(env.SITE_URL).protocol==='https:'}catch{return false}}
const statement=(db,sql,...args)=>db.prepare(sql).bind(...args);
function serialize(row){const room=roomById(row.room_id);return {id:row.id,roomId:row.room_id,roomName:room.name,roomNumber:room.number,date:row.date,start:row.start,hours:row.hours,seatIds:JSON.parse(row.seats),total:0,createdAt:row.created_at,status:row.status,emailStatus:row.email_status};}
async function findToken(db,token){if(typeof token!=='string'||token.length!==101)return null;return statement(db,'SELECT * FROM bookings WHERE id = ? AND token_hash = ?',token.slice(0,36),await digest(token)).first();}
async function sendConfirmation(row,env,send){
 if(row.email_status==='accepted'||row.status!=='active')return row.email_status;
 const token=await tokenFor(row.id,env.BOOKING_TOKEN_SECRET),cancelUrl=new URL('/cancel.html',env.SITE_URL).href+'#'+token;
 const mail=renderBookingEmail(serialize(row),{cancelUrl,name:row.email.split('@')[0]});let status='unknown';
 try{const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':'booking-'+row.id},body:JSON.stringify({from:env.MAIL_FROM,to:[row.email],...mail}),signal:AbortSignal.timeout(10000)});status=response.ok?'accepted':'failed';}catch{/* Reservation remains valid; never claim mail was accepted. */}
 await statement(env.DB,'UPDATE bookings SET email_status = ? WHERE id = ?',status,row.id).run();return status;
}
export async function handleBookingRequest(request,env,{fetch:send=fetch}={}){
 try{
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\//,''),owner=request.headers.get('oai-authenticated-user-id'),email=request.headers.get('oai-authenticated-user-email'),enabled=configured(env);
 if(path==='config'&&request.method==='GET')return json({enabled,mode:enabled?'pilot':'demo',emailConfigured:enabled,signedIn:!!owner,email:owner?email:null});
 const write=request.method==='POST';if(write&&request.headers.get('Origin')!==url.origin)return json({error:'Открой форму на сайте и повтори действие.'},403);
 if(!['GET','POST'].includes(request.method))return json({error:'Метод не поддерживается.'},405);
 if(!env.DB)return json({error:'Сервер бронирования пока не подключён.'},503);
 if(path==='cancel'||path==='reservation'){
  let body={};if(write){if(Number(request.headers.get('content-length'))>4096)return json({error:'Слишком большой запрос.'},413);try{const raw=await request.text();if(raw.length>4096)return json({error:'Слишком большой запрос.'},413);body=JSON.parse(raw);}catch{return json({error:'Некорректный запрос.'},400)}}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Некорректный запрос.'},400);
  const token=write?body.token:url.searchParams.get('token');let row=token?await findToken(env.DB,token):null;
  if(!row&&write&&owner&&uuid.test(body.id||''))row=await statement(env.DB,'SELECT * FROM bookings WHERE id = ? AND owner = ?',body.id,owner).first();
  if(!row)return json({error:'Бронь не найдена. Проверь ссылку или открой свои брони.'},404);
  if(!write||path==='reservation')return json({booking:serialize(row)});
  await env.DB.batch([statement(env.DB,"UPDATE bookings SET status = 'cancelled' WHERE id = ?",row.id),statement(env.DB,'DELETE FROM booking_slots WHERE booking_id = ?',row.id)]);return json({cancelled:true});
 }
 if(!owner||!email||!/^\S+@\S+\.\S+$/.test(email))return json({error:'Войди через ChatGPT, чтобы управлять бронями.'},401);
 if(path==='availability'&&request.method==='GET'){
  const date=url.searchParams.get('date');if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return json({error:'Укажи дату.'},400);
  const data=await statement(env.DB,'SELECT room_id, hour, seat FROM booking_slots WHERE date = ?',date).all();return json({slots:data.results});
 }
 if(path!=='bookings')return json({error:'Страница не найдена.'},404);
 if(!write){const rows=await statement(env.DB,"SELECT * FROM bookings WHERE owner = ? AND date >= ? AND status = 'active' ORDER BY date, start",owner,todayMoscow()).all();return json({bookings:rows.results.map(serialize)});}
 if(!enabled)return json({error:'Почта ещё не настроена. Доступен только учебный режим в браузере.'},503);
 const raw=await request.text();if(raw.length>4096)return json({error:'Слишком большой запрос.'},413);let p;try{p=JSON.parse(raw)}catch{return json({error:'Некорректный запрос.'},400)}
 if(!p||typeof p!=='object'||Array.isArray(p))return json({error:'Некорректный запрос.'},400);
 const errors=validateRequest(p,[],todayMoscow(),true,false);if(!uuid.test(p.id||''))errors.room='Обнови форму и повтори запись.';if(Object.keys(errors).length)return json({error:errors},400);
 p={...p,start:Number(p.start),hours:Number(p.hours),seatIds:[...p.seatIds].sort((a,b)=>a-b)};
 let row=await statement(env.DB,'SELECT * FROM bookings WHERE id = ?',p.id).first();
 if(row){if(row.owner!==owner||row.room_id!==p.roomId||row.date!==p.date||row.start!==p.start||row.hours!==p.hours||row.seats!==JSON.stringify(p.seatIds))return json({error:'Запрос с таким номером уже существует.'},409);if(row.status!=='active')return json({error:'Эта бронь уже отменена.'},409);}
 else{
  const count=await statement(env.DB,"SELECT count(*) AS n FROM bookings WHERE owner = ? AND date >= ? AND status = 'active'",owner,todayMoscow()).first();if(count.n>=10)return json({error:'Можно сохранить не более 10 предстоящих броней.'},429);
  const token=await tokenFor(p.id,env.BOOKING_TOKEN_SECRET),createdAt=new Date().toISOString();
  const batch=[statement(env.DB,'INSERT INTO bookings (id,owner,email,room_id,date,start,hours,seats,created_at,token_hash) VALUES (?,?,?,?,?,?,?,?,?,?)',p.id,owner,email,p.roomId,p.date,p.start,p.hours,JSON.stringify(p.seatIds),createdAt,await digest(token))];
  for(let h=p.start;h<p.start+p.hours;h++)for(const seat of p.seatIds)batch.push(statement(env.DB,'INSERT INTO booking_slots (booking_id,room_id,date,hour,seat) VALUES (?,?,?,?,?)',p.id,p.roomId,p.date,h,seat));
  try{await env.DB.batch(batch)}catch(e){if(/unique|constraint/i.test(String(e)))return json({error:'Места только что заняли. Обнови доступность и выбери другие.'},409);throw e}
  row=await statement(env.DB,'SELECT * FROM bookings WHERE id = ?',p.id).first();
 }
 const emailStatus=await sendConfirmation(row,env,send);return json({booking:{...serialize(row),emailStatus},emailStatus},201);
 }catch{return json({error:'Не удалось выполнить запрос. Сохранённые брони можно проверить в «Моих бронях».'},500)}
}
