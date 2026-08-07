"use strict";const NUTS=DATA.nutrients,FOODS=DATA.foods,GROUPS=[{id:"macro",label:"Macronutrients",icon:I.macro},{id:"fats",label:"Omega & fats",icon:I.fats},{id:"amino",label:"Amino acids",icon:I.amino},{id:"vitamin",label:"Vitamins",icon:I.vit},{id:"mineral",label:"Minerals",icon:I.min},{id:"carbdetail",label:"Carbohydrate detail",icon:I.carb},{id:"acids",label:"Organic acids",icon:I.acid},{id:"plant",label:"Plant compounds",icon:I.plant}],VNUTS=NUTS.filter(e=>!e.evidence),IDX=new Map(VNUTS.map((e,t)=>[e.id,t])),CATS=[...new Set(FOODS.map(e=>e.cat))].sort(),slugify=e=>`${e.name} ${e.state||""}`.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),SLUGS=FOODS.map(slugify),BY_SLUG=new Map(SLUGS.map((e,t)=>[e,t])),BY_ID=new Map(NUTS.map(e=>[e.id,e])),nutOpt=e=>BY_ID.get(e),nut=e=>{const t=nutOpt(e);if(!t)throw new Error(`unknown nutrient id: ${e}`);return t},foodAt=e=>{const t=FOODS[e];if(!t)throw new Error(`no food at index ${e}`);return t},slugAt=e=>{const t=SLUGS[e];if(t===void 0)throw new Error(`no food at index ${e}`);return t},foodBySlug=e=>{const t=BY_SLUG.get(e);return t===void 0?void 0:FOODS[t]},groupOf=e=>{const t=GROUPS.find(n=>n.id===e);if(!t)throw new Error(`unknown nutrient group: ${e}`);return t},isGroup=e=>GROUPS.some(t=>t.id===e),RENAMED={"navy-beans-cooked":"haricot-beans-cooked"},currentSlug=e=>RENAMED[e]||e,NOTES=DATA.notes||[],NOTE_AT=new Map;for(const e of NOTES)for(const[t,n]of Object.entries(e.cells||{}))for(const a of n)NOTE_AT.set(`${t} ${a}`,e);const noteFor=(e,t)=>NOTE_AT.get(`${slugAt(e)} ${t}`)||null,ABSORB_NOTES=new Set(["oxalate-high","oxalate-low"]),noteMark=e=>`<sup class="fnote" aria-hidden="true">${esc(e.marker)}</sup><span class="sr">, ${esc(e.short)}</span>`,INTERACTIONS=X.interactions,AFFECTING=new Map;for(const e of INTERACTIONS)for(const t of e.affects)AFFECTING.set(t,[...AFFECTING.get(t)||[],e]);const ACTING=new Map;for(const e of INTERACTIONS)e.agent.kind==="nutrient"&&ACTING.set(e.agent.id,[...ACTING.get(e.agent.id)||[],e]);const affecting=e=>AFFECTING.get(e)||[],acting=e=>ACTING.get(e)||[],hasInteractions=e=>affecting(e).length>0||acting(e).length>0,affectedLabels=e=>e.affects.map(t=>nutOpt(t)?.label??t),RANK_DEPTH=10;function sourceOf(e){const t=[];for(const n of VNUTS){if(!hasInteractions(n.id))continue;const a=val(e,n.id);if(!(a===null||a<=0))if(n.dv)a/n.dv>=.1&&t.push(n.id);else{const s=IDX.get(n.id);if(s===void 0)continue;let o=0;for(const i of FOODS){const c=i.v[s];if(typeof c=="number"&&c>a&&++o>=RANK_DEPTH)break}o<RANK_DEPTH&&t.push(n.id)}}return t}function gapEvidence(e){const t=nutOpt(e);if(!t||t.evidence)return null;let n=0,a=0,s=0,o=0,i=null,c=null;return FOODS.forEach((r,d)=>{const l=val(r,e);if(l===null){s++;return}if(l===0){a++;return}if(n++,noteFor(d,e)?.id==="fortified"){o++;return}if(t.dv){const u=l/t.dv*100;(i===null||u>i)&&(i=u,c=r.name)}}),{above:n,zero:a,unassayed:s,of:FOODS.length,fortified:o,bestPc:i,bestFood:c}}function gapEvidenceText(e){const t=e.nutrients.map(n=>{const a=gapEvidence(n);if(!a)return"";const s=nutOpt(n)?.label??n,o=[`${a.above} of ${a.of} foods ${a.above===1?"has":"have"} any at all`];return a.fortified&&o.push(`${a.fortified} of those ${a.fortified===1?"is":"are"} fortification rather than the food`),a.zero&&o.push(`${a.zero} were measured and found to contain none`),a.unassayed&&o.push(`${a.unassayed} ${a.unassayed===1?"was":"were"} never assayed`),a.bestPc!==null&&a.bestFood&&o.push(`the best unfortified is ${esc(a.bestFood)}, at ${Math.round(a.bestPc)}% of a daily value per 100 g`),`<li><b>${esc(s)}:</b> ${o.join("; ")}.</li>`}).filter(Boolean);return t.length?`<ul class="gapev"><li class="gapevhead">Measured from this table,
    not quoted:</li>${t.join("")}</ul>`:""}function agentLabel(e){return e.kind==="nutrient"?nutOpt(e.id)?.label??e.id:e.kind==="food"?foodBySlug(e.slug)?.name??e.slug:e.label}const BUILTIN_LENSES=[{id:"eaa",name:"Essential amino acids",ids:["his","ile","leu","lys","met","phe","thr","trp","val"],why:"The nine amino acids the body cannot make and must get from food. A protein is only as useful as its scarcest one, so the lowest of these caps the rest."},{id:"creatine",name:"Creatine precursors",ids:["gly","arg","met"],why:"Creatine is not present in plant foods, so vegans synthesise it from these three amino acids. Body stores tend to run lower on a plant-based diet."},{id:"bcaa",name:"Branched-chain (BCAA)",ids:["leu","ile","val"],why:"The three amino acids muscle burns directly rather than sending to the liver. Leucine is the one that triggers muscle protein synthesis."},{id:"sulphur",name:"Sulphur amino acids",ids:["met","cys"],why:"Methionine and cysteine are scored as a pair because cysteine spares methionine. Pulses are usually short on both, which is what grains make up for."},{id:"aromatic",name:"Aromatic amino acids",ids:["phe","tyr"],why:"Phenylalanine and tyrosine are scored as a pair, since the body makes tyrosine from phenylalanine. Both feed dopamine and thyroid hormone production."},{id:"iron",name:"Iron & absorption",ids:["fe","vitc"],why:"Plant iron is non-haem and poorly absorbed on its own. Vitamin C in the same meal can multiply uptake severalfold, so the two columns are worth reading together."},{id:"bone",name:"Bone health",ids:["ca","vitd","vitk","mg","p"],why:"Calcium is only half the story: vitamin D governs how much you absorb, vitamin K directs it into bone, and magnesium and phosphorus build the mineral itself."},{id:"methyl",name:"B12, folate & methylation",ids:["b12","b9","b6","chol","met"],why:"The nutrients that keep homocysteine in check. B12 is the critical gap on a vegan diet, because unfortified plant foods are not a reliable source whatever these figures show."},{id:"omega",name:"Omega balance",ids:["ala","la","epa","dha"],why:"The two fats the body cannot make, and the two it is meant to build from them. ALA and LA compete for the same enzymes, so a diet heavy in omega-6 blunts an already poor conversion. EPA and DHA are what that conversion is for, and both columns are all but empty across these foods, which is the point of showing them."},{id:"antiox",name:"Antioxidant vitamins",ids:["vita","vitc","vite","se"],why:"Nutrients that limit oxidative damage, working in different compartments: vitamin C in water, vitamin E in fat, and selenium as part of the enzymes that recycle them."},{id:"electro",name:"Electrolytes",ids:["na","k","mg","ca"],why:"The minerals governing fluid balance, nerve signalling and muscle contraction. Whole plant foods are naturally high in potassium and low in sodium, the opposite of most processed food."}],DAY_MAX_G=5e3,DEFAULT_G=100,DEFAULT_KG=70,S={groups:new Set(GROUPS.map(e=>e.id)),sort:{id:"__name",dir:1},q:"",cat:"",sel:0,favs:new Set,favsOnly:!1,dv:!1,basis:"g",view:"table",tab:"overview",chartNut:"protein",dark:!1,lens:"",custom:[],day:[],kg:DEFAULT_KG,wUnit:"kg"},clampG=e=>{const t=Math.round(Number(e));return isFinite(t)&&t>0?Math.min(t,DAY_MAX_G):0},clampKg=e=>{const t=Number(e);return!isFinite(t)||t<=0?DEFAULT_KG:Math.round(Math.min(Math.max(t,30),250)*10)/10},LB_PER_KG=2.2046226218,LB_PER_ST=14,kgToStLb=e=>{const t=Math.round(e*LB_PER_KG);return{st:Math.floor(t/LB_PER_ST),lb:t%LB_PER_ST}},stLbToKg=(e,t)=>(e*LB_PER_ST+t)/LB_PER_KG;function weightLabel(){if(S.wUnit!=="stlb")return`${+S.kg.toFixed(1)} kg`;const{st:e,lb:t}=kgToStLb(S.kg);return`${e} st ${t} lb`}const LS_KEY="vegan-nutrients:v1";let storageOK=!0;function savePrefs(){if(storageOK)try{localStorage.setItem(LS_KEY,JSON.stringify({favs:[...S.favs],groups:[...S.groups],sort:S.sort,dv:S.dv,basis:S.basis,dark:S.dark,lens:S.lens,custom:S.custom,favsOnly:S.favsOnly,cat:S.cat,chartNut:S.chartNut,day:S.day,kg:S.kg,wUnit:S.wUnit}))}catch{storageOK=!1}}const lensById=e=>e&&[...BUILTIN_LENSES,...S.custom].find(t=>t.id===e)||null,lensIds=()=>new Set(lensById(S.lens)?.ids||[]);function loadPrefs(){let e;try{e=JSON.parse(localStorage.getItem(LS_KEY)||"null")}catch{storageOK=!1;return}if(!(!e||typeof e!="object")){if(Array.isArray(e.favs)&&(S.favs=new Set(e.favs.map(currentSlug).filter(t=>typeof t=="string"&&BY_SLUG.has(t)))),Array.isArray(e.groups)){const t=e.groups.filter(isGroup);t.length&&(S.groups=new Set(t))}e.sort&&(e.sort.id==="__name"||BY_ID.has(e.sort.id))&&(S.sort={id:e.sort.id,dir:e.sort.dir===1?1:-1}),typeof e.dv=="boolean"&&(S.dv=e.dv),(e.basis==="g"||e.basis==="kcal")&&(S.basis=e.basis),typeof e.dark=="boolean"&&(S.dark=e.dark),CATS.includes(e.cat)&&(S.cat=e.cat),IDX.has(e.chartNut)&&(S.chartNut=e.chartNut),Array.isArray(e.day)&&(S.day=e.day.filter(t=>t&&typeof t.slug=="string").map(t=>({slug:currentSlug(t.slug),g:clampG(t.g)})).filter(t=>BY_SLUG.has(t.slug))),typeof e.kg=="number"&&isFinite(e.kg)&&(S.kg=clampKg(e.kg)),(e.wUnit==="kg"||e.wUnit==="stlb")&&(S.wUnit=e.wUnit),Array.isArray(e.custom)&&(S.custom=e.custom.filter(t=>t&&typeof t.name=="string"&&Array.isArray(t.ids)).map(t=>({id:String(t.id||""),name:t.name.slice(0,40),ids:t.ids.filter(n=>typeof n=="string"&&BY_ID.has(n)),...typeof t.why=="string"&&t.why?{why:t.why.slice(0,240)}:{}})).filter(t=>t.id&&t.ids.length)),typeof e.lens=="string"&&lensById(e.lens)&&(S.lens=e.lens),S.favsOnly=e.favsOnly===!0&&S.favs.size>0}}const $=e=>{const t=document.querySelector(e);if(!t)throw new Error(`missing element: ${e}`);return t},$opt=e=>document.querySelector(e),targetEl=e=>e.target instanceof HTMLElement?e.target:null,targetInput=e=>e.target instanceof HTMLInputElement?e.target:null,targetAnyEl=e=>e.target instanceof Element?e.target:null,ESCAPES={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},esc=e=>String(e).replace(/[&<>"']/g,t=>ESCAPES[t]??t),say=e=>{$("#live").textContent=e},GROUP_AT=new Map(GROUPS.map((e,t)=>[e.id,t])),COL_ORDER=(()=>{const e=NUTS.map((t,n)=>({...t,i:n})).sort((t,n)=>(GROUP_AT.get(t.group)??0)-(GROUP_AT.get(n.group)??0));for(const t of e.filter(n=>n.after))e.findIndex(a=>a.id===t.after)!==-1&&(e.splice(e.indexOf(t),1),e.splice(e.findIndex(a=>a.id===t.after)+1,0,t));return e})(),cols=()=>COL_ORDER.filter(e=>S.groups.has(e.group)),val=(e,t)=>{const n=IDX.get(t);if(n===void 0)throw new Error(`unknown nutrient id: ${t}`);return e.v[n]??null},GRAMS_PER=100,KCAL_BASIS=100;function gramsPer100kcal(e){const t=val(e,"kcal");return t?KCAL_BASIS/t*GRAMS_PER:null}const basisLabel=()=>S.basis==="kcal"?"per 100 kcal":"per 100 g";function shown(e,t){if(t.evidence)return null;const n=val(e,t.id);if(S.basis==="g"||t.id==="kcal"||n===null)return n;const a=val(e,"kcal");return a?n/a*KCAL_BASIS:null}const ev=(e,t)=>EV[e]?.cells[t],evFood=e=>EV[e],evText=(e,t)=>{if(!e)return"no data";switch(e.state){case"measured":return e.value.toFixed(t);case"range":return`${e.low.toFixed(t)} to ${e.high.toFixed(t)}`;case"estimated":return e.value.toFixed(t);case"trace":return"trace";case"not-detected":return"none detected";case"not-measured":return"not measured"}},evSortKey=(e,t)=>{const n=ev(e,t);return n?n.state==="measured"||n.state==="estimated"?n.value??null:n.state==="range"?(n.low+n.high)/2:null:null},NAME_COUNT=FOODS.reduce((e,t)=>e.set(t.name,(e.get(t.name)||0)+1),new Map),fullName=e=>(NAME_COUNT.get(e.name)??0)>1&&e.state?`${e.name}, ${e.state}`:e.name,isFav=e=>S.favs.has(slugAt(e));function toggleFav(e){isFav(e)?S.favs.delete(slugAt(e)):S.favs.add(slugAt(e)),S.favsOnly&&!S.favs.size&&(S.favsOnly=!1),savePrefs()}function fmtText(e,t){return e===null?"n/a":S.dv&&t.dv?e===0?"0%":Math.round(e/t.dv*100)+"%":e===0?"0":e.toFixed(t.dp)}function fmt(e,t){return e===null?'<span class="na">n/a</span>':fmtText(e,t)}const FAO_PATTERN=[{label:"Histidine",ids:["his"],mg:15},{label:"Isoleucine",ids:["ile"],mg:30},{label:"Leucine",ids:["leu"],mg:59},{label:"Lysine",ids:["lys"],mg:45},{label:"Methionine + cysteine",ids:["met","cys"],mg:22},{label:"Phenylalanine + tyrosine",ids:["phe","tyr"],mg:38},{label:"Threonine",ids:["thr"],mg:23},{label:"Tryptophan",ids:["trp"],mg:6},{label:"Valine",ids:["val"],mg:39}];function proteinQuality(e){const t=val(e,"protein");if(!t||t<1)return null;const n=[];for(const o of FAO_PATTERN){let i=0;for(const r of o.ids){const d=val(e,r);if(d===null)return null;i+=d}const c=i*1e3/t;n.push({label:o.label,pc:c/o.mg*100})}if(n.some(o=>!isFinite(o.pc)))return null;const a=n.reduce((o,i)=>i.pc<o.pc?i:o),s=val(e,"kcal");return{score:Math.round(a.pc),limiting:a.label,perKcal:s!==null&&s>0?t/s*100:null}}function omegaRatio(e){const t=val(e,"la"),n=val(e,"ala");return!t||!n?null:t>=n?{a:t/n,flip:!1}:{a:n/t,flip:!0}}const dayEntries=()=>S.day.flatMap(e=>{const t=BY_SLUG.get(e.slug);if(t===void 0)return[];const n=FOODS[t];return n?[{...e,i:t,f:n}]:[]}),dayContributors=()=>dayEntries().filter(e=>e.g>0),dayGrams=()=>dayContributors().reduce((e,t)=>e+t.g,0);function dayTotals(){const e=dayContributors();return VNUTS.map(t=>{let n=0,a=0;const s=new Set;for(const o of e){const i=val(o.f,t.id);if(i===null)continue;a++,n+=i*o.g/100;const c=noteFor(o.i,t.id);c&&s.add(c)}return{n:t,total:a?n:null,from:a,of:e.length,partial:a>0&&a<e.length,notes:[...s]}})}const totalOf=(e,t)=>{const n=IDX.get(t),a=n===void 0?void 0:e[n];if(!a)throw new Error(`no day total for nutrient id: ${t}`);return a},PROTEIN_G_PER_KG=.66,aaTargets=e=>FAO_PATTERN.map(t=>({label:t.label,ids:t.ids,target:t.mg*PROTEIN_G_PER_KG*e/1e3}));function dayAminoAcids(e){const t=dayContributors();return t.length?aaTargets(S.kg).map(n=>{const s=t.every(o=>n.ids.every(i=>val(o.f,i)!==null))?n.ids.reduce((o,i)=>{const c=totalOf(e,i).total;return o===null||c===null?null:o+c},0):null;return s===null?{...n,got:null,pc:null}:{...n,got:s,pc:s/n.target*100}}):[]}function dayProteinQuality(e){const t=dayContributors();if(!t.length)return null;const n=FAO_PATTERN.flatMap(s=>s.ids);return t.every(s=>n.every(o=>val(s.f,o)!==null))?proteinQuality({v:e.map(s=>s.total)}):null}const A_BUDGET=new Set(["kcal","carbs","fat","satfat","na"]);function dayStanding(e){const t=e.filter(a=>a.n.dv!==null&&a.n.dv>0&&a.total!==null&&!a.partial).map(a=>({id:a.n.id,label:a.n.label,pc:a.total/a.n.dv*100,budget:A_BUDGET.has(a.n.id)})),n=(a,s)=>a.pc-s.pc;return{short:t.filter(a=>!a.budget&&a.pc<50).sort(n),over:t.filter(a=>!a.budget&&a.pc>=100).sort((a,s)=>-n(a,s)),budget:t.filter(a=>a.budget&&a.pc>=100).sort((a,s)=>-n(a,s))}}function addToDay(e,t=DEFAULT_G){if(!BY_SLUG.has(e))return null;const n=S.day.find(s=>s.slug===e),a=n||{slug:e,g:0};return a.g=clampG(a.g+t),n||S.day.push(a),savePrefs(),a}function setDayGrams(e,t){const n=S.day.find(a=>a.slug===e);n&&(n.g=clampG(t),savePrefs())}function removeFromDay(e){S.day=S.day.filter(t=>t.slug!==e),savePrefs()}function rows(){const e=S.q.trim().toLowerCase();let t=FOODS.map((s,o)=>({f:s,i:o}));S.favsOnly&&(t=t.filter(s=>isFav(s.i))),S.cat&&(t=t.filter(s=>s.f.cat===S.cat)),e&&(t=t.filter(s=>(s.f.name+" "+(s.f.alt||"")+" "+s.f.state+" "+s.f.cat).toLowerCase().includes(e)));const{id:n,dir:a}=S.sort;return t.sort((s,o)=>{if(n==="__name")return a*s.f.name.localeCompare(o.f.name);const i=nut(n),c=i.evidence?evSortKey(slugAt(s.i),i.id):shown(s.f,i),r=i.evidence?evSortKey(slugAt(o.i),i.id):shown(o.f,i);return c===r?s.f.name.localeCompare(o.f.name):c===null?1:r===null?-1:a*(c-r)}),t}function renderGroups(){const e={};NUTS.forEach(t=>e[t.group]=(e[t.group]||0)+1),$("#groupNav").innerHTML=GROUPS.map(t=>`
    <li><button class="navbtn" type="button" data-grp="${t.id}"
        aria-pressed="${S.groups.has(t.id)}">
      ${t.icon}<span>${t.label}</span>
      <span class="count">${e[t.id]}</span><span class="dot"></span></button></li>`).join("")}function renderCats(){const e={};FOODS.forEach(n=>e[n.cat]=(e[n.cat]||0)+1);const t=[["","All foods",FOODS.length],...CATS.map(n=>[n,n,e[n]])];$("#catNav").innerHTML=t.map(([n,a,s])=>`
    <li><button class="navbtn sub" type="button" data-cat="${esc(n)}"
        aria-pressed="${S.cat===n}">
      <span>${esc(a)}</span>
      <span class="count">${s}</span><span class="dot"></span></button></li>`).join("")}function setCat(e){S.cat=e===S.cat?"":e,renderCats(),say(S.cat?`Showing ${S.cat} only.`:"Showing all categories."),savePrefs(),render()}function toggleGroup(e){S.groups.has(e)?S.groups.delete(e):S.groups.add(e);const t=!S.groups.size;t&&S.groups.add("macro"),document.querySelectorAll("#groupNav [data-grp]").forEach(n=>{const a=n.dataset.grp;n.setAttribute("aria-pressed",String(isGroup(a)&&S.groups.has(a)))}),say(t?"The table needs at least one group, so macronutrients stay shown.":`${groupOf(e).label} ${S.groups.has(e)?"shown":"hidden"}. ${cols().length} nutrient columns visible.`),savePrefs(),render()}const LENS_ADD="__add";function renderLensSelect(){const e=t=>`<option value="${esc(t.id)}"${t.id===S.lens?" selected":""}${t.why?` title="${esc(t.why)}"`:""}>${esc(t.name)}</option>`;$("#lensSel").innerHTML=`<option value=""${S.lens?"":" selected"}>None</option><optgroup label="Built in">${BUILTIN_LENSES.map(e).join("")}</optgroup>`+(S.custom.length?`<optgroup label="Yours">${S.custom.map(e).join("")}</optgroup>`:"")+`<option value="${LENS_ADD}" title="Build your own highlight group from any nutrients.">Add…</option>`,$("#lensSel").classList.toggle("lensactive",!!S.lens),renderLensNote()}function renderLensNote(){const e=lensById(S.lens),t=$("#lensNote");if(!e){t.hidden=!0,t.innerHTML="";return}const n=e.ids.map(a=>nutOpt(a)?.label).filter(a=>a!==void 0);t.hidden=!1,t.innerHTML=`<b>${esc(e.name)}</b>`+(e.why?` ${esc(e.why)}`:` Highlighting ${n.length} nutrients.`)+`<span class="cols">${n.map(esc).join(" · ")}</span>`}function setLens(e){S.lens=lensById(e)?e:"";const t=lensById(S.lens);if(t){const a=[...new Set(t.ids.map(s=>nut(s).group))].filter(s=>!S.groups.has(s));a.forEach(s=>S.groups.add(s)),a.length?(renderGroups(),say(`Highlighting ${t.name}. Also showing ${a.map(s=>groupOf(s).label.toLowerCase()).join(" and ")}.`)):say(`Highlighting ${t.name}, ${t.ids.length} nutrients.`)}else say("Highlight cleared.");renderLensSelect(),savePrefs(),render()}let hoverNut=null;function renderNutNote(){const e=hoverNut||(S.sort.id!=="__name"?S.sort.id:null),t=e?nutOpt(e):null;$("#nutNote").innerHTML=t&&t.why?`<b>${esc(t.label)}</b> ${esc(t.why)}${gapLine(t.id)}${absorptionLine(t.id)}`:`Point at a column header, or tab onto one, to read what that nutrient
       does in the body. Sorting by a column leaves its explanation here.`}const GAP_BY_NUTRIENT=new Map;for(const e of G.gaps)for(const t of e.nutrients)GAP_BY_NUTRIENT.set(t,e);function gapLine(e){const t=GAP_BY_NUTRIENT.get(e);if(!t)return"";const n=t.tier==="gap"?"Food will not supply this":"Thin here, worth planning";return`<span class="gapwarn gapwarn-${t.tier}">
    <b aria-hidden="true">!</b> ${esc(n)}.
    <button class="absorbmore" type="button" data-dlg="gaps">Nutrient gaps</button></span>`}const cap3=e=>e.length<=3?e.join(", "):`${e.slice(0,3).join(", ")} and ${e.length-3} more`;function absorptionLine(e){const t=affecting(e).filter(i=>i.direction==="up"),n=affecting(e).filter(i=>i.direction==="down"),a=acting(e);if(!t.length&&!n.length&&!a.length)return"";const s=i=>i.map(c=>esc(c.short)).join(" · ");return`<span class="absorb">${[t.length?`<span class="up"><b aria-hidden="true">↑</b>
      <span class="sr">Absorption raised by </span>${s(t)}</span>`:"",n.length?`<span class="down"><b aria-hidden="true">↓</b>
      <span class="sr">Absorption lowered by </span>${s(n)}</span>`:"",a.length?`<span class="does">${a.map(i=>`${i.direction==="up"?"Raises":"Lowers"} ${esc(cap3(affectedLabels(i)))}`).join("; ")}</span>`:""].filter(Boolean).join("")}
    <button class="absorbmore" type="button" data-dlg="bio">Absorption</button></span>`}const nutOf=e=>{const t=targetAnyEl(e)?.closest("[data-sort]")?.dataset.sort;return t&&t!=="__name"?t:null};function previewNut(e){e!==hoverNut&&(hoverNut=e,renderNutNote())}$("#thead").addEventListener("mouseover",e=>previewNut(nutOf(e))),$("#thead").addEventListener("mouseleave",()=>previewNut(null)),$("#thead").addEventListener("focusin",e=>previewNut(nutOf(e))),$("#thead").addEventListener("focusout",()=>previewNut(null));function layout(){const e=cols(),t=lensIds();return e.map((n,a)=>{const s=e[a-1],o=e[a+1],i=t.has(n.id);return{...n,gstart:!s||s.group!==n.group,lens:i,lensL:i&&(!s||!t.has(s.id)),lensR:i&&(!o||!t.has(o.id)),sorted:S.sort.id===n.id}})}const colClass=e=>[e.gstart&&"gstart",e.lens&&"lens",e.lensL&&"lensL",e.lensR&&"lensR",e.sorted&&"sorted"].filter(Boolean).join(" ");function renderTable(e){const t=layout(),n=e,a=S.sort.id==="__name",s=GROUPS.filter(d=>S.groups.has(d.id)).map(d=>{const l=t.filter(h=>h.group===d.id);return`<th class="grp${l.some(h=>h.lens)?" lens":""}" data-g="${d.id}" colspan="${l.length}"
      scope="colgroup"><span class="grplabel">${esc(d.label)}</span></th>`}).join(""),o=t.map(d=>{const l=d.sorted?S.sort.dir===1?"ascending":"descending":"none",u=S.dv&&d.dv?"%DV":d.unit;return`<th scope="col" aria-sort="${l}" data-g="${d.group}" class="${colClass(d)}">
      <button class="sortbtn" type="button" data-sort="${d.id}"
        ${d.why?`title="${esc(d.why)}" aria-describedby="why-${esc(d.id)}"`:""}>
        <span>${esc(d.label)} <span class="unit">${u}</span>${d.lens?'<span class="sr">, highlighted</span>':""}</span>
        <span class="ar" aria-hidden="true">${d.sorted?S.sort.dir===1?I.up:I.down:I.sortable}</span>
      </button>${d.why?`<span class="sr" id="why-${esc(d.id)}">${esc(d.why)}</span>`:""}</th>`}).join("");$("#thead").innerHTML=`
    <tr>
      <th class="food${a?" sorted":""}" rowspan="2" scope="col" aria-sort="${a?S.sort.dir===1?"ascending":"descending":"none"}">
        <button class="sortbtn" type="button" data-sort="__name" style="justify-content:flex-start">
          <span>Food <span class="unit">${basisLabel()}</span></span>
          <span class="ar" aria-hidden="true">${a?S.sort.dir===1?I.up:I.down:I.sortable}</span>
        </button></th>
      ${s}
    </tr><tr>${o}</tr>`;const i=new Set;$("#tbody").innerHTML=n.length?n.map(({f:d,i:l})=>{const u=S.basis==="kcal"?gramsPer100kcal(d):null;return`
    <tr data-i="${l}" ${S.sel===l?'aria-selected="true"':""}>
      <td class="food${a?" sorted":""}"><div class="fcell">
        <span class="sw" style="--c:${d.colour}" aria-hidden="true"></span>
        <button class="fname" type="button" data-pick="${l}" data-name="${esc(d.name)}">
          <b>${esc(d.name)}${d.alt?` <span class="alt">(${esc(d.alt)})</span>`:""}</b>
          ${d.state?`<span>${esc(d.state)}</span>`:""}
          ${u===null?"":`<span class="per100">${Math.round(u)} g</span>
               <span class="sr">makes 100 kcal</span>`}
          <span class="sr">, show full profile</span></button>
        <button class="fav" type="button" data-fav="${l}" aria-pressed="${isFav(l)}">
          ${isFav(l)?I.heartFull:I.heart}
          <span class="sr">${isFav(l)?"Remove":"Add"} ${esc(d.name)} ${isFav(l)?"from":"to"} favourites</span>
        </button></div></td>
      ${t.map(h=>{if(h.evidence){if(S.dv)return`<td class="num ${colClass(h)}" data-g="${h.group}" data-n="${esc(h.id)}" data-ev="nodv"><span class="noref" aria-hidden="true">&ndash;</span><span class="sr">no daily value published</span></td>`;const m=ev(slugAt(l),h.id),p=m&&evFood(slugAt(l))?.match==="proxy"?' data-match="proxy"':"";return`<td class="num ${colClass(h)}" data-g="${h.group}" data-n="${esc(h.id)}" data-ev="${m?m.state:"none"}"${p}>${esc(evText(m,h.dp))}</td>`}const f=shown(d,h),g=f===0||f===null,b=f===null?null:noteFor(l,h.id);return b&&i.add(b),`<td class="num${g?" low":""} ${colClass(h)}" data-g="${h.group}" data-n="${esc(h.id)}">${fmt(f,h)}${b?noteMark(b):""}</td>`}).join("")}
    </tr>`}).join(""):`<tr><td class="empty" colspan="${t.length+1}">${emptyState()}</td></tr>`;const c=lensById(S.lens);$("#cap").textContent=(n.length===FOODS.length?`${FOODS.length} vegan foods`:`Showing ${n.length} of ${FOODS.length} vegan foods`)+(t.length===NUTS.length?`, all ${t.length} nutrient columns`:`, ${t.length} of ${NUTS.length} nutrient columns`)+`. Values ${basisLabel()} of food`+(S.dv?", shown as % of adult daily value.":".")+(S.favsOnly?" Favourites only.":"")+(c?` ${c.name} highlighted.`:"")+(S.dv&&S.basis==="kcal"?" 5% here is a full day's worth at 2000 kcal.":"");const r=$("#noteKey");r.hidden=!i.size,r.innerHTML=[...i].map(d=>`<span><sup class="fnote">${esc(d.marker)}</sup> <b>${esc(d.short)}.</b>
     ${esc(d.text)}</span>`).join(""),syncHeadOffset()}function syncHeadOffset(){const e=$("#thead").rows[0];if(!e)return;const t=e.getBoundingClientRect().height;t&&$("#grid").style.setProperty("--head1",`${Math.floor(t)}px`);const n=e.cells[0],a=n&&n.getBoundingClientRect().width;a&&$("#grid").style.setProperty("--foodw",`${a}px`);const s=$("#scroller").clientWidth;s&&$("#grid").style.setProperty("--scrollw",`${s}px`)}addEventListener("resize",syncHeadOffset);function emptyState(){return S.favsOnly&&!S.favs.size?`<b>No favourites yet</b>Star a food with the heart button to build a shortlist,
            then come back here.
            <div style="margin-top:14px"><button class="btn" type="button" data-act="favs">
              Show all foods</button></div>`:S.favsOnly?`<b>No favourites match the other filters</b>Your shortlist has
            ${S.favs.size} food${S.favs.size===1?"":"s"}, but none of them match the
            current search or category.
            <div style="margin-top:14px"><button class="btn" type="button" data-act="clearfilters">
              Clear search and category</button></div>`:`<b>No foods match that search</b>Try a different term, or clear the filters.
          <div style="margin-top:14px"><button class="btn" type="button" data-act="clearfilters">
            Clear search and category</button></div>`}function renderChart(e){const t=nut(S.chartNut),n=e.slice().sort((o,i)=>(val(i.f,t.id)??-1)-(val(o.f,t.id)??-1)),a=n.map(o=>val(o.f,t.id)).filter(o=>o!==null),s=Math.max(...a,1e-4);$("#chartNut").innerHTML=GROUPS.filter(o=>S.groups.has(o.id)).map(o=>`<optgroup label="${o.label}">`+NUTS.filter(i=>i.group===o.id&&!i.evidence).map(i=>`<option value="${i.id}"${i.id===S.chartNut?" selected":""}>${esc(i.label)}</option>`).join("")+"</optgroup>").join(""),$("#chartRows").innerHTML=n.slice(0,25).map(({f:o})=>{const i=val(o,t.id);return`<div class="crow">
      <span class="lbl"><span class="sw" style="--c:${o.colour}" aria-hidden="true"></span>
        <span title="${esc(fullName(o))}">${esc(fullName(o))}</span></span>
      <span class="track"><i style="width:${i===null?"0":(i/s*100).toFixed(1)}%"></i></span>
      <span class="val">${fmt(i,t)} <span class="unit">${i===null||S.dv&&t.dv?"":t.unit}</span></span>
    </div>`}).join(""),$("#chartRows").setAttribute("role","img"),$("#chartRows").setAttribute("aria-label",`Bar chart of ${t.label} across ${Math.min(n.length,25)} foods, highest first. `+n.slice(0,25).map(({f:o})=>`${fullName(o)} ${fmtText(val(o,t.id),t)}`).join(", "))}function proteinQualityBlock(e){const t=proteinQuality(e),n=omegaRatio(e),a=NUTS.some(i=>i.group==="amino"&&val(e,i.id)===null);if(!t&&a&&(val(e,"protein")??0)>=1)return`<h4 style="margin-top:18px">Protein quality</h4>
      <p class="nodatanote" style="margin-top:0">No amino acid score: USDA has not published a
      full amino acid analysis for this food, so there is nothing to score it against. The gap is
      in the source data, not in the food.</p>`;if(!t&&!n)return"";let s="";if(t){const i=t.score>=100;s+=`<div class="drow"><dt>Amino acid score</dt>
        <dd class="${i?"pc":""}">${t.score}%</dd></div>
      <div class="drow"><dt>${i?"Lowest relative to need":"Limiting amino acid"}</dt>
        <dd>${esc(t.limiting)}</dd></div>`,t.perKcal!==null&&(s+=`<div class="drow"><dt>Protein per 100 kcal</dt>
        <dd>${t.perKcal.toFixed(1)} g</dd></div>`)}n&&(s+=`<div class="drow"><dt>Omega-6 : omega-3</dt>
      <dd>${n.flip?`1 : ${n.a.toFixed(1)}`:`${n.a.toFixed(1)} : 1`}</dd></div>`);const o=t?t.score>=100?"Meets the adult FAO/WHO pattern for every essential amino acid.":`Scored against the FAO/WHO adult pattern. ${esc(t.limiting)} caps the
           score; pairing this food with one richer in it raises the total.`:"";return`<h4 style="margin-top:18px">Protein quality</h4><dl>${s}</dl>`+(o?`<p style="font-size:11.5px;color:var(--faint);margin:8px 0 0;line-height:1.4">${o}</p>`:"")}function renderDetail(){const e=foodAt(S.sel),t=r=>shown(e,nut(r)),n=r=>evText(ev(slugAt(S.sel),r),nut(r).dp),a=S.day.find(r=>r.slug===slugAt(S.sel)),s=["vitamin","mineral","carbdetail","acids","amino","plant"],o=[["overview","Overview",I.macro],...s.map(r=>groupOf(r)).map(r=>[r.id,r.label,r.icon]),["absorption","Absorption",I.eye]],i=new Set;let c;if(S.tab==="overview"){const r=["kcal","protein","carbs","fiber","solfibre","insolfibre","resstarch","fat","satfat"],d=NUTS.filter(l=>l.dv!==null&&l.dv>0&&l.group!=="macro").flatMap(l=>{const u=t(l.id);return u===null?[]:[{n:l,pc:u/l.dv*100}]}).filter(l=>l.pc>0).sort((l,u)=>u.pc-l.pc).slice(0,6);c="<h4>Macronutrients</h4><dl>"+r.map(l=>{const u=nut(l),h=l==="fiber"||l==="satfat"||!!u.evidence;if(u.evidence){const b=ev(slugAt(S.sel),l),m=b&&(b.state==="measured"||b.state==="range"||b.state==="estimated");return`<div class="drow sub"><dt>${esc(u.label)}</dt>
          <dd>${m?`${esc(n(l))} ${esc(u.unit)}`:`<span class="nodata">${esc(n(l))}</span>`}</dd></div>`}const f=t(l),g=l==="kcal"&&f!==null?` <span class="pc">· ${Math.round(f*4.184)} kJ</span>`:"";return`<div class="drow${h?" sub":""}"><dt>${esc(u.label)}</dt>
        <dd>${f===null?'<span class="nodata">not measured</span>':`${f.toFixed(u.dp)} ${u.unit}${g}`}</dd></div>`}).join("")+"</dl>"+proteinQualityBlock(e)+'<h4 style="margin-top:18px">Top nutrients</h4><dl>'+d.map(({n:l,pc:u})=>{const h=noteFor(S.sel,l.id);return h&&i.add(h),`<div class="drow"><dt>${esc(l.label)}</dt>
          <dd class="pc">${Math.round(u)}% DV${h?noteMark(h):""}</dd></div>`}).join("")+"</dl>"}else if(S.tab==="absorption"){const r=sourceOf(e),d=VNUTS.flatMap(l=>{const u=val(e,l.id)===null?null:noteFor(S.sel,l.id);return u&&ABSORB_NOTES.has(u.id)?[{n:l,note:u}]:[]});for(const{note:l}of d)i.add(l);c="<h4>Absorption</h4>"+(d.length?d.map(({n:l,note:u})=>`
        <div class="biorow curated">
          <div class="biohead"><b>${esc(l.label)}</b>
            <span class="biowhen">this food</span></div>
          <p>${esc(u.text)}</p>
        </div>`).join(""):"")+(r.length?r.map(l=>{const u=nut(l),h=affecting(l).map(f=>`
          <div class="biorow ${f.direction}">
            <div class="biohead">
              <span class="bioarrow" aria-hidden="true">${f.direction==="up"?"↑":"↓"}</span>
              <b>${esc(agentLabel(f.agent))}</b>
              <span class="biowhen">${esc(f.when)}</span>
            </div>
            <p>${esc(f.text)}</p>
          </div>`).join("");return`<h5 class="biofor">${esc(u.label)}</h5>${h}`}).join(""):`<p class="nodatanote">Nothing on record applies to this food. That means no
           interaction has been recorded for the nutrients it is a meaningful source of,
           not that its nutrients are absorbed whole.</p>`)+`<p class="nodatanote">These are general facts about the nutrients, shown because this
       food's own figures make it a meaningful source of them. Nothing above adjusts a figure.
       <button class="absorbmore" type="button" data-dlg="bio">Sources</button></p>`}else{const r=NUTS.filter(g=>g.group===S.tab),d=r.filter(g=>!g.evidence),l=d.map(g=>t(g.id)).filter(g=>g!==null),u=Math.max(...l,1e-4),h=lensIds(),f=d.length-l.length;c=`<h4>${esc(GROUPS.find(g=>g.id===S.tab)?.label||S.tab)}</h4>
      <dl>`+r.map(g=>{if(g.evidence){const y=ev(slugAt(S.sel),g.id),w=y&&(y.state==="measured"||y.state==="range"||y.state==="estimated"),T=y?.sources?.length?` <span class="pc">· ${esc(y.sources.map(k=>SRCS[k]?.country??k).join(", "))}</span>`:"";return`<div class="drow${h.has(g.id)?" lensrow":""}" style="display:block">
            <div style="display:flex;justify-content:space-between;gap:10px">
              <dt>${esc(g.label)}</dt>
              <dd>${w?`${esc(evText(y,g.dp))} ${esc(g.unit)}${T}`:`<span class="nodata">${esc(evText(y,g.dp))}</span>`}</dd>
            </div>
          </div>`}const b=t(g.id),m=b===null,p=!m&&g.dv?Math.round(b/g.dv*100):null,v=m?null:noteFor(S.sel,g.id);return v&&i.add(v),`<div class="drow${h.has(g.id)?" lensrow":""}" style="display:block">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <dt>${esc(g.label)}</dt>
            <dd>${m?'<span class="nodata">not measured</span>':`${b.toFixed(g.dp)} ${g.unit}${p!==null?` <span class="pc">· ${p}%</span>`:""}${v?noteMark(v):""}`}</dd>
          </div>
          ${m?"":`<div class="minibar" aria-hidden="true"><i style="width:${(b/u*100).toFixed(1)}%"></i></div>`}
        </div>`}).join("")+"</dl>"+(f?`<p class="nodatanote">${f===r.length?"USDA publishes no figures at all for this group in this food.":`USDA publishes no figure for ${f} of the ${r.length}.`}
        Unmeasured is not the same as none: nobody has analysed it, rather than
        having analysed it and found nothing.</p>`:"")}$("#detail").innerHTML=`
    <div class="dhead">
      <button class="fav" type="button" data-fav="${S.sel}" aria-pressed="${isFav(S.sel)}">
        ${isFav(S.sel)?I.heartFull:I.heart}
        <span class="sr">${isFav(S.sel)?"Remove from":"Add to"} favourites</span></button>
      <span class="sw" style="--c:${e.colour}" aria-hidden="true"></span>
      <h3>${esc(e.name)}</h3>
      ${e.alt?`<div class="st">also known as ${esc(e.alt)}</div>`:""}
      ${e.state?`<div class="st">${esc(e.state)}</div>`:""}
      <div class="per">${esc(e.cat)} · ${basisLabel()}</div>
      <button class="btn dayadd-btn" type="button" data-dayadd="${S.sel}">${I.plus}
        ${a?`Add another ${DEFAULT_G} g`:"Add to my day"}</button>
      ${a?`<div class="inday">${a.g} g in your day</div>`:""}
    </div>
    <div class="tabs" role="tablist" aria-label="Nutrient detail sections">
      ${o.map(([r,d,l])=>`
        <button type="button" role="tab" data-tab="${r}" id="tab-${r}"
          aria-selected="${S.tab===r}" aria-controls="tabp"
          tabindex="${S.tab===r?0:-1}">${l}<span>${d}</span></button>`).join("")}
    </div>
    <div class="dbody" id="tabp" role="tabpanel" aria-labelledby="tab-${S.tab}" tabindex="0">${c}${[...i].map(r=>`<p class="nodatanote"><sup class="fnote">${esc(r.marker)}</sup>
        <b>${esc(r.short)}.</b> ${esc(r.text)}</p>`).join("")}</div>
    <div class="dfoot">% DV uses general adult reference values. Yours may differ.</div>`}function renderCounts(){$("#favCount").textContent=S.favs.size?String(S.favs.size):"",$("#dayCount").textContent=dayEntries().length?String(dayEntries().length):""}const fmtTotal=(e,t)=>e===null?"not measured":`${e.toFixed(t.dp)} ${t.unit}`,portionsFor=e=>P[e]??[];function portionSelect(e,t,n){const a=portionsFor(e);if(!a.length)return"";const s=a.findIndex(o=>clampG(o.g)===n);return`<select data-dayportion="${esc(e)}"
      aria-label="Portion of ${esc(t.name)}${t.state?`, ${esc(t.state)}`:""}">
      <option value="" disabled${s===-1?" selected":""}>custom</option>`+a.map((o,i)=>`<option value="${i}"${i===s?" selected":""}>${esc(o.label)} · ${o.g} g</option>`).join("")+"</select>"}function renderDayList(){const e=dayEntries(),t=$("#dayList");if(!e.length){t.innerHTML=`<div class="dayempty">
      <b>Nothing in your day yet</b>
      <p>Search above to add a food and say how much of it you had. Everything on
         this page is per 100 g, and this is where that turns into what you
         actually ate.</p>
      ${S.favs.size?`<p>You have ${S.favs.size} favourite${S.favs.size===1?"":"s"},
         which come up first in the search above.</p>`:`<p>Star foods with the heart
         button in the table and they will come up first here.</p>`}</div>`;return}t.innerHTML='<div class="daylist">'+e.map(({f:n,g:a,slug:s})=>`
    <div class="dayrow" data-slug="${esc(s)}">
      <span class="sw" style="--c:${n.colour}" aria-hidden="true"></span>
      <span class="dayname">
        <b>${esc(n.name)}</b>
        <span>${n.state?`${esc(n.state)} · `:""}${esc(n.cat)}</span></span>
      <span class="dayqty">
        ${portionSelect(s,n,a)}
        <span class="qtyf">
          <button class="stp" type="button" data-daystep="${esc(s)}" data-by="-10"
            ${a<=0?"disabled":""}>${I.minus}<span class="sr">Less ${esc(n.name)}</span></button>
          <input type="number" inputmode="numeric" data-dayg="${esc(s)}" value="${a}"
            min="0" max="${DAY_MAX_G}" step="10"
            aria-label="Grams of ${esc(n.name)}${n.state?`, ${esc(n.state)}`:""}">
          <span class="u">g</span>
          <button class="stp" type="button" data-daystep="${esc(s)}" data-by="10"
            ${a>=DAY_MAX_G?"disabled":""}>${I.plus}<span class="sr">More ${esc(n.name)}</span></button>
        </span>
      </span>
      <button class="rm" type="button" data-dayrm="${esc(s)}">${I.x}
        <span class="sr">Remove ${esc(n.name)} from your day</span></button>
    </div>`).join("")+`</div>
    <div class="dayfoot">
      <button class="btn" type="button" data-act="dayclear">${I.x} Clear the day</button>
      <span class="push">${e.length} food${e.length===1?"":"s"} ·
        <b>${dayGrams()} g</b> in total</span>
    </div>`}const FAO_SCORED=new Set(FAO_PATTERN.flatMap(e=>e.ids)),NON_ESSENTIAL=NUTS.filter(e=>e.group==="amino"&&!FAO_SCORED.has(e.id)).length;function aminoRefsByNutrient(e){const t=new Map;for(const n of dayAminoAcids(e))for(const a of n.ids)t.set(a,{...n,partners:n.ids.filter(s=>s!==a)});return t}function renderDayTotals(e){const t=dayContributors(),n=$("#dayTotals");if(!t.length){n.innerHTML="";return}const a=aminoRefsByNutrient(e),s=new Set,o=GROUPS.filter(i=>S.groups.has(i.id)).map(i=>{const c=e.filter(d=>d.n.group===i.id).map(d=>{const{n:l,total:u,partial:h,from:f,of:g,notes:b}=d,m=a.get(l.id),p=l.dv&&u!==null?u/l.dv*100:m?m.pc:null,v=m&&m.partners.length?`<span class="qual">with ${m.partners.map(y=>nut(y).label.toLowerCase()).join(" and ")}</span>`:"";return b.forEach(y=>s.add(y)),`<div class="totrow${u===null?" none":""}">
        <span class="totname">${esc(l.label)}${b.map(noteMark).join("")}${v}</span>
        <span class="totval">${u===null?'<span class="nodata">not measured</span>':`${u.toFixed(l.dp)} <span class="u">${esc(l.unit)}</span>`}</span>
        <span class="totbar" aria-hidden="true">${p===null?"":`<i class="${p>=100?"full":""}" style="width:${Math.min(p,100).toFixed(1)}%"></i>`}</span>
        <span class="totpc">${p===null?`<span class="noref" aria-hidden="true">&ndash;</span>
             <span class="sr">no ${l.group==="amino"?"published requirement":"daily value published"}</span>`:`${Math.round(p)}%`}</span>
        <span class="totcov">${h?`from ${f} of ${g}`:""}</span>
      </div>`}).join(""),r=i.id==="amino";return`<div class="totgroup" data-g="${i.id}"><h4>${i.icon}${esc(i.label)}</h4>
      <div class="tothead" aria-hidden="true">
        <span>Nutrient</span><span>Total</span><span></span>
        <span>${r?"of requirement":"of daily value"}</span><span></span>
      </div>${c}
      ${r?`<p class="nodatanote">Against the FAO/WHO adult requirement for
        ${esc(weightLabel())}, which you can change in the panel beside this. The
        ${NON_ESSENTIAL} the body can build for itself have no published requirement, so
        they show a total only.</p>`:""}
    </div>`}).join("");n.innerHTML=`<div class="totals">${o}</div>`+(s.size?`<div class="notekey">${[...s].map(i=>`<span><sup class="fnote">${esc(i.marker)}</sup> <b>${esc(i.short)}.</b>
       ${esc(i.text)}</span>`).join("")}</div>`:"")+`<p class="nodatanote" style="margin-top:12px">Percentages use the same general adult
     reference values as the rest of the page, and the FAO/WHO requirement for your body
     weight where amino acids are concerned. Rows with no reference figure show a total
     only: the fat fractions and the carotenoids are already counted inside the totals above
     them, so a percentage would show the same intake twice.</p>`}const GAP_NAMES=G.gaps.filter(e=>e.tier==="gap"),gapList=e=>e.map(t=>t.label).join(", ").replace(/, ([^,]*)$/," and $1"),DAY_NOTES=[["What no total here can include",`${gapList(GAP_NAMES)} are the things a
    plant-based diet does not reliably supply, and every one of them is either
    absent from this table or close to zero across it. ${gapList(GAP_NAMES.filter(e=>!e.nutrients.length))} has no column at all,
    so it is in no total on this page and its absence here says nothing about
    whether you had enough. What each does, and the two ways people close the
    gap, is under Nutrient gaps in the sidebar.`],["Intake is not absorption",`These totals are what you ate, not what you absorbed, and for
    several nutrients the gap is large. What is known about it is under Absorption in the
    sidebar. A total well over 100% can still leave you short.`]];function dayPairings(){const e=dayContributors();if(e.length<1)return[];const t=new Map;for(const a of e)for(const s of sourceOf(a.f))t.set(s,[...t.get(s)||[],a.f]);const n=[];for(const a of INTERACTIONS){if(a.when!=="same meal")continue;const s=a.agent,o=s.kind==="nutrient"?t.get(s.id)?.[0]:s.kind==="food"?e.find(i=>slugAt(i.i)===s.slug)?.f:void 0;if(o)for(const i of a.affects){const c=t.get(i)?.[0];!c||c===o||n.push({x:a,nutrient:nut(i),from:c,via:o})}}return n}const aminoRows=e=>dayAminoAcids(e).map(t=>`<div class="drow"><dt>${esc(t.label)}</dt>
    <dd>${t.got===null?'<span class="nodata">not measured</span>':`${t.got.toFixed(2)} g <span class="pc">· ${Math.round(t.pc)}%</span>`}</dd></div>`).join("");function weightRow(){const e=(o,i)=>`<button type="button" data-wunit="${o}" aria-pressed="${S.wUnit===o}">${i}</button>`,t=(o,i,c,r,d)=>`<input type="number" inputmode="numeric" id="${o}" data-w value="${i}"
       min="0"${r?` max="${r}"`:""} step="1" aria-label="Body weight in ${d}">
     <span class="u">${c}</span>`,{st:n,lb:a}=kgToStLb(S.kg),s=S.wUnit==="stlb"?t("dayStones",n,"st",40,"stones")+t("dayPounds",a,"lb",null,"pounds"):t("dayKg",+S.kg.toFixed(1),"kg",250,"kilograms");return`<div class="kgrow">
    <span class="wlbl">Body weight</span>
    <span class="seg wunit" role="group" aria-label="Body weight unit">
      ${e("kg","kg")}${e("stlb","st lb")}</span>
    <span class="wfields">${s}</span>
  </div>`}function readWeight(){return S.wUnit!=="stlb"?Number($("#dayKg").value):stLbToKg(Number($("#dayStones").value)||0,Number($("#dayPounds").value)||0)}function renderDaySummary(e){const t=dayContributors(),n=$("#daySum"),a=dayPairings(),o='<div class="dayadvice">'+(a.length?`<div class="paircard">
    <b>Worth pairing</b>
    <ul>${a.map(({x:p,nutrient:v,from:y,via:w})=>`<li class="${p.direction}">
      <span aria-hidden="true">${p.direction==="up"?"↑":"↓"}</span>
      ${esc(w.name)} ${p.direction==="up"?"could help":"could hold back"}
      the ${esc(v.label.toLowerCase())} in ${esc(y.name)}</li>`).join("")}</ul>
    <span class="paircaveat">Only in the same meal. This list is a day, so it cannot know
    whether any of these were eaten together.</span></div>`:"")+DAY_NOTES.map(([p,v])=>`<div><b>${esc(p)}</b> ${esc(v.replace(/\s+/g," "))}</div>`).join("")+"</div>";if(!t.length){n.innerHTML=`<div class="dhead"><h3>Your day</h3>
      <div class="per">nothing added yet</div></div>
      <div class="dbody"><p class="nodatanote" style="margin-top:0">Add a food and its
      totals appear here, in units and as a percentage of a daily value.</p>${o}</div>`;return}const i=totalOf(e,"kcal"),c=totalOf(e,"protein"),r=totalOf(e,"fiber"),d=[i,c,r].map(p=>{const v=p.n.dv&&p.total!==null?Math.round(p.total/p.n.dv*100):null,y=p.partial?` <span class="cov">from ${p.from} of ${p.of}</span>`:"";return`<div class="drow"><dt>${esc(p.n.label)}</dt>
      <dd>${fmtTotal(p.total,p.n)}${v===null?"":` <span class="pc">· ${v}%</span>`}${y}</dd></div>`}).join(""),l=dayProteinQuality(e),h=["ala","la"].every(p=>!totalOf(e,p).partial)?omegaRatio({v:e.map(p=>p.total)}):null,{short:f,over:g,budget:b}=dayStanding(e),m=p=>`<button class="jump" type="button" data-daysort="${esc(p.id)}">
    <span>${esc(p.label)}</span><b>${Math.round(p.pc)}%</b>
    <span class="ar" aria-hidden="true">${I.right}</span>
    <span class="sr">, show the foods highest in it</span></button>`;n.innerHTML=`
    <div class="dhead"><h3>Your day</h3>
      <div class="per">${t.length} food${t.length===1?"":"s"} · ${dayGrams()} g</div></div>
    <div class="dbody">
      <dl>${d}</dl>

      <h4 style="margin-top:18px">Protein quality</h4>
      ${l?`<dl>
        <div class="drow"><dt>Amino acid score</dt>
          <dd class="${l.score>=100?"pc":""}">${l.score}%</dd></div>
        <div class="drow"><dt>${l.score>=100?"Lowest relative to need":"Limiting amino acid"}</dt>
          <dd>${esc(l.limiting)}</dd></div>
        ${l.perKcal!==null?`<div class="drow"><dt>Protein per 100 kcal</dt>
          <dd>${l.perKcal.toFixed(1)} g</dd></div>`:""}
      </dl>
      <p class="nodatanote">${l.score>=100?`Across the whole day this meets the adult FAO/WHO pattern for every essential amino
           acid. Foods that fall short on their own cover each other here, which is why
           combining proteins within a single meal is not necessary.`:`Scored across the day rather than per food, which is the basis that matters:
           ${esc(l.limiting)} caps it, so adding something richer in that raises the whole day.`}</p>`:`<p class="nodatanote" style="margin-top:0">No score: at least one food in your day has
         no published amino acid analysis, and a sum that skips it would understate the day.
         The gap is in the source data rather than in what you ate.</p>`}

      <h4 style="margin-top:18px">Amino acids
        <span class="lenscount" id="aaKg">against FAO/WHO for ${weightLabel()}</span></h4>
      <dl id="aaRows">${aminoRows(e)}</dl>
      ${weightRow()}
      <p class="nodatanote">Amino acid requirements are published per kilogram of body weight,
      so this one figure is what the percentages above are measured against. Stones and pounds
      are converted to it rather than kept alongside it. Nothing else on the page uses your
      weight.</p>

      ${h?`<h4 style="margin-top:18px">Omega balance</h4><dl>
        <div class="drow"><dt>Omega-6 : omega-3</dt>
          <dd>${h.flip?`1 : ${h.a.toFixed(1)}`:`${h.a.toFixed(1)} : 1`}</dd></div></dl>`:""}

      ${f.length?`<h4 style="margin-top:18px">Short on</h4>
        <div class="jumps">${f.slice(0,8).map(m).join("")}</div>
        <p class="nodatanote">Under half a daily value. Pick one to see the foods richest in
        it. Nutrients where any food in your day was never assayed are left out rather than
        reported as a shortfall that might not be one.</p>`:""}

      ${g.length?`<h4 style="margin-top:18px">Comfortable</h4>
        <div class="jumps">${g.slice(0,8).map(m).join("")}</div>`:""}

      ${b.length?`<h4 style="margin-top:18px">Above the guideline</h4>
        <div class="jumps">${b.map(m).join("")}</div>
        <p class="nodatanote">These are the figures a daily value caps rather than sets, so
        they are listed here when a day goes over rather than under.</p>`:""}

      ${o}
    </div>
    <div class="dfoot">Totals cover only what you have listed. A gap here is as likely to mean
      a food you have not added as a nutrient you are short of.</div>`}function renderDay(){const e=dayTotals();renderDayList(),renderDayTotals(e),renderDaySummary(e)}function render(){const e=S.view==="chart",t=S.view==="day";$("#browseView").hidden=t,$("#dayView").hidden=!t,$("#tableView").hidden=e||t,$("#chartView").hidden=!e,$("#vTable").setAttribute("aria-pressed",String(S.view==="table")),$("#vChart").setAttribute("aria-pressed",String(e)),$('[data-act="favs"]').setAttribute("aria-pressed",String(S.favsOnly)),$("#vDay").setAttribute("aria-pressed",String(t)),t?$("#navFoods").removeAttribute("aria-current"):$("#navFoods").setAttribute("aria-current","true");for(const s of["#viewGrp",".lensgrp","#dvBtn","#nutNote"])$(s).hidden=t;t?$("#lensNote").hidden=!0:renderLensNote();const n=rows(),a=n[0];a&&!n.some(s=>s.i===S.sel)&&(S.sel=a.i),renderTable(n),e&&renderChart(n),renderDetail(),renderDay(),renderCounts(),renderNutNote()}document.addEventListener("click",e=>{const t=targetAnyEl(e)?.closest("button");if(t){if(isGroup(t.dataset.grp))return toggleGroup(t.dataset.grp);if(t.dataset.cat!==void 0)return setCat(t.dataset.cat);if(t.dataset.sort){const n=t.dataset.sort;S.sort.id===n?S.sort.dir*=-1:S.sort={id:n,dir:n==="__name"?1:-1};const a=n==="__name"?"Food name":nut(n).label;return say(`Sorted by ${a}, ${S.sort.dir===1?"ascending":"descending"}.`),savePrefs(),render()}if(t.dataset.pick!==void 0)return S.sel=+t.dataset.pick,say(`${foodAt(S.sel).name} selected.`),render();if(t.dataset.fav!==void 0){const n=+t.dataset.fav;return toggleFav(n),say(`${foodAt(n).name} ${isFav(n)?"added to":"removed from"} favourites.`),render()}if(t.dataset.tab)return S.tab=t.dataset.tab,renderDetail(),$(`[data-tab="${S.tab}"]`).focus();if(t.dataset.act==="favs")return S.favsOnly=!S.favsOnly,say(S.favsOnly?`Showing favourites only, ${S.favs.size} food${S.favs.size===1?"":"s"}.`:"Showing all foods."),savePrefs(),render();if(t.dataset.act==="clearfilters")return S.q="",$("#q").value="",$("#qClear").hidden=!0,S.cat="",renderCats(),savePrefs(),say("Search and category cleared."),render();if(isDialogKey(t.dataset.dlg))return openDialog(t.dataset.dlg);if(t.dataset.dayadd!==void 0){const n=+t.dataset.dayadd,a=!!t.closest("#daySug"),s=slugAt(n),o=addToDay(s,DEFAULT_G);return o&&say(`${foodAt(n).name} in your day at ${o.g} g.`),a&&($("#dayQ").value="",$("#daySug").hidden=!0),render(),a&&$(`[data-dayg="${s}"]`).focus()}if(t.dataset.dayrm){const n=foodBySlug(t.dataset.dayrm);return removeFromDay(t.dataset.dayrm),say(`${n?n.name:"Food"} removed from your day.`),render()}if(t.dataset.daystep){const n=t.dataset.daystep,a=t.dataset.by,s=S.day.find(o=>o.slug===n);return!s||a===void 0?void 0:(setDayGrams(n,s.g+ +a),render())}if(t.dataset.wunit)return t.dataset.wunit===S.wUnit?void 0:(S.wUnit=t.dataset.wunit==="stlb"?"stlb":"kg",savePrefs(),renderDaySummary(dayTotals()),say(`Body weight in ${S.wUnit==="stlb"?"stones and pounds":"kilograms"}, ${weightLabel()}.`),$("[data-w]").focus());if(t.dataset.act==="dayclear"){const n=S.day.length;return S.day=[],savePrefs(),say(`Cleared ${n} food${n===1?"":"s"} from your day.`),render()}if(t.dataset.daysort){const n=t.dataset.daysort,a=nut(n);S.view="table",S.sort={id:n,dir:-1};const s=!S.groups.has(a.group);return s&&(S.groups.add(a.group),renderGroups()),savePrefs(),render(),$("#scroller").scrollIntoView({block:"nearest"}),say(`Showing the table sorted by ${a.label}, highest first.`+(s?` Also showing ${groupOf(a.group).label.toLowerCase()}.`:""))}}}),$("#vTable").onclick=()=>{S.view="table",render()},$("#vChart").onclick=()=>{S.view="chart",render()},$("#vDay").onclick=()=>{S.view=S.view==="day"?"table":"day",say(S.view==="day"?"Showing your day.":"Showing the food table."),render()},$("#navFoods").addEventListener("click",()=>{S.view==="day"&&(S.view="table",render())});const shellEl=$("#shell"),navToggle=$("#navToggle");function setNav(e){e?shellEl.dataset.nav="open":delete shellEl.dataset.nav,navToggle.setAttribute("aria-expanded",String(e)),$("#navToggleTx").textContent=e?"Close":"Menu"}navToggle.onclick=()=>{const e=shellEl.dataset.nav!=="open";setNav(e),say(e?"Menu open.":"Menu closed.")},$("#side").addEventListener("click",e=>{const t=targetAnyEl(e)?.closest("a,button");!t||!t.matches("[data-cat],#navFoods,#vFavs,#vDay")||shellEl.dataset.nav==="open"&&(setNav(!1),t.id!=="navFoods"&&navToggle.focus())});const chartSel=$("#chartNut");chartSel.onchange=()=>{S.chartNut=chartSel.value,savePrefs(),renderChart(rows())};const lensSel=$("#lensSel");lensSel.onchange=()=>{if(lensSel.value===LENS_ADD){renderLensSelect(),openLensEditor();return}setLens(lensSel.value)};const basisBtn=$("#basisBtn");basisBtn.onclick=()=>{S.basis=S.basis==="g"?"kcal":"g";const e=S.basis==="kcal";basisBtn.setAttribute("aria-pressed",String(e)),basisBtn.lastChild&&(basisBtn.lastChild.textContent=e?" Show per 100 g":" Show per 100 kcal"),say(e?"Showing figures per 100 kcal.":"Showing figures per 100 g."),savePrefs(),render()};const dvBtn=$("#dvBtn");dvBtn.onclick=()=>{S.dv=!S.dv,dvBtn.setAttribute("aria-pressed",String(S.dv)),dvBtn.lastChild&&(dvBtn.lastChild.textContent=S.dv?" Show raw amounts":" Show % daily value"),say(S.dv?"Showing percentage of daily value.":"Showing raw amounts."),savePrefs(),render()};let qt;const qInput=$("#q");qInput.oninput=()=>{S.q=qInput.value,$("#qClear").hidden=!S.q,clearTimeout(qt),qt=setTimeout(()=>{render(),say(`${rows().length} foods match.`)},160)},$("#qClear").onclick=()=>{S.q="",qInput.value="",$("#qClear").hidden=!0,qInput.focus(),render()};function applyTheme(){document.documentElement.dataset.theme=S.dark?"dark":"",$("#themeBtn").setAttribute("aria-pressed",String(S.dark)),$("#themeIc").innerHTML=S.dark?I.sun:I.moon,$("#themeTx").textContent=S.dark?"Light mode":"Dark mode"}$("#themeBtn").onclick=()=>{S.dark=!S.dark,applyTheme(),savePrefs()};const DAY_SUGGESTIONS=8;function daySuggestions(e){const t=e.trim().toLowerCase();if(!t)return[];const n=FOODS.map((s,o)=>({f:s,i:o})).filter(({f:s})=>`${s.name} ${s.alt||""} ${s.state||""} ${s.cat}`.toLowerCase().includes(t)),a=({f:s,i:o})=>(isFav(o)?0:2)+(s.name.toLowerCase().startsWith(t)?0:1);return n.sort((s,o)=>a(s)-a(o)||s.f.name.localeCompare(o.f.name)).slice(0,DAY_SUGGESTIONS)}function renderDaySuggestions(){const e=$("#daySug"),t=daySuggestions($("#dayQ").value);e.hidden=!t.length,$("#dayQ").setAttribute("aria-expanded",String(!!t.length)),e.innerHTML=t.map(({f:n,i:a})=>{const s=S.day.some(o=>o.slug===slugAt(a));return`<button type="button" role="option" aria-selected="false" data-dayadd="${a}">
      <span class="sw" style="--c:${n.colour}" aria-hidden="true"></span>
      <span class="s-name"><b>${esc(n.name)}${n.alt?` <span class="alt">(${esc(n.alt)})</span>`:""}</b>
        <span>${n.state?`${esc(n.state)} · `:""}${esc(n.cat)}</span></span>
      ${isFav(a)?`<span class="s-fav" aria-hidden="true">${I.heartFull}</span>`:""}
      <span class="s-add">${s?`+${DEFAULT_G} g`:`${DEFAULT_G} g`}</span>
      <span class="sr">${s?`already in your day, add another ${DEFAULT_G} grams`:`add ${DEFAULT_G} grams`}</span></button>`}).join("")}$("#dayQ").oninput=renderDaySuggestions,$("#dayQ").onfocus=renderDaySuggestions,$("#dayQ").onkeydown=e=>{if(e.key==="Escape"){$("#daySug").hidden=!0,$("#dayQ").setAttribute("aria-expanded","false");return}if(e.key==="ArrowDown")return e.preventDefault(),$opt("#daySug button")?.focus();e.key==="Enter"&&(e.preventDefault(),$opt("#daySug button")?.click())},$("#daySug").addEventListener("keydown",e=>{const t=[...$("#daySug").querySelectorAll("button")],n=targetEl(e),a=n?t.indexOf(n):-1;a!==-1&&(e.key==="ArrowDown"&&(e.preventDefault(),t[(a+1)%t.length]?.focus()),e.key==="ArrowUp"&&(e.preventDefault(),(a?t[a-1]:$("#dayQ"))?.focus()),e.key==="Escape"&&(e.preventDefault(),$("#daySug").hidden=!0,$("#dayQ").focus()))}),document.addEventListener("focusin",e=>{!$("#dayView").hidden&&!targetEl(e)?.closest(".dayadd")&&($("#daySug").hidden=!0,$("#dayQ").setAttribute("aria-expanded","false"))}),$("#dayList").addEventListener("input",e=>{const t=targetInput(e);if(!t?.dataset.dayg)return;setDayGrams(t.dataset.dayg,t.value);const n=dayTotals();renderDayTotals(n),renderDaySummary(n)}),$("#dayList").addEventListener("change",e=>{const t=targetEl(e);if(!t)return;const n=t.dataset.dayportion;if(n!==void 0){const a=t instanceof HTMLSelectElement&&t.value!==""?portionsFor(n)[+t.value]:void 0;return a&&setDayGrams(n,a.g),render(),$opt(`[data-dayportion="${n}"]`)?.focus()}t.dataset.dayg&&render()}),$("#daySum").addEventListener("input",e=>{if(targetEl(e)?.dataset.w===void 0)return;S.kg=clampKg(readWeight()),savePrefs();const t=dayTotals();$("#aaRows").innerHTML=aminoRows(t),$("#aaKg").textContent=`against FAO/WHO for ${weightLabel()}`,renderDayTotals(t)}),$("#daySum").addEventListener("change",e=>{if(targetEl(e)?.dataset.w!==void 0)if(S.wUnit==="stlb"){const{st:t,lb:n}=kgToStLb(S.kg);$("#dayStones").value=String(t),$("#dayPounds").value=String(n)}else $("#dayKg").value=String(+S.kg.toFixed(1))}),document.addEventListener("keydown",e=>{const t=targetEl(e);if(!t?.matches('[role="tab"]'))return;const n=[...document.querySelectorAll('[role="tab"]')],a=n.indexOf(t);let s=null;if(e.key==="ArrowRight"&&(s=(a+1)%n.length),e.key==="ArrowLeft"&&(s=(a-1+n.length)%n.length),e.key==="Home"&&(s=0),e.key==="End"&&(s=n.length-1),s===null)return;const o=n[s]?.dataset.tab;o!==void 0&&(e.preventDefault(),S.tab=o,renderDetail(),$(`[data-tab="${S.tab}"]`).focus())});const csvQuote=e=>`"${String(e).replace(/"/g,'""')}"`;function download(e,t){const n=new Blob(["\uFEFF"+e.join(`\r
