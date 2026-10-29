import {loadBookings} from './model.js';
import {roomById} from './data.js';
import {renderBookingEmail} from './email-template.js';
const id=location.hash.slice(1),result=loadBookings({getItem:key=>localStorage.getItem(key)}),booking=result.bookings.find(b=>b.id===id);
if(!booking){document.getElementById('email-frame').hidden=true;document.getElementById('email-preview-status').textContent=result.error||'Учебная запись не найдена в этом браузере. Возможно, она отменена.';}
else{const room=roomById(booking.roomId);document.getElementById('email-frame').srcdoc=renderBookingEmail({...booking,roomNumber:room.number,roomName:room.name},{demo:true,name:'друг',cancelUrl:new URL('./cancel.html',location.href).href+'#demo='+booking.id}).html;}
