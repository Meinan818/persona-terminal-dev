// Fixed in-memory route for interaction design. Production routing remains owned by the tower store.
export const towerNodes = {
  mob:{title:'聒噪的假面',kind:'小影',icon:'sword',hp:'312 / 420',weak:'知识',note:'先看意图，再决定这一回合。',action:'进入战斗'},
  echo:{title:'回忆之光',kind:'回响',icon:'star',hp:'—',weak:'—',note:'选择回复 20% 体力，或带走本次登塔伤害 +6%。',action:'进入回响'},
  chest:{title:'月匣',kind:'月匣',icon:'box',hp:'—',weak:'—',note:'揭晓后再领取，不会重复发放同一份收获。',action:'查看月匣'},
  event:{title:'月光积水',kind:'异变',icon:'eye',hp:'—',weak:'—',note:'凝视水面，或保留气力绕开。选择后显示结果。',action:'走近看看'},
  quiz:{title:'镜之自问',kind:'镜问',icon:'eye',hp:'—',weak:'—',note:'从白昼的回声里，认出那份力量。',action:'回答镜中的自己'},
  boss:{title:'回声的执念',kind:'心魔',icon:'mask',hp:'312 / 420',weak:'知识',note:'第一形态击破后，在同一个战斗舞台直接变身。',action:'迎战心魔'},
};
const floors={4:['echo','mob','chest'],5:['event','quiz','mob'],6:['echo','chest','mob'],7:['mob','event','chest'],8:['quiz','echo','mob'],9:['echo','mob','chest'],10:['boss']};
export function createTowerJourney(){
  const journey={active:false,floor:3,pending:null,selected:'mob',history:[],buffs:[],loot:[],ended:null};
  const choices=()=>journey.ended?[]:floors[journey.pending?journey.floor:Math.min(10,journey.floor+1)]??[];
  const start=()=>{Object.assign(journey,{active:true,floor:3,pending:null,selected:'mob',history:[],buffs:[],loot:[],ended:null});};
  const select=kind=>{if(journey.pending||!choices().includes(kind))return false;journey.selected=kind;return true;};
  const enter=()=>{
    if(journey.ended||journey.pending||!choices().includes(journey.selected))return null;
    journey.floor++;journey.pending={floor:journey.floor,kind:journey.selected,resolved:false,result:null,rewarded:false};return journey.pending;
  };
  const resolve=(result)=>{
    const pending=journey.pending;if(!pending||pending.resolved||journey.ended)return false;
    pending.resolved=true;pending.result=result;journey.history.push({floor:pending.floor,kind:pending.kind,...result});return true;
  };
  const advance=()=>{
    if(journey.ended||!journey.pending?.resolved)return false;
    const last=journey.pending.kind;journey.pending=null;
    if(last==='boss'){journey.ended='clear';return true;}
    journey.selected=(floors[journey.floor+1]??[])[0]??'boss';return true;
  };
  const end=reason=>{if(journey.ended)return false;journey.ended=reason;return true;};
  const addLoot=()=>{
    if(!journey.pending||journey.pending.rewarded||journey.ended)return false;
    journey.pending.rewarded=true;journey.loot.push({floor:journey.floor,label:'回响之线',sp:10});return true;
  };
  return{journey,choices,start,select,enter,resolve,advance,end,addLoot};
}