`)],{type:"text/csv;charset=utf-8"}),a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(n),download:t});a.click(),URL.revokeObjectURL(a.href)}function csvTable(){const e=cols(),t=rows(),n=csvQuote,a=basisLabel(),o=[["Food","Also known as","State","Category",...e.map(i=>i.evidence?`${i.label} (${i.unit} per 100 g, evidence)`:`${i.label} (${S.dv&&i.dv?"%DV":i.unit} ${a})`)].map(n).join(",")].concat(t.map(({f:i,i:c})=>[n(i.name),n(i.alt||""),n(i.state),n(i.cat),...e.map(r=>{if(r.evidence)return n(evText(ev(slugAt(c),r.id),r.dp));const d=shown(i,r);return d===null?"":S.dv&&r.dv?Math.round(d/r.dv*100):d})].join(",")));download(o,"vegan-nutrients.csv"),say(`Exported ${t.length} foods and ${e.length} nutrients as CSV.`)}function today(){const e=new Date,t=n=>String(n).padStart(2,"0");return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())}`}function csvDay(){const e=cols().filter(r=>!r.evidence),t=dayTotals(),n=dayContributors(),a=csvQuote,s=r=>totalOf(t,r),o=a(today()),c=[["Date","Food","State","Grams",...e.map(r=>`${r.label} (${r.unit})`)].map(a).join(",")];for(const{f:r,g:d}of n)c.push([o,a(r.name),a(r.state||""),d,...e.map(l=>{const u=val(r,l.id);return u===null?"":+(u*d/100).toFixed(6)})].join(","));c.push([o,a("Total"),a(""),dayGrams(),...e.map(r=>{const d=s(r.id).total;return d===null?"":+d.toFixed(6)})].join(",")),c.push([o,a("% of daily value"),a(""),"",...e.map(r=>{const d=s(r.id).total;return r.dv&&d!==null?Math.round(d/r.dv*100):""})].join(",")),c.push([o,a("Foods measured"),a(""),"",...e.map(r=>`${s(r.id).from} of ${s(r.id).of}`).map(a)].join(",")),download(c,"my-day.csv"),say(`Exported your day, ${n.length} foods and ${e.length} nutrients, as CSV.`)}const csv=()=>S.view==="day"?csvDay():csvTable();$("#csvBtn").onclick=csv;function renderNutPick(e=new Set){$("#nutPick").innerHTML=GROUPS.map(t=>{const n=NUTS.filter(a=>a.group===t.id);return`<div class="lensgroup"><h5>${esc(t.label)}</h5><div class="nutgrid">`+n.map(a=>`<label><input type="checkbox" name="nut" value="${esc(a.id)}"
        ${e.has(a.id)?"checked":""}> ${esc(a.label)}</label>`).join("")+"</div></div>"}).join(""),updateLensCount()}const pickedNuts=()=>[...document.querySelectorAll("#nutPick input[name=nut]:checked")].map(e=>e.value);function updateLensCount(){const e=pickedNuts().length;$("#lensCount").textContent=e?`· ${e} selected`:"· none selected yet"}function renderSavedLenses(){const e=$("#savedLenses");if(!S.custom.length){e.innerHTML="";return}e.innerHTML=`<p style="font-size:13.5px;font-weight:600;color:var(--ink);margin:0 0 8px">
      Your highlight groups</p>`+S.custom.map(t=>`<div class="savedlens">
      <span class="swatch" aria-hidden="true" style="width:11px;height:11px;border-radius:3px;
        background:var(--lens-bg);border:2px solid var(--lens-line);flex:none"></span>
      <span>${esc(t.name)}</span>
      <span class="lenscount">${t.ids.length} nutrient${t.ids.length===1?"":"s"}</span>
      <button class="rm" type="button" data-rmlens="${esc(t.id)}">${I.x}
        <span class="sr">Delete ${esc(t.name)}</span></button></div>`).join("")}function openLensEditor(){$("#lensErr").textContent="",$("#lensName").value="",$("#lensWhy").value="",renderSavedLenses(),renderNutPick(lensIds()),$("#lensDlg").showModal(),$("#lensName").focus()}$("#lensCancel").onclick=()=>$("#lensDlg").close(),$("#lensX").onclick=()=>$("#lensDlg").close(),$("#nutPick").addEventListener("change",updateLensCount),$("#savedLenses").addEventListener("click",e=>{const t=targetAnyEl(e)?.closest("[data-rmlens]");if(!t)return;const n=t.dataset.rmlens,a=S.custom.find(s=>s.id===n);S.custom=S.custom.filter(s=>s.id!==n),S.lens===n&&(S.lens=""),savePrefs(),renderSavedLenses(),renderLensSelect(),render(),say(`Deleted highlight group ${a?a.name:""}.`)}),$("#lensForm").addEventListener("submit",e=>{e.preventDefault();const t=$("#lensName").value.trim(),n=pickedNuts();if(!t){$("#lensErr").textContent="Give the group a name.",$("#lensName").focus();return}if(!n.length){$("#lensErr").textContent="Pick at least one nutrient.";return}const a="c"+Date.now().toString(36),s=$("#lensWhy").value.trim().slice(0,240);S.custom.push({id:a,name:t.slice(0,40),ids:n,...s?{why:s}:{}}),savePrefs(),$("#lensDlg").close(),setLens(a),say(`Saved highlight group ${t}, ${n.length} nutrients.`)});const AMINO_IDS=NUTS.filter(e=>e.group==="amino").map(e=>e.id),aminoGaps=e=>AMINO_IDS.filter(t=>val(e,t)===null).length,NO_AMINOS=FOODS.filter(e=>aminoGaps(e)===AMINO_IDS.length),PART_AMINOS=FOODS.filter(e=>aminoGaps(e)>0&&aminoGaps(e)<AMINO_IDS.length),andList=e=>e.slice().sort().join(", ").replace(/, ([^,]*)$/," and $1"),FORTIFIED=NOTES.find(e=>e.id==="fortified"),FORTIFIED_FOODS=Object.keys(FORTIFIED?.cells||{}).flatMap(e=>foodBySlug(e)||[]),FLAV_IDS=["anthocyanidins","flavan3ols","flavonols"],FLAV_REACHED=FOODS.filter(e=>FLAV_IDS.some(t=>val(e,t)!==null)).length,GAMMA_OVER_ALPHA=FOODS.filter(e=>{const t=val(e,"vite"),n=val(e,"gammatoc");return t!==null&&n!==null&&n>t}),STEROL_EMPTY_CATS=[...new Set(FOODS.map(e=>e.cat))].filter(e=>FOODS.every(t=>t.cat!==e||val(t,"phytosterols")===null)),STEROL_FOODS=FOODS.filter(e=>val(e,"phytosterols")!==null),STEROL_MISSING_RICH=FOODS.filter(e=>(e.cat==="Nuts"||e.cat==="Seeds")&&val(e,"phytosterols")===null),UNDIFF=NOTES.find(e=>e.id==="undifferentiated"),UNDIFF_CELLS=Object.values(UNDIFF?.cells||{}).flat().length;function bioDialog(){const e=new Map;for(const a of INTERACTIONS){const s=a.affects.join("+");e.set(s,[...e.get(s)||[],a])}const t=a=>IDX.get(a.split("+")[0]??"")??999;return`
    <p>Every figure in this table is a measurement of what is <em>in</em> a food. How much of it
    reaches you is a different question, and for some nutrients the gap between the two is
    large enough to change what the number means. This page is what is known about that gap.</p>
    <p><b>No figure on this page is ever adjusted for absorption.</b> Iron reads 3.30 mg because
    3.30 mg is what was measured. Absorption depends on the rest of the meal, on the person, and
    on how much of the nutrient they already have, so any single "absorbable" number would be an
    invention dressed as a measurement. What is offered instead is the reasoning, with its
    sources, so you can apply it yourself.</p>
    ${[...e.entries()].sort((a,s)=>t(a[0])-t(s[0])).map(([a,s])=>{const o=a.split("+").map(c=>nutOpt(c)?.label??c).join(", ").replace(/, ([^,]*)$/," and $1"),i=s.map(c=>`
        <div class="biorow ${c.direction}">
          <div class="biohead">
            <span class="bioarrow" aria-hidden="true">${c.direction==="up"?"↑":"↓"}</span>
            <b>${esc(agentLabel(c.agent))}</b>
            <span class="biowhen">${esc(c.when)}</span>
          </div>
          <p>${esc(c.text)}</p>
          ${c.cites.map(r=>`<cite>${esc(X.sources[r]??r)}</cite>`).join("")}
        </div>`).join("");return`<h4>${esc(o)}</h4>${i}`}).join("")}
    <h4>What is not here</h4>
    <p>This list is deliberately short. It holds the interactions that are well enough established
    to cite, and no others, so a nutrient with no entry means nothing has been recorded here rather
    than that nothing affects it. There is no phytate or oxalate column in the table either: USDA's
    USDA does not publish those figures, so the amounts in any particular food are not
    something this page knows.</p>
    <p>Nor is there any advice about supplements, doses or timing beyond meals. This page describes
    foods.</p>`}function gapsDialog(){const e=n=>G.gaps.filter(a=>a.tier===n),t=n=>`
    <div class="gaprow ${n.tier}">
      <h4>${esc(n.label)}</h4>
      ${n.role?`<p class="gaprole">${esc(n.role)}</p>`:""}
      <p>${esc(n.why)}</p>
      ${gapEvidenceText(n)}
      ${n.closing?`<p class="gapclose"><b>Closing it.</b> ${esc(n.closing)}</p>`:""}
      ${n.cites.map(a=>`<cite>${esc(G.sources[a]??a)}</cite>`).join("")}
    </div>`;return`
    <p>Most of this page is about what is in a food. This page is about the
    handful of things that are not in any of them, or are there in amounts too
    small to count on. It is the companion to <b>Absorption</b>: that one says you
    get less of a figure than it looks, this one says the figure is not here.</p>
    <p><b>No doses, and no products.</b> What each of these does, why the gap is
    there, and the two ways people close it. Anything past that is a question for
    a dietitian or a GP, and it changes with age, pregnancy and where you live.</p>

    <h3 class="gaphead">Food will not supply these</h3>
    ${e("gap").map(t).join("")}

    <h3 class="gaphead">Worth planning for</h3>
    ${e("plan").map(t).join("")}

    <h3 class="gaphead">What this data cannot see</h3>
    <p>Named so that their absence is not read as their being fine. Each was
    checked against the source data rather than assumed.</p>
    ${e("unseen").map(t).join("")}`}const DLG={how:["How to use",`
    <h4>Show the columns you want</h4>
    <p>The <b>Nutrient groups</b> buttons in the sidebar switch whole groups of columns on and
    off. Each group has its own background tint in the table, so you can tell at a glance where one
    ends and the next begins. All ${GROUPS.length} start visible, which makes for a wide table;
    switch off the ones you are not reading and the rest close up.</p>
    <h4>Sort by anything</h4>
    <p>Every column header is a button. One click sorts high to low, a second reverses it. The
    sorted column is shown in bold all the way down, so you can keep your place while scrolling
    sideways. Sorting applies to the whole dataset, not just the page you are looking at.</p>
    <h4>Highlight what you came for</h4>
    <p>The <b>Highlight</b> menu picks out a set of nutrients wherever they sit in the table:
    the nine essential amino acids, the three the body uses to make creatine, the pair that matter
    for iron absorption, and so on. Choosing one switches on any column group it needs.</p>
    <p>Choose <b>Add…</b>, the last entry in that menu, to build your own from any combination of
    nutrients and give it a name. Your groups are saved in this browser and appear in the same
    menu.</p>
    <h4>Compare like for like</h4>
    <p><b>Show % daily value</b> converts every column that has a reference value into a percentage,
    which makes a milligram of selenium and a gram of protein comparable at a glance.</p>
    <h4>Build a day and total it</h4>
    <p>The table answers what is in a food. <b>My day</b>, in the sidebar under Favourites, answers
    what you got. Type a food into the box at the top, say how many grams, and every one of the
    ${NUTS.length} nutrients is totalled across the list, in its own units and as a percentage of a
    daily value. Your favourites come up first in that search, and there is an <b>Add to my day</b>
    button in the detail panel for when you spot something while browsing.</p>
    <p>The summary beside it is the part worth reading. It scores the amino acids of the
    <em>whole day</em> rather than of any one food, which is the basis that matters: cereals run short on
    lysine and pulses on the sulphur pair, so rice and lentils together score higher than either on
    its own. That is why combining proteins within a single meal is unnecessary. Under it,
    <b>Short on</b> lists what fell below half a daily value, and each entry is a button that takes
    you back to the table sorted by that nutrient, so "low on selenium" becomes "here is what has
    some" in one click.</p>
    <p>Two things the totals will not do. A figure summed over foods where some were never
    assayed is marked with how many it covers, and left out of <b>Short on</b> entirely, because a
    shortfall nobody measured is not a shortfall anybody knows about. And nothing whose daily value
    is a budget rather than a target, saturated fat and sodium among them, is ever reported as
    something you are short of.</p>
    <h4>Narrow it down</h4>
    <p>All three ways of narrowing the table sit in the sidebar. <b>Search</b> at the top matches
    on name, alternative name, state and category. <b>Food categories</b> filters to one group of
    foods, and clicking the category you are already in takes you back to all of them. Star foods
    with the heart button and switch on <b>Favourites</b> to see only your shortlist.</p>
    <p><b>Export CSV</b>, above the table, writes out exactly the rows and columns you can
    currently see, so narrowing the table narrows the export with it.</p>
    <h4>What gets remembered</h4>
    <p>Your favourites, the foods and quantities in your day, saved highlight groups, visible
    columns, sort order and light or dark mode are kept in this browser between visits. Nothing is
    sent anywhere. It is stored on your own machine, so it will not follow you to another device,
    and clearing site data will clear it.</p>
    <p>Nothing here sets an expiry date, so it is kept until something clears it. Safari is the
    exception worth knowing about: it deletes stored data for a site you have not used in seven
    days, which is a rule of the browser rather than of this page.</p>
    <h4>Keyboard</h4>
    <p>Everything is reachable by tab. The table region itself is focusable, so you can scroll it
    sideways with the arrow keys. The detail panel tabs move with left and right arrows.</p>`],meth:["Methodology and limits",`
    <h4>Where the numbers come from</h4>
    <p>Macronutrients, vitamins, minerals and fat fractions follow USDA FoodData Central entries for
    the food in the state listed: cooked where it says cooked, dry where it says dry. Figures are
    representative values for the food, not a lab analysis of any particular packet.</p>
    <h4>How amino acids are calculated</h4>
    <p>Each food has a profile of amino acids expressed as grams per 100 g of <em>protein</em>. The
    figures in the table are that profile multiplied by the food's protein content, so the amino acid
    columns always reconcile with the protein column. It also means cooked and dry forms of the same
    food share one profile, because water content divides out.</p>
    <h4>The omega columns</h4>
    <p>Four named omega columns sit alongside the monounsaturated and polyunsaturated totals.
    Omega-3 is <b>ALA</b> and omega-6 is <b>LA</b>, the two your body cannot make. Omega-9
    (<b>oleic</b>) and omega-7 (<b>palmitoleic</b>) are the two main monounsaturated fractions, and
    both are counted inside the monounsaturated total rather than in addition to it.</p>
    <p>Some of these figures are <em>undifferentiated</em>, meaning USDA measured a chain length
    without separating the isomers within it. Omega-9 is the clearest case: 18:1 bundles a small
    amount of n-7 vaccenic acid in with the n-9 oleic acid. In plant foods 18:1 is overwhelmingly
    oleic, so reading it as omega-9 is the usual convention and a close approximation, but it is
    not a direct n-9 measurement. The 16:1 figure behind omega-7 has no such ambiguity.</p>
    <p>ALA and LA are published both ways, and for most foods only the undifferentiated 18:3 and
    18:2 exist. Leaving those cells empty would have emptied two thirds of both columns, including
    pecans, macadamias, tahini, coconut and cocoa, so the undifferentiated figure is used and the
    cell is marked with ${UNDIFF?`a “${esc(UNDIFF.marker)}”`:"a marker"}. ${UNDIFF_CELLS} of
    the figures in those two columns came this way, and the rest are direct measurements of the
    named isomer. The approximation holds for the same reason it does for omega-9: in plant foods
    18:2 is essentially all LA and 18:3 essentially all ALA. The one thing that would break it is
    gamma-linolenic acid, an omega-6 sharing the 18:3 chain length, and the food here that carries
    it in any quantity is hemp, which has a directly measured figure and takes no approximation.
    A few foods have no measurement either way and show a dash rather than a zero.</p>
    <p><b>ALA is not EPA and DHA.</b> The long-chain omega-3s that the brain, eyes and heart
    actually use are built from ALA by a pathway that converts only a few per cent of it, less in
    men than in women, and less still on a diet high in omega-6, which is what the two columns
    read together are for. No whole plant food is a meaningful direct source: USDA finds EPA in
    four of these ${FOODS.length} foods and DHA in one, all at traces as likely to be assay noise
    as anything real, which is why neither gets a column. The dependable vegan source is an algae
    oil supplement, which is where the fish get theirs. The seaweeds in this table are not a
    substitute for it; the algae cultured for oil are different organisms from nori and kelp.</p>
    <h4>The saturated fats</h4>
    <p>The macronutrient group carries a single saturated fat total. The three columns here say
    what it is made of, because the fractions behave differently enough that the total on its own
    hides more than it shows. <b>Palmitic (16:0)</b> is the most abundant and the one dietary
    advice about saturated fat is mostly about, the fraction most consistently shown to raise LDL
    cholesterol. <b>Stearic (18:0)</b> is largely converted into oleic acid in the body and leaves
    LDL roughly where it found it. <b>Lauric (12:0)</b> raises LDL but raises HDL alongside it.</p>
    <p>The three are a subset of the saturated total and never the whole of it, since the shorter
    and longer chains are left out, so they will usually sum to less than the figure above them.
    None carries a daily value, because the saturated total already does and counting the same
    grams twice would overstate them. Coconut is the food this makes legible: almost all of its
    saturated fat is lauric, which is close to absent everywhere else in the table, and is why
    coconut never sits neatly on either side of the saturated fat argument.</p>
    <h4>The plant compounds group</h4>
    <p>Five carotenoids: the orange, red and yellow pigments plants make, which is why the richest
    figures sit with the carrots, peppers, tomatoes and dark leaves rather than with the pulses and
    grains. <b>Beta-carotene</b>, <b>alpha-carotene</b> and <b>beta-cryptoxanthin</b> are provitamin
    A, meaning the body converts them into retinol; <b>lutein and zeaxanthin</b> concentrate in the
    retina; <b>lycopene</b> does neither and is counted for its own sake.</p>
    <p>None of the five carries a daily value here, deliberately. Only vitamin A has one, and the
    vitamin A column already counts the provitamin-A carotenoids through it, so giving them
    percentages of their own would show the same intake twice. Conversion is also poor and varies
    between people, so a microgram of beta-carotene is not a microgram of retinol.</p>
    <p>Then three flavonoid subclasses: <b>anthocyanidins</b>, the red and purple berry pigments;
    <b>flavan-3-ols</b>, the catechins behind the astringency of tea and apple skin; and
    <b>flavonols</b>, quercetin and its relatives, the most widespread of the three in vegetables.
    These are the closest the table comes to answering "what about antioxidants", and they come
    from a different USDA release than everything else, the Database for the Flavonoid Content of
    Selected Foods. It measured only ${FLAV_REACHED} of these ${FOODS.length} foods, so these
    columns are mostly blank, and that is the state of the evidence rather than an
    omission.</p>
    <p><b>A blank here is not a zero, and the two are worth telling apart.</b> USDA published
    individual compounds, not subclass totals, so each figure is a sum. A sum is only shown where
    the whole subclass was measured. Cocoa powder has the largest single flavan-3-ol figure in the
    source, but only two of the five catechins were ever measured for it, so it shows no data
    rather than a total that understates by an unknown amount.</p>
    <p>There is deliberately no <em>total flavonoid</em> column and no antioxidant score. A total
    would sum a different set of subclasses for each food, so two rows could not be compared. As
    for a single antioxidant number, USDA withdrew its own ORAC database in 2012, on the grounds
    that antioxidant capacity measured in a test tube predicts nothing useful in the body.</p>
    <p>Phytic acid, isoflavones and proanthocyanidins are <em>not</em> here. USDA publishes no
    figures at all for any of the three. USDA's expanded flavonoid release would reach twice as
    many of these foods, but it gets there by imputing values from other foods rather than
    measuring them, which is the one thing this table will not do.</p>
    <p>Phytosterols used to be grouped with those three as another compound left out, and that was
    wrong: the coverage that ruled it out then is no better or worse than the flavonoid columns
    above, which shipped anyway. Phytosterols has its own column now, past the flavonoids, with its
    coverage caveat kept under "Known caveats" below rather than repeated here.</p>
    <h4>Amino acid score and the limiting amino acid</h4>
    <p>The protein quality figures are <em>derived</em> from the columns already in the table, not
    sourced separately, so they cannot disagree with the rest of the row. Each essential amino acid
    is expressed as milligrams per gram of protein and compared with the FAO/WHO 2007 requirement
    pattern for adults. The lowest of those ratios is the amino acid score, and the amino acid
    responsible is the <b>limiting</b> one, the one that caps how much of the protein your body can
    put to use.</p>
    <p>Methionine is scored together with cysteine, and phenylalanine together with tyrosine,
    because each pair spares the other. A score at or above 100% means the food meets the adult
    pattern across the board; below it, combining that food with one richer in the limiting acid
    raises the total. This is why grains and pulses complement each other so neatly: cereals run
    short on lysine, pulses on the sulphur pair, and each covers the other's gap.</p>
    <p>Two caveats. The score says nothing about <em>digestibility</em>, which is what fuller
    measures like PDCAAS and DIAAS add, and plant proteins generally digest less completely than
    animal ones. And a score computed on a food with very little protein is mostly rounding noise,
    so it is not shown below about a gram per 100 g.</p>
    <h4>What a day's totals can and cannot tell you</h4>
    <p>The <b>My day</b> view multiplies each food by the grams you entered and adds the results
    up. That is the only basis on which a shortfall means anything, and it is worth being clear
    about what it does not know.</p>
    <p><b>It only knows what you listed.</b> A nutrient reading zero is far more often a food you
    have not added than a nutrient you are short of. Nothing here is a record of what you ate.</p>
    <p><b>A total summed over foods that were never assayed is marked as one.</b> Cysteine has no
    figure for ${FOODS.filter(e=>val(e,"cys")===null).length} of these ${FOODS.length} foods
    and the flavonoid columns are blank for most, so a day of half a dozen foods will routinely
    produce sums over three of them. Those carry the count they cover, they are left out of
    <em>Short on</em>, and the day's amino acid score is withheld altogether if any food in the
    list is missing any of the nine. A partial sum that reads like a complete one is the same
    failure the flavonoid columns are built to refuse, and a totals view would otherwise produce
    it in every column rather than one.</p>
    <p><b>Amino acids are scored against body weight.</b> FAO/WHO publishes adult requirements per
    kilogram, so the day view takes one figure for that and defaults to 70 kg. Those targets are
    derived from the same requirement pattern the per-food score uses, multiplied back by the
    0.66 g/kg protein requirement the pattern is built on, so the two cannot disagree. Nothing else
    on the page uses your weight.</p>
    <p><b>Intake is not absorption</b>, and this is where that matters most. Plant iron is
    non-haem and poorly absorbed alone, though vitamin C in the same meal multiplies it. Calcium
    from oxalate-rich greens is largely unavailable. Phytates in wholegrains and pulses hold back
    zinc and iron. A total comfortably over 100% can still leave you short, and no figure here
    accounts for it.</p>
    <p><b>Iodine has no column, so it has no total.</b> A view that lists what you are short of
    implies the list is complete. It is not, and iodine is a real requirement and a common gap on a
    plant-based diet. Nor are there upper limits: the one worth knowing unaided is selenium, where
    a couple of Brazil nuts covers a day and a handful every day is too many.</p>
    <h4>What "daily value" means here</h4>
    <p>Percentages use general adult reference intakes: FDA Daily Values for vitamins and minerals,
    and the FAO/WHO 2007 scoring pattern where amino acids are concerned. They are a common yardstick,
    not a personal target. Requirements shift with age, sex, body size, pregnancy, lactation,
    medication and illness.</p>
    <h4>Known caveats</h4>
    <ul>
      <li><b>Protein is estimated from nitrogen.</b> Standard analysis multiplies nitrogen by 6.25,
      which counts non-protein nitrogen too. This overstates protein in some foods, spirulina
      especially, because it is rich in nucleic acids.</li>
      <li><b>Sulphur and aromatic amino acids work in pairs.</b> Methionine is spared by cysteine and
      phenylalanine by tyrosine. Judge those four columns as two pairs, not four separate rows.</li>
      <li><b>Selenium tracks the soil, not the seed.</b> The Brazil nut figure is a typical value and
      real nuts vary by more than an order of magnitude.</li>
      <li><b>Vitamin E here is alpha-tocopherol alone.</b> It is the form that carries a daily value
      and the one the body holds on to, but it is not the only one in food.
      ${GAMMA_OVER_ALPHA.length} of these foods contain more gamma-tocopherol than alpha:
      ${andList(GAMMA_OVER_ALPHA.map(fullName))}. None of that counts towards the vitamin E
      column, which is why gamma has a column of its own beside it. Read vitamin E as the amount
      your body will bank rather than as everything in the food with vitamin E activity.</li>
      <li><b>Phytosterols are measured for a minority of these foods.</b> USDA has a figure for
      ${STEROL_FOODS.length} of these foods and none at all for anything in
      ${andList(STEROL_EMPTY_CATS)}. Even among the nuts and seeds, where phytosterols
      concentrate, ${STEROL_MISSING_RICH.length} have no figure:
      ${andList(STEROL_MISSING_RICH.map(fullName))}. Read the column as how much was found in
      the foods that were tested, never as a ranking: sesame and sunflower seeds sit on top
      partly because they are among the few that were assayed at all.</li>
      <li><b>Fortification is marked where it drives the figure.</b> Most rows are for the
      unfortified food, and a commercial packet of plant milk or cereal will beat them. A few are
      the other way round, because no unfortified version of the product is really sold:
      ${andList(FORTIFIED_FOODS.map(fullName))}. Those values carry
      ${FORTIFIED?`a “${esc(FORTIFIED.marker)}”`:"a marker"} with a note under the table.
      Yeast contains no B12 whatever, so every microgram in the yeast rows was put there by the
      maker, along with most of their thiamin, riboflavin, niacin and folate; the same goes for
      soy milk's B12, calcium and vitamin D. Iodine is not a column, so fortification with it is
      not shown anywhere.</li>
      <li><b>Seaweed and B12 is two different stories, not one.</b> This entry used to say
      flatly that seaweed's B12 is inactive analogues, and that is right about spirulina and
      wrong about nori. Spirulina is largely pseudovitamin B12, which the body cannot use and
      which some assays count anyway, so a spirulina figure quoted as B12 is usually measuring
      that. Dried purple laver is the genuine exception: it carries active B12, around 77.6 µg
      per 100 g, and it has raised B12 status in animals and in one small human trial. It is
      still not something to depend on, because toasting and seasoning roughly halve it, drying
      can turn the active forms into analogues, and the human evidence is thin. Nori and kelp
      show zero in this table because USDA publishes zero for them, which is its own caveat. The
      traces in tempeh and miso come from bacteria and are too small and too variable to count on.
      See <b>Nutrient gaps</b> for the whole of it.</li>
      <li><b>Iodine is not included.</b> USDA measures it in plenty of other foods and publishes a
      figure for none of these, so there is nothing to show rather than something held back. See
      <b>Nutrient gaps</b>.</li>
      <li><b>“n/a” is not a zero.</b> It means USDA publishes no figure for that nutrient in that
      food. Amino acids are the common gap: they are expensive to assay, so they are measured for
      staples and often skipped for minor vegetables and fruit. ${andList(NO_AMINOS.map(fullName))}
      ${NO_AMINOS.length===1?"has":"have"} no published amino acid analysis at all, and
      ${PART_AMINOS.length} more ${PART_AMINOS.length===1?"is":"are"} partial:
      ${andList(PART_AMINOS.map(fullName))}. A single missing amino acid is enough, since the
      score is capped by the scarcest one and there is no way to know whether the missing column
      was the scarcest. Where that is the case the food gets no amino acid score, rather than a
      score of zero.</li>
    </ul>`],about:["About this database",`
    <p>A single-page reference for the nutrient content of plant-based wholefoods: ${FOODS.length} foods
    across ${NUTS.length} nutrients, all per 100 g, all sortable and filterable.</p>
    <h4>Why per 100 g</h4>
    <p>It is the only basis on which foods compare fairly. Bear in mind that cooked legumes and
    grains are mostly water, so a realistic portion of lentils delivers far more than the per-100 g
    figure suggests, while nobody eats 100 g of spirulina.</p>
    <h4>Not medical advice</h4>
    <p>This is reference data, not a nutrition plan. If you are making significant dietary changes,
    managing a health condition, pregnant, or feeding a child, talk to a dietitian or your GP.
    One specific note: vitamin B12 is not reliably available from unfortified plant foods, and a
    supplement or reliably fortified food is standard advice on a vegan diet.</p>`],bio:["Absorption and bioavailability",bioDialog()],gaps:["What food alone will not supply",gapsDialog()]},isDialogKey=e=>e!==void 0&&Object.hasOwn(DLG,e);let lastFocus=null;function openDialog(e){const[t,n]=DLG[e];lastFocus=document.activeElement instanceof HTMLElement?document.activeElement:null,$("#dlgT").textContent=t,$("#dlgB").innerHTML=n,$("#dlg").showModal()}$("#dlgX").onclick=()=>$("#dlg").close(),$("#dlg").addEventListener("close",()=>lastFocus?.focus()),$("#dlg").addEventListener("click",e=>{targetEl(e)?.id==="dlg"&&$("#dlg").close()}),$("#totalFoods").textContent=String(FOODS.length);const GROUP_BLURB={macro:"macronutrients",fats:"fat fractions",amino:"amino acids",vitamin:"vitamins",mineral:"minerals",carbdetail:"sugars and starches",acids:"organic acids",plant:"plant compounds"};$("#compBlurb").textContent=`${NUTS.length} nutrients per food: `+GROUPS.map(e=>`${NUTS.filter(t=>t.group===e.id).length} ${GROUP_BLURB[e.id]}`).join(", ").replace(/, ([^,]*)$/," and $1")+".",S.dark=matchMedia("(prefers-color-scheme: dark)").matches,loadPrefs(),applyTheme(),dvBtn.setAttribute("aria-pressed",String(S.dv)),S.dv&&dvBtn.lastChild&&(dvBtn.lastChild.textContent=" Show raw amounts"),basisBtn.setAttribute("aria-pressed",String(S.basis==="kcal")),S.basis==="kcal"&&basisBtn.lastChild&&(basisBtn.lastChild.textContent=" Show per 100 g"),renderGroups(),renderCats(),renderLensSelect(),render(),S.favs.size&&say(`${S.favs.size} saved favourite${S.favs.size===1?"":"s"} restored.`);
