import {campusBuildings,buildingById,cityDirections} from './campus-buildings.js';

const $=id=>document.getElementById(id);
const from=$('building-from'),to=$('building-to');
from.append(new Option('Моё местоположение',''));
for(const building of campusBuildings){
 from.append(new Option(building.address,building.id));
 to.append(new Option(building.address,building.id));
}
const params=new URLSearchParams(location.search);
from.value=buildingById(params.get('from'))?.id??'';
to.value=buildingById(params.get('to'))?.id??'voznesensky';

function render(){
 const target=buildingById(to.value),url=cityDirections(from.value,target.id);
 const route=$('building-route'),plan=$('building-plan');
 route.hidden=!url;
 if(url)route.href=url;
 plan.hidden=!target.plan;
 if(target.plan)plan.href=target.plan;
 $('building-status').textContent=url?'':'Выберите два разных корпуса.';
 const page=new URL(location.href);
 if(from.value)page.searchParams.set('from',from.value);
 else page.searchParams.delete('from');
 page.searchParams.set('to',to.value);
 history.replaceState(null,'',page);
}
from.addEventListener('change',render);
to.addEventListener('change',render);
$('building-list').innerHTML=campusBuildings.map(building=>`<article class="card"><div class="card-body"><span class="pill">${building.code}</span><h2>${building.address}</h2><a class="text-link" href="${building.source}" target="_blank" rel="noopener noreferrer">Адрес на сайте университета ↗</a></div></article>`).join('');
render();
