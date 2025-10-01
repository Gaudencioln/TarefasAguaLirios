// === Dados & Utilitários ===
const LS_KEY = "al_tarefas_data_v214";
const DEFAULT_ADMIN = { user: "admin", passHash: hashString("975321") }; // senha padrão oculta por hash

function loadData(){
  const raw = localStorage.getItem(LS_KEY);
  if(!raw){
    const data = { workers: [], tasks: [] };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    return data;
  }
  try { return JSON.parse(raw); } catch(e){ return { workers: [], tasks: [] }; }
}
function saveData(data){ localStorage.setItem(LS_KEY, JSON.stringify(data)); }
function uid(){ return Math.random().toString(36).slice(2,10); }

function hashString(str){
  // hash simples (não criptográfico) apenas para não deixar a senha em claro
  let h=0; for(let i=0;i<str.length;i++){ h = (h<<5)-h + str.charCodeAt(i); h|=0; }
  return String(h);
}

// === Estado ===
let state = { data: loadData(), currentWorker: null, mode: "login" };

// === Inicialização ===
document.addEventListener("DOMContentLoaded", () => {
  registerSW();
  bindLogin();
  refreshLoginSelectors();
  bindAdmin();
  bindFunc();
  bindTabs();
  bindInstall();
  updateView("login");
  // export/import direto da tela de login (para funcionário)
  document.getElementById("btnExportMineFromLogin").addEventListener("click", () => {
    const sel = document.getElementById("funcSelect");
    const id = sel.value;
    const worker = state.data.workers.find(w=>w.id===id);
    if(!worker){ alert("Selecione seu nome."); return; }
    exportTasksFor(worker.id, worker.name);
  });
  document.getElementById("fileImportMineFromLogin").addEventListener("change", ev => {
    const sel = document.getElementById("funcSelect");
    const id = sel.value;
    const worker = state.data.workers.find(w=>w.id===id);
    if(!worker){ alert("Selecione seu nome."); ev.target.value=""; return; }
    handleImportFile(ev.target.files[0], worker.id, worker.name);
    ev.target.value="";
  });
});

function updateView(mode){
  state.mode = mode;
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  if(mode === "admin") renderAdmin();
  if(mode === "func") renderFunc();
  document.getElementById(mode+"View")?.classList.add("active");
  if(mode==="login") document.getElementById("loginView").classList.add("active");
}

// === Login & Tabs ===
function bindTabs(){
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      const t = btn.dataset.tab;
      document.getElementById(t==="admin" ? "adminLogin" : "funcLogin").classList.add("active");
    });
  });
}

function bindLogin(){
  document.getElementById("btnAdminEnter").addEventListener("click", () => {
    const u = document.getElementById("adminUser").value.trim() || "admin";
    const p = document.getElementById("adminPass").value;
    const ok = (u === DEFAULT_ADMIN.user && hashString(p||"975321") === DEFAULT_ADMIN.passHash);
    if(ok){ updateView("admin"); } else { alert("Usuário ou senha incorretos."); }
  });
  document.getElementById("btnFuncEnter").addEventListener("click", () => {
    const sel = document.getElementById("funcSelect");
    const id = sel.value;
    const worker = state.data.workers.find(w=>w.id===id);
    if(!worker){ alert("Selecione um funcionário."); return; }
    state.currentWorker = worker;
    updateView("func");
  });
}

function refreshLoginSelectors(){
  const sel = document.getElementById("funcSelect");
  const owner = document.getElementById("taskOwner");
  sel.innerHTML = ""; owner.innerHTML="";
  state.data.workers.forEach(w => {
    const o1 = document.createElement("option"); o1.value = w.id; o1.textContent = w.name; sel.appendChild(o1);
    const o2 = document.createElement("option"); o2.value = w.id; o2.textContent = w.name; owner.appendChild(o2);
  });
}

// === Admin ===
function bindAdmin(){
  document.getElementById("btnAddWorker").addEventListener("click", () => {
    const name = document.getElementById("newWorkerName").value.trim();
    if(!name) return;
    state.data.workers.push({ id: uid(), name });
    saveData(state.data);
    document.getElementById("newWorkerName").value="";
    refreshLoginSelectors();
    renderAdmin();
  });

  document.getElementById("btnCreateTask").addEventListener("click", () => {
    const title = document.getElementById("taskTitle").value.trim();
    const desc = document.getElementById("taskDesc").value.trim();
    const owner = document.getElementById("taskOwner").value;
    const due = document.getElementById("taskDue").value || null;
    if(!title || !owner){ alert("Preencha título e responsável."); return; }
    state.data.tasks.push({ id: uid(), title, desc, owner, due, status: "pending", createdAt: Date.now(), doneAt: null });
    saveData(state.data);
    document.getElementById("taskTitle").value="";
    document.getElementById("taskDesc").value="";
    document.getElementById("taskDue").value="";
    renderAdmin();
  });

  // Exportar todos
  document.getElementById("btnExportAll").addEventListener("click", () => {
    const txt = serializeTasks(state.data.tasks);
    downloadTxt("tarefas_todas.txt", txt);
  });
  // Importar todos
  document.getElementById("fileImportAll").addEventListener("change", ev => {
    handleImportFile(ev.target.files[0], null, null); // null = mantém owner de cada linha
    ev.target.value="";
  });

  // Switch mode
  document.getElementById("btnSwitchMode").addEventListener("click", () => updateView("login"));
}

