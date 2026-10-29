export const ARCHIVE_SOURCE='https://saintcapybaras.com/Home/GetStateExamination/11435?page=102';
export const floors=Array.from({length:5},(_,i)=>({number:i+1,page:319+i,year:2012,attic:i===4,booking:i===3,plan:`./assets/floor${i+1}-archive-plan.webp`,sheet:`./assets/floor${i+1}-archive-sheet.webp`,label:i===4?'5-й этаж и чердак':`${i+1}-й этаж`}));
export const floorByNumber=n=>floors.find(f=>f.number===Number(n));
export function changeFloor(state,number){const f=floorByNumber(number);if(!f||f.number===state.floor)return state;return {...state,floor:f.number,roomId:null,seatIds:[],success:null};}
