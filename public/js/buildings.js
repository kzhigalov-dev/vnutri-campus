import {campusBuildings,buildingById,cityDirections,indoorDirections} from './campus-buildings.js?v=20261112-polish';

const $=id=>document.getElementById(id);
const from=$('building-from'),to=$('building-to');
from.append(new Option('Указать в Google Картах',''));
for(const building of campusBuildings){
 from.append(new Option(building.address,building.id));
 to.append(new Option(building.address,building.id));
}
const params=new URLSearchParams(location.search);
from.value=buildingById(params.get('from'))?.id??'';
const initialBuilding=buildingById(params.get('to'));
to.value=initialBuilding?.id??'voznesensky';
let requestedRoom=initialBuilding?params.get('room'):null;

function render(){
 const target=buildingById(to.value),url=cityDirections(from.value,target.id);
 const indoor=indoorDirections(location.href,target.id,requestedRoom);
 const route=$('building-route'),plan=$('building-plan');
 route.hidden=!url;
 if(url)route.href=url;
 plan.hidden=!indoor;
 plan.classList.toggle('button-secondary',Boolean(url));
 if(indoor){
  plan.href=indoor.url.href;
  plan.textContent=indoor.room?`От входа до аудитории ${indoor.room.number} →`:'Открыть план этажей';
 }
 const status=[];
 if(!url)status.push('Оба адреса совпадают.');
 else if(!from.value)status.push('Точку старта можно указать в Google Картах.');
 if(indoor?.room)status.push(url?`У корпуса откройте маршрут от входа до аудитории ${indoor.room.number}.`:`Маршрут внутри корпуса начинается у главного входа.`);
 $('building-status').textContent=status.join(' ');
 const page=new URL(location.href);
 if(from.value)page.searchParams.set('from',from.value);
 else page.searchParams.delete('from');
 page.searchParams.set('to',to.value);
 if(indoor?.room)page.searchParams.set('room',indoor.room.number);
 else page.searchParams.delete('room');
 history.replaceState(null,'',page);
}
from.addEventListener('change',render);
to.addEventListener('change',()=>{
 requestedRoom=null;
 render();
});
$('building-list').innerHTML=campusBuildings.map(building=>`<article class="card"><div class="card-body"><span class="pill">${building.code}</span><h2>${building.address}</h2><a class="text-link" href="${building.source}" target="_blank" rel="noopener noreferrer">Адрес на сайте университета ↗</a></div></article>`).join('');
render();