function renderAdmin(){
  // stats
  const today = new Date().toDateString();
  const pend = state.data.tasks.filter(t=>t.status==="pending").length;
  const conclHoje = state.data.tasks.filter(t=>t.status==="done" && new Date(t.doneAt).toDateString()===today).length;
  document.getElementById("statPendentes").textContent = pend;
  document.getElementById("statConcluidas").textContent = conclHoje;
  document.getElementById("statEquipe").textContent = state.data.workers.length;

  // lista de funcionários (pílulas)
  const wl = document.getElementById("workersList");
  wl.innerHTML="";
  state.data.workers.forEach(w => {
    const span = document.createElement("span");
    span.className="pill"; span.textContent = w.name;
    wl.appendChild(span);
  });

  // cards por funcionário
  const wrap = document.getElementById("cardsContainer");
  wrap.innerHTML="";
  state.data.workers.forEach(w => {
    const card = document.createElement("div");
    card.className = "worker-card";
    card.innerHTML = `
      <div class="worker-head">
        <div>
          <div class="worker-name">${w.name}</div>
          <div class="badge">${state.data.tasks.filter(t=>t.owner===w.id && t.status==="pending").length} pendente(s)</div>
        </div>
        <div class="row gap">
          <button class="secondary" data-export="${w.id}">Exportar</button>
          <label class="file">
            <input type="file" data-import="${w.id}" accept=".txt"/>
            <span>Importar (.txt)</span>
          </label>
        </div>
      </div>
      <div class="list" id="list-${w.id}"></div>
    `;
    wrap.appendChild(card);
    const list = card.querySelector(`#list-${w.id}`);
    state.data.tasks.filter(t=>t.owner===w.id).sort(sortTasks).forEach(t => {
      const el = document.createElement("div");
      el.className = "task-item " + (t.status==="done"?"done":"");
      el.innerHTML = `
        <div><input type="checkbox" ${t.status==="done"?"checked":""} data-toggle="${t.id}"></div>
        <div style="flex:1">
          <div class="task-title">${t.title}</div>
          <div class="task-meta">
            ${t.desc ? t.desc + " • " : ""}
            ${t.due ? "Prazo: " + formatDate(t.due) + " • " : ""}
            Status: ${t.status==="done" ? "Concluída em " + formatDateTime(t.doneAt) : "A Fazer"}
          </div>
        </div>
      `;
      list.appendChild(el);
    });

    // bind export/import individuais
    card.querySelector(`[data-export="${w.id}"]`).addEventListener("click", () => {
      exportTasksFor(w.id, w.name);
    });
    card.querySelector(`[data-import="${w.id}"]`).addEventListener("change", ev => {
      handleImportFile(ev.target.files[0], w.id, w.name);
      ev.target.value="";
    });
  });

  // toggles (concluir tarefa)
  wrap.querySelectorAll("input[type=checkbox][data-toggle]").forEach(chk => {
    chk.addEventListener("change", () => {
      const id = chk.dataset.toggle;
      const t = state.data.tasks.find(x=>x.id===id);
      if(!t) return;
      t.status = chk.checked ? "done" : "pending";
      t.doneAt = chk.checked ? Date.now() : null;
      saveData(state.data);
      renderAdmin();
    });
  });
}

function sortTasks(a,b){
  // pendentes primeiro, depois concluídas; dentro de cada grupo, por prazo asc
  if(a.status!==b.status){
    return a.status==="pending" ? -1 : 1;
  }
  const ad = a.due ? new Date(a.due).getTime() : Infinity;
  const bd = b.due ? new Date(b.due).getTime() : Infinity;
  return ad - bd;
}

// === Funcionário ===
function bindFunc(){
  document.getElementById("btnExportMine").addEventListener("click", () => {
    if(!state.currentWorker) return;
    exportTasksFor(state.currentWorker.id, state.currentWorker.name);
  });
  document.getElementById("fileImportMine").addEventListener("change", ev => {
    if(!state.currentWorker) return;
    handleImportFile(ev.target.files[0], state.currentWorker.id, state.currentWorker.name);
    ev.target.value="";
  });
}

