import {unzipSync} from '../vendor/fflate-unzip.js';
import {parseWeeklyGrid} from './weekly-schedule.js?v=20261113-xlsx';

export const MAX_XLSX_SIZE=2*1024*1024;
const MAX_XML_SIZE=6*1024*1024;
const MAX_ROWS=2500;
const decoder=new TextDecoder('utf-8',{fatal:true});
const relationshipNamespace='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const elements=(node,name)=>Array.from(node.getElementsByTagNameNS('*',name));
const joinedText=node=>elements(node,'t').map(element=>element.textContent).join('');

function readArchive(bytes){
 let expanded=0;
 const files=unzipSync(bytes,{filter:({name,originalSize})=>{
  if(!/^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/u.test(name))return false;
  expanded+=originalSize;
  if(expanded>MAX_XML_SIZE)throw new Error('Таблица Excel слишком большая.');
  return true;
 }});
 const parser=new DOMParser();
 return name=>{
  if(!Object.hasOwn(files,name))throw new Error('В файле Excel отсутствует лист расписания.');
  const source=decoder.decode(files[name]);
  if(/<!DOCTYPE|<!ENTITY/iu.test(source))throw new Error('Файл Excel содержит неподдерживаемую разметку.');
  const doc=parser.parseFromString(source,'application/xml');
  if(doc.documentElement.localName==='parsererror'||elements(doc,'parsererror').length)throw new Error('Не удалось прочитать лист Excel.');
  return doc;
 };
}

function columnIndex(address){
 return {A:0,B:1,C:2}[address?.match(/^([A-Z]+)\d+$/u)?.[1]];
}

function readGrid(sheet,strings){
 const rows=[],merges=[];
 for(const row of elements(sheet,'row')){
  const index=Number(row.getAttribute('r'))-1;
  if(!Number.isInteger(index)||index<0||index>=MAX_ROWS)throw new Error('Слишком много строк в листе Excel.');
  for(const cell of elements(row,'c')){
   const column=columnIndex(cell.getAttribute('r'));
   if(column===undefined||elements(cell,'f').length)continue;
   const value=elements(cell,'v')[0]?.textContent??'';
   const type=cell.getAttribute('t');
   (rows[index]??=[])[column]=type==='s'&&value!==''?strings[Number(value)]??'':type==='inlineStr'?joinedText(cell):value;
  }
 }
 for(const merge of elements(sheet,'mergeCell')){
  const match=merge.getAttribute('ref')?.match(/^([ABC])(\d+):\1(\d+)$/u);
  if(!match)continue;
  const [,col,start,end]=match;
  if(Number(start)<1||Number(end)>MAX_ROWS||Number(start)>Number(end))throw new Error('В листе Excel повреждены объединённые ячейки.');
  merges.push({column:'ABC'.indexOf(col),first:Number(start)-1,last:Number(end)-1});
 }
 return {rows,merges};
}

function sheetPath(target){
 const path=target?.startsWith('/')?target.slice(1):'xl/'+target;
 return /^xl\/worksheets\/[^./][^/]*\.xml$/u.test(path)?path:null;
}

export function readXlsxSchedule(bytes){
 if(bytes.byteLength>MAX_XLSX_SIZE)throw new Error('Файл Excel слишком большой. Максимум 2 МБ.');
 try{
  const xml=readArchive(bytes);
  const workbook=xml('xl/workbook.xml'),rels=elements(xml('xl/_rels/workbook.xml.rels'),'Relationship');
  const strings=rels.some(rel=>rel.getAttribute('Type')?.endsWith('/sharedStrings'))
   ?elements(xml('xl/sharedStrings.xml'),'si').map(joinedText):[];
  const targets=new Map(rels.filter(rel=>rel.getAttribute('Type')?.endsWith('/worksheet')&&rel.getAttribute('TargetMode')!=='External')
   .map(rel=>[rel.getAttribute('Id'),sheetPath(rel.getAttribute('Target'))]));
  for(const sheet of elements(workbook,'sheet')){
   const path=targets.get(sheet.getAttributeNS(relationshipNamespace,'id'));
   if(!path)continue;
   const {rows,merges}=readGrid(xml(path),strings);
   const schedule=parseWeeklyGrid(rows,merges,sheet.getAttribute('name'));
   if(schedule)return schedule;
  }
 }catch(error){
  if(error.code!==undefined||error instanceof TypeError)throw new Error('Не удалось открыть Excel. Скачайте расписание группы заново в формате .xlsx.');
  throw error;
 }
 throw new Error('Не найдены колонки «День», «Время» и «Занятие». Загрузите .xlsx из расписания СПбГУПТД.');
}
