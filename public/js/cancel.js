import {api} from './booking-client.js';
import {loadBookings,saveBookings,cancelBooking,STORAGE_KEY} from './model.js';
import {roomById,slotLabel} from './data.js';
const title=document.getElementById('cancel-title'),details=document.getElementById('cancel-details'),button=document.getElementById('cancel-submit');
const secret=location.hash.slice(1),demo=secret.startsWith('demo='),id=demo?secret.slice(5):null;let booking;
// The fragment is not sent in HTTP requests, referrers or access logs. Never cancel on GET.
try{if(demo){const restored=loadBookings(localStorage);if(restored.error)throw Error(restored.error);booking=restored.bookings.find(b=>b.id===id)}else if(secret)booking=(await api('reservation',{token:secret})).booking;
if(!booking)throw Error('Бронь не найдена. Возможно, она уже отменена или ссылка открыта в другом браузере.');
if(booking.status==='cancelled'){title.textContent='Бронь уже отменена.';details.textContent='Места освобождены.';}else{title.textContent='Планы изменились?';const room=roomById(booking.roomId);details.textContent=`${demo?'Учебная запись · ':''}${room.number} · ${room.name}. ${booking.date}, ${slotLabel(booking.start)}–${slotLabel(booking.start+booking.hours)}, места ${booking.seatIds.join(', ')}. Нажми кнопку ниже, чтобы освободить их.`;button.hidden=false;}
}catch(e){title.textContent='Не удалось найти бронь.';details.textContent=e.message;}
button.addEventListener('click',async()=>{button.disabled=true;try{if(demo){const cancelLocal=()=>{const fresh=loadBookings(localStorage);if(fresh.error)throw Error(fresh.error);const saved=saveBookings(localStorage,cancelBooking(fresh.bookings,id));if(saved.error)throw Error(saved.error)};if(navigator.locks)await navigator.locks.request(STORAGE_KEY,cancelLocal);else cancelLocal();}else await api('cancel',{token:secret});button.hidden=true;title.textContent='Бронь отменена.';details.textContent='Места снова доступны. До новых идей!';}catch(e){details.textContent=e.message;button.disabled=false;}});