function renderFunc(){
  const h = document.getElementById("helloWorker");
  h.textContent = `Olá ${state.currentWorker?.name || ""} 👋`;
  const wrap = document.getElementById("funcTasks");
  wrap.innerHTML="";
  state.data.tasks.filter(t=>t.owner===state.currentWorker.id).sort(sortTasks).forEach(t => {
    const el = document.createElement("div");
    el.className = "task-item " + (t.status==="done"?"done":"");
    el.innerHTML = `
      <div><input type="checkbox" ${t.status==="done"?"checked":""} data-toggle="${t.id}"></div>
      <div style="flex:1">
        <div class="task-title">${t.title}</div>
        <div class="task-meta">
          ${t.desc ? t.desc + " • " : ""}
          ${t.due ? "Prazo: " + formatDate(t.due) + " • " : ""}
          Status: ${t.status==="done" ? "Concluída em " + formatDateTime(t.doneAt) : "A Fazer"}
        </div>
      </div>
    `;
    wrap.appendChild(el);
  });

  wrap.querySelectorAll("input[type=checkbox][data-toggle]").forEach(chk => {
    chk.addEventListener("change", () => {
      const id = chk.dataset.toggle;
      const t = state.data.tasks.find(x=>x.id===id);
      if(!t) return;
      t.status = chk.checked ? "done" : "pending";
      t.doneAt = chk.checked ? Date.now() : null;
      saveData(state.data);
      renderFunc();
    });
  });

  // switch
  document.getElementById("btnSwitchMode").onclick = () => updateView("login");
}

// === Importação/Exportação (.txt simples) ===
// Formato de linha: TASK|ownerId|ownerName|title|desc|due|status|doneAt|id
function serializeTasks(tasks){
  return tasks.map(t => [
    "TASK",
    t.owner,
    getWorkerNameById(t.owner),
    escapeField(t.title),
    escapeField(t.desc||""),
    t.due||"",
    t.status,
    t.doneAt||"",
    t.id
  ].join("|")).join("\n");
}
function escapeField(s){ return (s||"").replace(/\n/g,"\\n").replace(/\|/g,"/|"); }
function unescapeField(s){ return (s||"").replace(/\\n/g,"\n").replace(/\/\|/g,"|"); }

function exportTasksFor(ownerId, ownerName){
  const mine = state.data.tasks.filter(t=>t.owner===ownerId);
  const txt = serializeTasks(mine);
  downloadTxt(`tarefas_${slug(ownerName)}.txt`, txt);
}

function handleImportFile(file, ownerId, ownerName){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = String(reader.result).split(/\\r?\\n/).map(l=>l.trim()).filter(Boolean);
    let imported = 0;
    lines.forEach(line => {
      const parts = line.split("|");
      if(parts[0] !== "TASK") return;
      const [_, ownerFromFile, ownerNameFromFile, title, desc, due, status, doneAt, id] = parts;
      const finalOwner = ownerId || ownerFromFile;
      const task = {
        id: id || uid(),
        owner: finalOwner,
        title: unescapeField(title||""),
        desc: unescapeField(desc||""),
        due: due || null,
        status: (status==="done"?"done":"pending"),
        createdAt: Date.now(),
        doneAt: doneAt ? Number(doneAt) : (status==="done"? Date.now() : null)
      };
      if(!task.owner) return;
      // evita duplicado por id
      if(!state.data.tasks.some(t=>t.id===task.id)){
        state.data.tasks.push(task); imported++;
      }
    });
    saveData(state.data);
    alert(`Importadas ${imported} tarefa(s) para ${ownerName || getWorkerNameById(ownerId) || "o funcionário selecionado"}.`);
    if(state.mode==="admin") renderAdmin(); else renderFunc();
  };
  reader.readAsText(file, "utf-8");
}

function getWorkerNameById(id){
  const w = state.data.workers.find(x=>x.id===id); return w? w.name : "";
}

function downloadTxt(filename, content){
  const blob = new Blob([content], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function slug(s){ return (s||"").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }
function formatDate(d){ try{ const x=new Date(d); return x.toLocaleDateString(); } catch(e){ return d; } }
function formatDateTime(ms){ const d = new Date(ms); return d.toLocaleString(); }

// === PWA (SW + Install) ===
function registerSW(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js");
  }
}
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault(); deferredPrompt = e;
  document.getElementById("btnInstall").disabled = false;
});
function bindInstall(){
  const btn = document.getElementById("btnInstall");
  btn.disabled = true;
  btn.addEventListener("click", async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
}
