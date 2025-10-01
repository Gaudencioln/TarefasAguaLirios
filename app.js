// PWA Tarefas Agua Lirios v2.1.3
const loginView = document.getElementById('loginView');
const adminView = document.getElementById('adminView');
const funcView = document.getElementById('funcView');

let funcionarios = JSON.parse(localStorage.getItem('funcionarios')||'[]');
let tarefas = JSON.parse(localStorage.getItem('tarefas')||'[]');
let usuarioAtual = null;

// monta tela login
function renderLogin(){
  loginView.innerHTML = `
    <div class="card">
      <h2>Entrar</h2>
      <div>
        <button id="btnTabAdmin">Admin</button>
        <button id="btnTabFunc">Funcionário</button>
      </div>
      <div id="adminBox">
        <input id="adminUser" placeholder="Usuário" value="admin"/>
        <input id="adminPass" type="password" placeholder="Senha"/>
        <button id="btnAdminEnter" class="primary">Entrar como Admin</button>
      </div>
      <div id="funcBox" style="display:none">
        <select id="funcSelect">${funcionarios.map(f=>`<option>${f}</option>`)}</select>
        <button id="btnFuncEnter" class="primary">Entrar</button>
      </div>
    </div>`;
  document.getElementById('btnTabAdmin').onclick=()=>{document.getElementById('adminBox').style.display='block';document.getElementById('funcBox').style.display='none';};
  document.getElementById('btnTabFunc').onclick=()=>{document.getElementById('adminBox').style.display='none';document.getElementById('funcBox').style.display='block';};
  document.getElementById('btnAdminEnter').onclick=()=>{
    const u=document.getElementById('adminUser').value;
    const p=document.getElementById('adminPass').value;
    if(u==='admin' && p==='975321'){usuarioAtual={tipo:'admin'};showView('admin');renderAdmin();}else{alert('Senha incorreta');}
  };
  document.getElementById('btnFuncEnter').onclick=()=>{
    const f=document.getElementById('funcSelect').value;
    if(f){usuarioAtual={tipo:'func',nome:f};showView('func');renderFunc();}
  };
}

// troca view
function showView(v){
  [loginView,adminView,funcView].forEach(sec=>sec.classList.remove('active'));
  if(v==='login') loginView.classList.add('active');
  if(v==='admin') adminView.classList.add('active');
  if(v==='func') funcView.classList.add('active');
}

// render admin
function renderAdmin(){
  adminView.innerHTML = `
    <div class="card">
      <h2>Funcionários</h2>
      <input id="newFunc" placeholder="Novo funcionário"/>
      <button id="btnAddFunc" class="primary">Adicionar</button>
      <ul>${funcionarios.map(f=>`<li>${f}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <h2>Criar Tarefa</h2>
      <input id="taskTitle" placeholder="Título"/><br>
      <textarea id="taskDesc" placeholder="Descrição"></textarea><br>
      <select id="taskOwner">${funcionarios.map(f=>`<option>${f}</option>`)}</select><br>
      <input id="taskDue" type="date"/><br>
      <button id="btnAddTask" class="primary">Salvar</button>
    </div>
    <div class="card">
      <h2>Tarefas</h2>
      ${tarefas.map((t,i)=>`<div class="card"><b>${t.titulo}</b><br>${t.responsavel} - ${t.status}<br><button onclick="delTask(${i})">Excluir</button></div>`).join('')}
    </div>`;
  document.getElementById('btnAddFunc').onclick=()=>{
    const nf=document.getElementById('newFunc').value;
    if(nf){funcionarios.push(nf);localStorage.setItem('funcionarios',JSON.stringify(funcionarios));renderAdmin();}
  };
  document.getElementById('btnAddTask').onclick=()=>{
    const t={titulo:document.getElementById('taskTitle').value,desc:document.getElementById('taskDesc').value,responsavel:document.getElementById('taskOwner').value,prazo:document.getElementById('taskDue').value,status:'A Fazer'};
    tarefas.push(t);localStorage.setItem('tarefas',JSON.stringify(tarefas));renderAdmin();
  };
}

function delTask(i){tarefas.splice(i,1);localStorage.setItem('tarefas',JSON.stringify(tarefas));renderAdmin();}

// render func
function renderFunc(){
  const tfs = tarefas.filter(t=>t.responsavel===usuarioAtual.nome);
  funcView.innerHTML = `<div class="card"><h2>Olá, ${usuarioAtual.nome}</h2>${tfs.map((t,i)=>`<div class="card"><b>${t.titulo}</b><br>${t.desc}<br>Status: ${t.status}<br><button onclick="markDone('${t.titulo}')">Concluir</button></div>`).join('')}</div>`;
}

function markDone(titulo){
  const t = tarefas.find(x=>x.titulo===titulo && x.responsavel===usuarioAtual.nome);
  if(t){t.status='Feito';localStorage.setItem('tarefas',JSON.stringify(tarefas));renderFunc();}
}

renderLogin();
