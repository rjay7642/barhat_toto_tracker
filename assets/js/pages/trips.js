import {
  openDB,
  getAll,
  addItem,
  generateId,
  STORES
} from "../core/db.js";

/* ------------------------
 helpers
------------------------- */

function todayStr(){
  return new Date().toISOString().slice(0,10);
}

function escapeHtml(t){
  const d = document.createElement("div");
  d.textContent = t || "";
  return d.innerHTML;
}

function getParam(name){
  const p = new URLSearchParams(location.search);
  return p.get(name);
}

/* ------------------------
 main
------------------------- */

let allTrips = [];
let allTotos = [];

document.addEventListener("DOMContentLoaded", async () => {
  await openDB();

  const dateInput = document.getElementById("tripDate");
  dateInput.value = todayStr();

  await loadTotos();
  await loadTrips();

  const preselect = getParam("toto");
  if(preselect){
    document.getElementById("totoSelect").value = preselect;
  }

  document.getElementById("saveBtn")
    .addEventListener("click", saveTrip);

  document.getElementById("tripDate")
    .addEventListener("change", renderList);

  document.getElementById("totoSelect")
    .addEventListener("change", renderList);
});

/* ------------------------
 load data
------------------------- */

async function loadTotos(){
  const sel = document.getElementById("totoSelect");
  sel.innerHTML = "";

  allTotos = await getAll(STORES.totos);

  if(!allTotos.length){
    sel.innerHTML = `<option value="">No toto</option>`;
    return;
  }

  for(const t of allTotos){
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  }
}

async function loadTrips(){
  allTrips = await getAll(STORES.trips);
  renderList();
}

/* ------------------------
 render
------------------------- */

function renderList(){

  const list = document.getElementById("tripList");
  list.innerHTML = "";

  const selDate = document.getElementById("tripDate").value;
  const selToto = document.getElementById("totoSelect").value;

  const filtered = allTrips.filter(t => {
    if(t.date !== selDate) return false;
    if(selToto && t.totoId !== selToto) return false;
    return true;
  });

  if(!filtered.length){
    list.innerHTML = `
      <div class="muted">No trips for this date.</div>
    `;
    return;
  }

  for(const tr of filtered){

    const toto = allTotos.find(t => t.id === tr.totoId);

    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div>
        ${escapeHtml(toto ? toto.name : "Unknown")}
      </div>
      <div>
        ${Number(tr.count || 0)} trips
      </div>
    `;

    list.appendChild(div);
  }
}

/* ------------------------
 save
------------------------- */

async function saveTrip(){

  const totoId = document.getElementById("totoSelect").value;
  const date   = document.getElementById("tripDate").value;
  const count  = Number(document.getElementById("tripCount").value);

  if(!totoId){
    alert("Select toto");
    return;
  }

  if(!date){
    alert("Select date");
    return;
  }

  if(!count || count <= 0){
    alert("Enter valid trip count");
    return;
  }

  const record = {
    id: generateId(),
    totoId,
    date,
    count
  };

  await addItem(STORES.trips, record);

  document.getElementById("tripCount").value = "";

  await loadTrips();
}
