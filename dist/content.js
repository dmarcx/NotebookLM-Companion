"use strict";(()=>{var R="nlm_companion_data";var q="authuser:0";var C="nlm-companion-toolbar",O="nlm-companion-sidebar",I="nlm-companion-panel",K="nlm-badge-";var Ee="notebooklm.google.com",te=/\/notebook\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,ee={notebookId:null,accountScope:q,isHome:!1,isNotebook:!1};function G(e){let t;try{t=new URL(e)}catch{return{...ee}}if(t.hostname!==Ee)return{...ee};let o=t.pathname.match(te),n=o?o[1].toLowerCase():null,s=`authuser:${t.searchParams.get("authuser")??"0"}`,r=n!==null,l=!r&&(t.pathname==="/"||t.pathname===""||t.pathname==="/home");return{notebookId:n,accountScope:s,isHome:l,isNotebook:r}}function oe(e){let t=e.match(te);return t?t[1].toLowerCase():null}var ne="[NLM Companion]";function ye(...e){}function ke(...e){console.warn(ne,...e)}function Se(...e){console.error(ne,...e)}function _e(e){}function Te(){}var i={log:ye,warn:ke,error:Se,group:_e,groupEnd:Te};function j(e,t=12e3){return new Promise((o,n)=>{let a=document.querySelector(e);if(a){o(a);return}let s=Date.now()+t,r=setInterval(()=>{let l=document.querySelector(e);if(l){clearInterval(r),o(l);return}Date.now()>s&&(clearInterval(r),n(new Error(`waitForElement: timed out waiting for "${e}"`)))},250)})}function x(e,t){let o=null;return function(...n){o!==null&&clearTimeout(o),o=setTimeout(()=>e.apply(this,n),t)}}function d(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function V(){let e=Date.now();return{tags:[],status:"active",favorite:!1,archived:!1,createdAt:e,updatedAt:e}}function Q(){return{version:1,accounts:{}}}function z(e){if(e==null||typeof e!="object")return i.log("migration: no existing data \u2014 initialising fresh schema"),Q();let t=e,o=typeof t.version=="number"?t.version:0,n=t;return o<1&&(i.log("migration: v0 \u2192 v1"),n=we(t)),n.version=1,n}function we(e){let t=Q();return e.notebooks&&typeof e.notebooks=="object"&&!Array.isArray(e.notebooks)&&(t.accounts["authuser:0"]={notebooks:e.notebooks}),t}var W=class{constructor(){this.cache=null;this.listeners=new Set}readRaw(){return new Promise(t=>{chrome.storage.local.get(R,o=>{t(o[R])})})}writeRaw(t){return new Promise((o,n)=>{chrome.storage.local.set({[R]:t},()=>{chrome.runtime.lastError?n(new Error(chrome.runtime.lastError.message)):o()})})}async load(){let t=await this.readRaw();return this.cache=z(t),i.log("Storage loaded:",Object.keys(this.cache.accounts).length,"accounts"),this.cache}async getData(){return this.cache?this.cache:this.load()}async getNotebook(t,o){return(await this.getData()).accounts[t]?.notebooks[o]??V()}async setNotebook(t,o,n){let a=await this.getData(),s=this.ensureAccount(a,t),r=s.notebooks[o]??V();s.notebooks[o]={...r,...n,updatedAt:Date.now()},this.cache=a,await this.writeRaw(a),this.emit(a),i.log(`setNotebook: saved ${o} in ${t}`)}async getAllNotebooks(t){return{...(await this.getData()).accounts[t]?.notebooks??{}}}async deleteNotebook(t,o){let n=await this.getData(),a=n.accounts[t];a?.notebooks[o]&&(delete a.notebooks[o],this.cache=n,await this.writeRaw(n),this.emit(n))}async exportData(){let t=await this.getData();return JSON.stringify(t,null,2)}async importData(t){let o;try{o=JSON.parse(t)}catch{throw new Error("Import failed: not valid JSON.")}let n=z(o);this.cache=n,await this.writeRaw(n),this.emit(n),i.log("importData: import successful")}async getStats(t){let o=await this.getData(),n={};if(t)Object.assign(n,o.accounts[t]?.notebooks??{});else for(let l of Object.values(o.accounts))Object.assign(n,l.notebooks);let a=new Set,s=new Set,r=0;for(let l of Object.values(n))l.folder&&a.add(l.folder),l.tags.forEach(g=>s.add(g)),l.favorite&&r++;return{totalNotebooks:Object.keys(n).length,totalFavorites:r,totalFolders:a.size,totalTags:s.size,accounts:Object.keys(o.accounts)}}onUpdate(t){return this.listeners.add(t),()=>this.listeners.delete(t)}invalidateCache(){this.cache=null}ensureAccount(t,o){return t.accounts[o]||(t.accounts[o]={notebooks:{}}),t.accounts[o]}emit(t){for(let o of this.listeners)try{o(t)}catch(n){i.error("StorageManager listener error:",n)}}},M=new W;var X=class{constructor(){this.state={currentPage:"unknown",currentNotebookId:null,currentAccountScope:q,notebooks:{},searchQuery:"",filterFolder:null,filterTag:null,filterStatus:null,filterFavorite:!1,sortBy:"updatedAt",sortDir:"desc",sidebarOpen:!1};this.keyListeners=new Map;this.allListeners=new Set}get(t){return this.state[t]}getState(){return{...this.state}}set(t,o){if(this.state[t]===o)return;this.state[t]=o;let n=this.keyListeners.get(t);if(n)for(let s of n)s(o);let a={...this.state};for(let s of this.allListeners)s(a)}patch(t){let o=!1;for(let[n,a]of Object.entries(t))if(this.state[n]!==a){this.state[n]=a,o=!0;let s=this.keyListeners.get(n);if(s)for(let r of s)r(a)}if(o){let n={...this.state};for(let a of this.allListeners)a(n)}}subscribe(t,o){this.keyListeners.has(t)||this.keyListeners.set(t,new Set);let n=this.keyListeners.get(t);return n.add(o),()=>n.delete(o)}subscribeAll(t){return this.allListeners.add(t),()=>this.allListeners.delete(t)}resetFilters(){this.patch({searchQuery:"",filterFolder:null,filterTag:null,filterStatus:null,filterFavorite:!1})}},c=new X;function ae(e){let t=x(r=>{i.log("Navigation \u2192",r),e(r)},150),o=history.pushState.bind(history);history.pushState=function(...r){o(...r),t(location.href)};let n=history.replaceState.bind(history);history.replaceState=function(...r){n(...r),t(location.href)},window.addEventListener("popstate",()=>t(location.href));let a=document.title,s=document.querySelector("head > title");s&&new MutationObserver(()=>{document.title!==a&&(a=document.title,t(location.href))}).observe(s,{childList:!0,characterData:!0,subtree:!0}),i.log("SPA observer initialised")}var re={notebookGrid:["project-grid",".notebook-list",'[class*="notebook-list"]','[data-testid="notebook-list"]',"main > div","main"].join(", "),notebookCardSelectors:["project-button",'mat-card[aria-labelledby*="-title"]'],notebookMainContent:["main",'[role="main"]','[class*="notebook-view"]','[class*="main-content"]'].join(", ")};function se(){return re.notebookCardSelectors.join(", ")}function le(e){return!!(e.querySelector('.featured-project, [class*="featured-project"]')||(typeof e.className=="string"?e.className:"").toLowerCase().includes("featured"))}function Ne(e){let t=[e,...Array.from(e.querySelectorAll("button[aria-labelledby], mat-card[aria-labelledby]"))],o=/project-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;for(let s of t)for(let r of["aria-labelledby","aria-describedby"]){let g=(s.getAttribute(r)??"").match(o);if(g)return g[1].toLowerCase()}let n=[e,...Array.from(e.querySelectorAll("*"))];for(let s of n)for(let r of Array.from(s.attributes)){let l=r.value.match(o);if(l)return l[1].toLowerCase()}let a=e.querySelector('a[href*="/notebook/"]');return a?oe(a.getAttribute("href")??""):null}function xe(e,t){let n=(e.querySelector('[id$="-title"]')??document.getElementById(`project-${t}-title`))?.textContent?.trim();if(n)return n.slice(0,100);let a=["h3","h2","h1",'[class*="title"]','[class*="Title"]',"strong"];for(let s of a)try{let r=e.querySelector(s)?.textContent?.trim();if(r)return r.slice(0,100)}catch{}return"Untitled"}function U(){try{let e=[];for(let n of re.notebookCardSelectors)try{let a=Array.from(document.querySelectorAll(n));if(a.length>0){i.log(`parseNotebookCards: strategy "${n}" found ${a.length} elements`),e=a;break}}catch{}if(e.length===0)return i.warn("parseNotebookCards: no notebook cards found. Selectors may need updating."),[];let t=new Set,o=[];for(let n of e){if(le(n))continue;let a=Ne(n);if(!a||t.has(a))continue;t.add(a);let s=xe(n,a),r=`/notebook/${a}`;o.push({element:n,notebookId:a,title:s,href:r})}return i.log(`parseNotebookCards: found ${o.length} notebooks`),o}catch(e){return i.error("parseNotebookCards threw:",e),[]}}function ie(){let e=Array.from(document.querySelectorAll("project-button")).find(o=>!le(o));if(!e)return i.warn("findNotebookGrid: no user notebook cards found"),null;let t=e.closest("project-grid")??e.parentElement;return t?(i.log(`findNotebookGrid: found ${t.tagName}.${t.className}`),t):null}var J=[],y=null;function ce(e,t){document.getElementById(C)?.remove(),y=document.createElement("div"),y.id=C,y.className="nlm-toolbar",y.innerHTML=Ce(),e.insertBefore(y,t),Oe(),i.log("Toolbar injected")}function Y(e){J=e}function P(e){if(!y)return;let t=new Set,o=new Set;for(let s of Object.values(e)){s.folder&&t.add(s.folder);for(let r of s.tags)o.add(r)}let n=y.querySelector(".nlm-filter-folder"),a=y.querySelector(".nlm-filter-tag");if(n){let s=n.value;n.innerHTML='<option value="">All Folders</option>'+[...t].sort().map(r=>`<option value="${d(r)}">${d(r)}</option>`).join(""),s&&(n.value=s)}if(a){let s=a.value;a.innerHTML='<option value="">All Tags</option>'+[...o].sort().map(r=>`<option value="${d(r)}">${d(r)}</option>`).join(""),s&&(a.value=s)}}function A(){if(J.length===0)return;let e=c.getState(),t=e.notebooks,o=e.searchQuery.toLowerCase().trim(),{filterFolder:n,filterTag:a,filterStatus:s,filterFavorite:r,sortBy:l,sortDir:g}=e,u=[],h=[];for(let v of J){let E=t[v.notebookId],p=!0;o&&!v.title.toLowerCase().includes(o)&&(p=!1),n&&E?.folder!==n&&(p=!1),a&&!E?.tags?.includes(a)&&(p=!1),s&&E?.status!==s&&(p=!1),r&&!E?.favorite&&(p=!1),(p?u:h).push(v)}for(let v of h)v.element.style.display="none";u.sort((v,E)=>{let p=t[v.notebookId],k=t[E.notebookId],m=0;switch(l){case"name":m=v.title.localeCompare(E.title);break;case"createdAt":m=(p?.createdAt??0)-(k?.createdAt??0);break;case"lastOpened":m=(p?.lastOpened??0)-(k?.lastOpened??0);break;case"updatedAt":default:m=(p?.updatedAt??0)-(k?.updatedAt??0);break}return g==="asc"?m:-m});for(let v of u){let E=v.element;E.style.display="",E.parentElement?.appendChild(E)}}function Ce(){return`
    <div class="nlm-toolbar__search">
      <span class="nlm-toolbar__search-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
      </span>
      <input
        type="search"
        class="nlm-search-input"
        placeholder="Search notebooks\u2026"
        autocomplete="off"
        aria-label="Search notebooks"
      />
    </div>

    <div class="nlm-toolbar__sep" aria-hidden="true"></div>

    <div class="nlm-toolbar__filters">
      <select class="nlm-filter-folder nlm-select" aria-label="Filter by folder" title="Filter by folder">
        <option value="">All Folders</option>
      </select>
      <select class="nlm-filter-tag nlm-select" aria-label="Filter by tag" title="Filter by tag">
        <option value="">All Tags</option>
      </select>
      <select class="nlm-filter-status nlm-select" aria-label="Filter by status" title="Filter by status">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="archived">Archived</option>
      </select>
      <button class="nlm-filter-favorite nlm-btn" title="Show favorites only" aria-pressed="false">
        \u2605 Favorites
      </button>
    </div>

    <div class="nlm-toolbar__sep" aria-hidden="true"></div>

    <div class="nlm-toolbar__sort">
      <select class="nlm-sort-by nlm-select" aria-label="Sort by" title="Sort notebooks by">
        <option value="updatedAt">Last Updated</option>
        <option value="createdAt">Created</option>
        <option value="lastOpened">Last Opened</option>
        <option value="name">Name A\u2013Z</option>
      </select>
      <button class="nlm-sort-dir nlm-btn" title="Toggle sort direction" aria-label="Sort direction">\u2193</button>
    </div>

    <button class="nlm-sidebar-toggle nlm-btn" title="Toggle views sidebar" aria-expanded="false">
      <span aria-hidden="true">\u2261</span> Views
    </button>
  `}function Oe(){if(!y)return;let e=y.querySelector(".nlm-search-input"),t=y.querySelector(".nlm-filter-folder"),o=y.querySelector(".nlm-filter-tag"),n=y.querySelector(".nlm-filter-status"),a=y.querySelector(".nlm-filter-favorite"),s=y.querySelector(".nlm-sort-by"),r=y.querySelector(".nlm-sort-dir"),l=y.querySelector(".nlm-sidebar-toggle"),g=x(()=>{c.set("searchQuery",e.value),A()},300);e.addEventListener("input",g),t.addEventListener("change",()=>{c.set("filterFolder",t.value||null),A()}),o.addEventListener("change",()=>{c.set("filterTag",o.value||null),A()}),n.addEventListener("change",()=>{c.set("filterStatus",n.value||null),A()}),a.addEventListener("click",()=>{let u=c.get("filterFavorite");c.set("filterFavorite",!u),a.classList.toggle("nlm-btn--active",!u),a.setAttribute("aria-pressed",String(!u)),A()}),s.addEventListener("change",()=>{c.set("sortBy",s.value),A()}),r.addEventListener("click",()=>{let u=c.get("sortDir")==="asc"?"desc":"asc";c.set("sortDir",u),r.textContent=u==="asc"?"\u2191":"\u2193",A()}),l.addEventListener("click",()=>{let u=!c.get("sidebarOpen");c.set("sidebarOpen",u),l.setAttribute("aria-expanded",String(u))}),c.subscribe("sidebarOpen",u=>{l.setAttribute("aria-expanded",String(u)),l.classList.toggle("nlm-btn--active",u)})}var S=null;function de(e){document.getElementById(O)?.remove(),S=document.createElement("div"),S.id=O,S.className="nlm-sidebar",S.setAttribute("aria-label","Notebook Companion sidebar"),S.innerHTML=Ie(),e.appendChild(S),Pe(),c.subscribe("sidebarOpen",t=>{S?.classList.toggle("nlm-sidebar--open",t)}),i.log("Sidebar injected")}function D(e){if(!S)return;let t=new Map,o=new Map;for(let n of Object.values(e)){n.folder&&t.set(n.folder,(t.get(n.folder)??0)+1);for(let a of n.tags)o.set(a,(o.get(a)??0)+1)}Be(t),Re(o)}function Ie(){return`
    <div class="nlm-sidebar__inner">
      <div class="nlm-sidebar__header">
        <span class="nlm-sidebar__title">\u{1F4DA} Companion</span>
        <button class="nlm-sidebar__close" aria-label="Close sidebar" title="Close">\u2715</button>
      </div>

      <nav class="nlm-sidebar__section" aria-label="Smart views">
        <h3 class="nlm-sidebar__section-title">Smart Views</h3>
        <div class="nlm-view-list">
          <button class="nlm-view-btn nlm-view-btn--active" data-view="all">
            <span class="nlm-view-icon">\u{1F4DA}</span> All Notebooks
          </button>
          <button class="nlm-view-btn" data-view="favorites">
            <span class="nlm-view-icon">\u2605</span> Favorites
          </button>
          <button class="nlm-view-btn" data-view="active">
            <span class="nlm-view-icon">\u2713</span> Active
          </button>
          <button class="nlm-view-btn" data-view="archived">
            <span class="nlm-view-icon">\u{1F5C4}</span> Archived
          </button>
          <button class="nlm-view-btn" data-view="recent">
            <span class="nlm-view-icon">\u{1F550}</span> Recently Opened
          </button>
        </div>
      </nav>

      <div class="nlm-sidebar__section">
        <h3 class="nlm-sidebar__section-title">Folders</h3>
        <div class="nlm-folder-list">
          <span class="nlm-sidebar__empty">No folders yet</span>
        </div>
      </div>

      <div class="nlm-sidebar__section">
        <h3 class="nlm-sidebar__section-title">Tags</h3>
        <div class="nlm-tag-list">
          <span class="nlm-sidebar__empty">No tags yet</span>
        </div>
      </div>
    </div>
  `}function Pe(){S&&(S.querySelector(".nlm-sidebar__close")?.addEventListener("click",()=>{c.set("sidebarOpen",!1)}),S.querySelectorAll(".nlm-view-btn").forEach(e=>{e.addEventListener("click",()=>{De(e.dataset.view??"all"),$e(e)})}))}function De(e){switch(c.resetFilters(),e){case"favorites":c.set("filterFavorite",!0);break;case"active":c.set("filterStatus","active");break;case"archived":c.set("filterStatus","archived");break;case"recent":c.set("sortBy","lastOpened"),c.set("sortDir","desc");break;case"all":default:break}A()}function $e(e){S?.querySelectorAll(".nlm-view-btn").forEach(t=>{t.classList.remove("nlm-view-btn--active")}),e.classList.add("nlm-view-btn--active")}function Be(e){let t=S?.querySelector(".nlm-folder-list");if(t){if(e.size===0){t.innerHTML='<span class="nlm-sidebar__empty">No folders yet</span>';return}t.innerHTML=[...e.entries()].sort((o,n)=>o[0].localeCompare(n[0])).map(([o,n])=>`<button class="nlm-folder-btn" data-folder="${d(o)}" title="Filter by folder: ${d(o)}">
          <span class="nlm-folder-icon">\u{1F4C1}</span>
          <span class="nlm-folder-name">${d(o)}</span>
          <span class="nlm-count">${n}</span>
        </button>`).join(""),t.querySelectorAll(".nlm-folder-btn").forEach(o=>{o.addEventListener("click",()=>{let n=o.dataset.folder??null;c.resetFilters(),c.set("filterFolder",n),A(),t.querySelectorAll(".nlm-folder-btn").forEach(a=>a.classList.remove("nlm-folder-btn--active")),o.classList.add("nlm-folder-btn--active"),S?.querySelectorAll(".nlm-view-btn").forEach(a=>a.classList.remove("nlm-view-btn--active"))})})}}function Re(e){let t=S?.querySelector(".nlm-tag-list");if(t){if(e.size===0){t.innerHTML='<span class="nlm-sidebar__empty">No tags yet</span>';return}t.innerHTML=[...e.entries()].sort((o,n)=>o[0].localeCompare(n[0])).map(([o,n])=>`<button class="nlm-tag-pill" data-tag="${d(o)}" title="Filter by tag: ${d(o)}">
          ${d(o)}<span class="nlm-count">${n}</span>
        </button>`).join(""),t.querySelectorAll(".nlm-tag-pill").forEach(o=>{o.addEventListener("click",()=>{let n=o.dataset.tag??null;c.resetFilters(),c.set("filterTag",n),A(),t.querySelectorAll(".nlm-tag-pill").forEach(a=>a.classList.remove("nlm-tag-pill--active")),o.classList.add("nlm-tag-pill--active"),S?.querySelectorAll(".nlm-view-btn").forEach(a=>a.classList.remove("nlm-view-btn--active"))})})}}function me(e,t,o,n,a={}){return new Promise(s=>{document.getElementById("nlm-modal-overlay")?.remove();let r=document.createElement("div");r.id="nlm-modal-overlay",r.className="nlm-modal-overlay",r.setAttribute("role","dialog"),r.setAttribute("aria-modal","true"),r.setAttribute("aria-label",`Edit metadata for ${t}`),r.innerHTML=qe(t,n,a),document.body.appendChild(r),r.offsetWidth,r.classList.add("nlm-modal-overlay--visible");let l=r.querySelector(".nlm-modal"),g=l.querySelector('[name="folder"]'),u=l.querySelector('[name="color"]'),h=l.querySelector('[name="tags"]'),v=l.querySelector(".nlm-tag-suggestions");function E(){let m=g.value.trim();if(!m){v.innerHTML="";return}let _=Object.entries(a).filter(([f,w])=>f!==e&&w.folder===m).map(([,f])=>f);if(_.length>0){let f={};for(let H of _)H.color&&(f[H.color]=(f[H.color]??0)+1);let w=Object.entries(f).sort((H,he)=>he[1]-H[1])[0]?.[0];w&&(u.value=w)}let L={};for(let f of _)for(let w of f.tags)L[w]=(L[w]??0)+1;let b=h.value.split(",").map(f=>f.trim()).filter(Boolean),T=Object.entries(L).filter(([f])=>!b.includes(f)).sort((f,w)=>w[1]-f[1]).slice(0,8).map(([f])=>f);if(T.length===0){v.innerHTML="";return}v.innerHTML=T.map(f=>`<button type="button" class="nlm-tag-suggestion" data-tag="${d(f)}">${d(f)}</button>`).join("")}g.addEventListener("input",E),g.addEventListener("change",E),v.addEventListener("click",m=>{let _=m.target.closest(".nlm-tag-suggestion");if(!_)return;let L=_.dataset.tag,b=h.value.split(",").map(T=>T.trim()).filter(Boolean);b.includes(L)||(h.value=[...b,L].join(", ")),_.remove()});function p(m){r.classList.remove("nlm-modal-overlay--visible"),setTimeout(()=>r.remove(),200),s(m)}r.addEventListener("click",m=>{m.target===r&&p(null)}),l.querySelector(".nlm-modal__close")?.addEventListener("click",()=>p(null)),l.querySelector(".nlm-modal__cancel")?.addEventListener("click",()=>p(null)),l.querySelector(".nlm-modal__save")?.addEventListener("click",()=>{let m=ue(l,n);p(m)});let k=m=>{m.key==="Escape"&&(p(null),document.removeEventListener("keydown",k))};document.addEventListener("keydown",k),l.querySelectorAll('input[type="text"]').forEach(m=>{m.addEventListener("keydown",_=>{if(_.key==="Enter"){let L=ue(l,n);p(L)}})}),setTimeout(()=>l.querySelector("input")?.focus(),50),i.log(`Modal opened for ${e}`)})}function qe(e,t,o){let n=t.tags.join(", "),a=t.color??"#1a73e8",r=[...new Set(Object.values(o).map(l=>l.folder).filter(Boolean))].sort().map(l=>`<option value="${d(l)}"></option>`).join("");return`
    <div class="nlm-modal">
      <div class="nlm-modal__header">
        <h2 class="nlm-modal__title" title="${d(e)}">
          \u270E ${d(Fe(e,40))}
        </h2>
        <button class="nlm-modal__close" aria-label="Close">\u2715</button>
      </div>

      <div class="nlm-modal__body">
        <label class="nlm-label">
          <span class="nlm-label__text">Folder</span>
          <input
            type="text"
            name="folder"
            class="nlm-input"
            value="${d(t.folder??"")}"
            placeholder="e.g. Work, Research, Personal\u2026"
            autocomplete="off"
            list="nlm-folders-list"
          />
          <datalist id="nlm-folders-list">${r}</datalist>
        </label>

        <label class="nlm-label">
          <span class="nlm-label__text">Tags <small>(comma-separated)</small></span>
          <input
            type="text"
            name="tags"
            class="nlm-input"
            value="${d(n)}"
            placeholder="ai, research, draft\u2026"
            autocomplete="off"
          />
        </label>
        <div class="nlm-tag-suggestions" aria-label="Suggested tags"></div>

        <label class="nlm-label">
          <span class="nlm-label__text">Status</span>
          <select name="status" class="nlm-select">
            <option value="active"  ${t.status==="active"?"selected":""}>Active</option>
            <option value="inactive"${t.status==="inactive"?"selected":""}>Inactive</option>
            <option value="archived"${t.status==="archived"?"selected":""}>Archived</option>
          </select>
        </label>

        <div class="nlm-modal__row">
          <label class="nlm-label nlm-label--inline">
            <span class="nlm-label__text">Color</span>
            <input type="color" name="color" class="nlm-color-input" value="${d(a)}" />
          </label>
          <label class="nlm-label nlm-label--checkbox">
            <input type="checkbox" name="favorite" ${t.favorite?"checked":""} />
            <span>\u2605 Favorite</span>
          </label>
          <label class="nlm-label nlm-label--checkbox">
            <input type="checkbox" name="archived" ${t.archived?"checked":""} />
            <span>\u{1F5C4} Archived</span>
          </label>
        </div>

        <label class="nlm-label">
          <span class="nlm-label__text">Note</span>
          <textarea name="note" class="nlm-textarea" rows="3" placeholder="Add a private note\u2026">${d(t.note??"")}</textarea>
        </label>
      </div>

      <div class="nlm-modal__footer">
        <button class="nlm-btn nlm-modal__cancel">Cancel</button>
        <button class="nlm-btn nlm-btn--primary nlm-modal__save">Save</button>
      </div>
    </div>
  `}function ue(e,t){let o=$(e,'[name="folder"]').trim(),n=$(e,'[name="tags"]').trim(),a=$(e,'[name="status"]'),s=$(e,'[name="color"]'),r=e.querySelector('[name="favorite"]')?.checked??!1,l=e.querySelector('[name="archived"]')?.checked??!1,g=$(e,'[name="note"]').trim(),u=n?n.split(",").map(h=>h.trim()).filter(Boolean):[];return{...t,folder:o||void 0,tags:u,status:a,color:s,favorite:r,archived:l,note:g||void 0,updatedAt:Date.now()}}function $(e,t){return e.querySelector(t)?.value??""}function Fe(e,t){return e.length>t?e.slice(0,t)+"\u2026":e}function Z(e,t,o){for(let n of e)Ue(n,t[n.notebookId],o)}function je(e,t){let o=document.getElementById(K+e);o&&(o.innerHTML=pe(t))}function Ue(e,t,o){let n=e.element,a=K+e.notebookId;document.getElementById(a)?.remove();let s=document.createElement("div");s.id=a,s.className="nlm-badge",s.dataset.notebookId=e.notebookId,s.innerHTML=pe(t),s.addEventListener("click",r=>r.stopPropagation()),s.querySelector(".nlm-badge__edit")?.addEventListener("click",async r=>{r.preventDefault(),r.stopPropagation();try{let l=await M.getNotebook(o,e.notebookId),g=await me(e.notebookId,e.title,o,l,c.get("notebooks"));if(g){await M.setNotebook(o,e.notebookId,g);let u=await M.getNotebook(o,e.notebookId);je(e.notebookId,u);let h=await M.getAllNotebooks(o);c.set("notebooks",h),P(h),D(h)}}catch(l){i.error("Badge edit error:",l)}}),n.appendChild(s)}function pe(e){if(!e)return`
      <div class="nlm-badge__inner">
        <button class="nlm-badge__edit nlm-badge__edit--new" title="Add companion metadata" aria-label="Add metadata">
          + Tag
        </button>
      </div>`;let t=[];if(e.color&&t.push(`<span class="nlm-badge__color" style="background-color:${d(e.color)}" title="Color: ${d(e.color)}"></span>`),e.favorite&&t.push('<span class="nlm-badge__star" title="Favorite">\u2605</span>'),e.archived&&t.push('<span class="nlm-badge__archived" title="Archived">\u{1F5C4}</span>'),e.folder&&t.push(`<span class="nlm-badge__folder" title="Folder: ${d(e.folder)}">\u{1F4C1} ${d(e.folder)}</span>`),e.tags.length>0){let o=e.tags.slice(0,3),n=e.tags.length-o.length,a=o.map(r=>`<span class="nlm-tag">${d(r)}</span>`).join(""),s=n>0?`<span class="nlm-tag nlm-tag--more">+${n}</span>`:"";t.push(`<span class="nlm-badge__tags">${a}${s}</span>`)}return e.status&&e.status!=="active"&&t.push(`<span class="nlm-badge__status nlm-badge__status--${e.status}">${e.status}</span>`),t.push('<button class="nlm-badge__edit" title="Edit companion metadata" aria-label="Edit metadata">\u270E</button>'),`<div class="nlm-badge__inner">${t.join("")}</div>`}function fe(e,t,o,n={}){document.getElementById(I)?.remove();let a=document.createElement("div");a.id=I,a.className="nlm-panel nlm-panel--collapsed",a.innerHTML=Ge(o,n),document.body.appendChild(a),Ve(a,e,t,n),i.log(`Notebook panel mounted for ${e}`)}function Ge(e,t){let o=e.tags.join(", "),a=[...new Set(Object.values(t).map(s=>s.folder).filter(Boolean))].sort().map(s=>`<option value="${d(s)}"></option>`).join("");return`
    <button class="nlm-panel__tab" aria-label="Toggle Companion panel" title="Toggle Companion">
      <span class="nlm-panel__tab-icon">\u25C0</span>
      <span class="nlm-panel__tab-label">Companion</span>
    </button>

    <div class="nlm-panel__body" aria-label="Notebook companion panel">
      <div class="nlm-panel__header">
        <span class="nlm-panel__title">\u{1F4DA} Companion</span>
      </div>

      <div class="nlm-panel__form">

        <label class="nlm-label">
          <span class="nlm-label__text">Folder</span>
          <input
            type="text"
            name="folder"
            class="nlm-input"
            value="${d(e.folder??"")}"
            placeholder="e.g. Work, Research\u2026"
            autocomplete="off"
            list="nlm-panel-folders-list"
          />
          <datalist id="nlm-panel-folders-list">${a}</datalist>
        </label>

        <label class="nlm-label">
          <span class="nlm-label__text">Tags <small>(comma-separated)</small></span>
          <input
            type="text"
            name="tags"
            class="nlm-input"
            value="${d(o)}"
            placeholder="ai, notes, draft\u2026"
            autocomplete="off"
          />
        </label>
        <div class="nlm-tag-suggestions" aria-label="Suggested tags"></div>

        <label class="nlm-label">
          <span class="nlm-label__text">Status</span>
          <select name="status" class="nlm-select">
            <option value="active"  ${e.status==="active"?"selected":""}>Active</option>
            <option value="inactive"${e.status==="inactive"?"selected":""}>Inactive</option>
            <option value="archived"${e.status==="archived"?"selected":""}>Archived</option>
          </select>
        </label>

        <label class="nlm-label nlm-label--color-row">
          <span class="nlm-label__text">Color</span>
          <input
            type="color"
            name="color"
            class="nlm-color-input"
            value="${d(e.color??"#1a73e8")}"
            title="Pick a color for this notebook"
          />
        </label>

        <div class="nlm-panel__checkboxes">
          <label class="nlm-label nlm-label--checkbox">
            <input type="checkbox" name="favorite" ${e.favorite?"checked":""} />
            <span>\u2605 Favorite</span>
          </label>
          <label class="nlm-label nlm-label--checkbox">
            <input type="checkbox" name="archived" ${e.archived?"checked":""} />
            <span>\u{1F5C4} Archived</span>
          </label>
        </div>

        <label class="nlm-label">
          <span class="nlm-label__text">Note</span>
          <textarea
            name="note"
            class="nlm-textarea"
            rows="4"
            placeholder="Add a private note about this notebook\u2026"
          >${d(e.note??"")}</textarea>
        </label>

        <div class="nlm-panel__saved-indicator" aria-live="polite"></div>
      </div>
    </div>
  `}function Ve(e,t,o,n){let a=e.querySelector(".nlm-panel__tab"),s=a.querySelector(".nlm-panel__tab-icon"),r=e.querySelector(".nlm-panel__saved-indicator"),l=e.querySelector('[name="folder"]'),g=e.querySelector('[name="color"]'),u=e.querySelector('[name="tags"]'),h=e.querySelector(".nlm-tag-suggestions");a.addEventListener("click",()=>{let p=e.classList.toggle("nlm-panel--collapsed");s.textContent=p?"\u25C0":"\u25B6",a.setAttribute("aria-expanded",String(!p))});function v(){let p=l.value.trim();if(!p){h.innerHTML="";return}let k=Object.entries(n).filter(([b,T])=>b!==t&&T.folder===p).map(([,b])=>b);if(k.length>0){let b={};for(let f of k)f.color&&(b[f.color]=(b[f.color]??0)+1);let T=Object.entries(b).sort((f,w)=>w[1]-f[1])[0]?.[0];T&&(g.value=T)}let m={};for(let b of k)for(let T of b.tags)m[T]=(m[T]??0)+1;let _=u.value.split(",").map(b=>b.trim()).filter(Boolean),L=Object.entries(m).filter(([b])=>!_.includes(b)).sort((b,T)=>T[1]-b[1]).slice(0,8).map(([b])=>b);if(L.length===0){h.innerHTML="";return}h.innerHTML=L.map(b=>`<button type="button" class="nlm-tag-suggestion" data-tag="${d(b)}">${d(b)}</button>`).join("")}l.addEventListener("input",v),l.addEventListener("change",v),h.addEventListener("click",p=>{let k=p.target.closest(".nlm-tag-suggestion");if(!k)return;let m=k.dataset.tag,_=u.value.split(",").map(L=>L.trim()).filter(Boolean);_.includes(m)||(u.value=[..._,m].join(", ")),k.remove()});let E=x(async()=>{let p=Qe(e);try{await M.setNotebook(o,t,p),ze(r)}catch(k){i.error("Panel autosave failed:",k),r.textContent="Save failed \u2717",r.className="nlm-panel__saved-indicator nlm-panel__saved-indicator--error"}},600);e.querySelector(".nlm-panel__form")?.addEventListener("input",E),e.querySelector(".nlm-panel__form")?.addEventListener("change",E)}function Qe(e){let t=B(e,'[name="folder"]').trim(),o=B(e,'[name="tags"]').trim(),n=B(e,'[name="status"]'),a=B(e,'[name="color"]'),s=e.querySelector('[name="favorite"]')?.checked??!1,r=e.querySelector('[name="archived"]')?.checked??!1,l=B(e,'[name="note"]').trim(),g=o?o.split(",").map(u=>u.trim()).filter(Boolean):[];return{folder:t||void 0,tags:g,status:n,color:a||void 0,favorite:s,archived:r,note:l||void 0}}function B(e,t){return e.querySelector(t)?.value??""}function ze(e){e.textContent="Saved \u2713",e.className="nlm-panel__saved-indicator nlm-panel__saved-indicator--visible",setTimeout(()=>{e.className="nlm-panel__saved-indicator",e.textContent=""},2500)}var be="",N=null;async function We(){i.log("NotebookLM Companion starting\u2026");try{let e=await M.load(),t=G(location.href);c.set("currentAccountScope",t.accountScope);let o=e.accounts[t.accountScope]?.notebooks??{};c.set("notebooks",{...o}),M.onUpdate(n=>{let a=c.get("currentAccountScope");c.set("notebooks",{...n.accounts[a]?.notebooks??{}})}),ae(ge),await ge(location.href)}catch(e){i.error("init failed:",e)}}async function ge(e){if(e===be)return;be=e,i.log("handleNavigation:",e);let t=G(e);if(t.accountScope!==c.get("currentAccountScope")){c.set("currentAccountScope",t.accountScope);let o=await M.getData();c.set("notebooks",{...o.accounts[t.accountScope]?.notebooks??{}})}Ye(),t.isHome?(c.patch({currentPage:"home",currentNotebookId:null}),await Xe()):t.isNotebook&&t.notebookId?(c.patch({currentPage:"notebook",currentNotebookId:t.notebookId}),M.setNotebook(t.accountScope,t.notebookId,{lastOpened:Date.now()}).catch(o=>i.error("lastOpened update failed:",o)),await Je(t.notebookId,t.accountScope)):(c.set("currentPage","unknown"),i.log("Unknown page type, no UI injected"))}async function Xe(){i.log("initHomePage: waiting for notebook cards\u2026");let e=se(),t=!1;try{await j(e,12e3)}catch{i.warn("initHomePage: primary selector timed out, trying broader wait\u2026"),t=!0;try{await j('main, [role="main"], app-root, body > div',5e3)}catch{}}let o=U();if(o.length>0){ve(o);return}if(t){i.warn("initHomePage: no cards found yet \u2014 starting persistent DOM observer");let l=Array.from(document.querySelectorAll("a[href]")).map(g=>g.getAttribute("href")).filter(Boolean).slice(0,30);i.log("initHomePage: sample anchor hrefs on page:",l)}let n=!1,s=setTimeout(()=>{n||(n=!0,r.disconnect(),i.warn("initHomePage: gave up after 60s \u2014 no notebook cards appeared"))},6e4),r=new MutationObserver(()=>{if(n)return;let l=U();l.length>0&&(n=!0,clearTimeout(s),r.disconnect(),i.log(`initHomePage: persistent observer found ${l.length} cards`),ve(l))});r.observe(document.body,{childList:!0,subtree:!0})}function ve(e){let t=ie();if(!t){i.warn("initHomePage: could not identify notebook grid container");return}let o=t.parentElement;if(!o){i.warn("initHomePage: grid has no parent \u2014 cannot inject toolbar");return}let n=c.get("notebooks"),a=c.get("currentAccountScope");ce(o,t),Y(e),P(n),de(document.body),D(n),Z(e,n,a),Ze(t,a),i.log(`initHomePage: done (${e.length} notebooks)`)}async function Je(e,t){i.log(`initNotebookPage: ${e}`);try{await j('main, [role="main"]',12e3)}catch{i.warn("initNotebookPage: main content not found within timeout");return}let o=await M.getNotebook(t,e),n=c.get("notebooks");fe(e,t,o,n),i.log("initNotebookPage: panel injected")}function Ye(){N&&(N.disconnect(),N=null),document.getElementById(C)?.remove(),document.getElementById(O)?.remove(),document.getElementById(I)?.remove(),document.querySelectorAll(".nlm-badge").forEach(e=>e.remove())}function Ze(e,t){N&&N.disconnect();let o=null;N=new MutationObserver(()=>{o&&clearTimeout(o),o=setTimeout(()=>{let n=U(),a=c.get("notebooks");Y(n),P(a),Z(n,a,t),D(a)},400)}),N.observe(e,{childList:!0,subtree:!0})}We();})();
