import {
  openDB, getAll, addItem, generateId, STORES
} from "../core/db.js";

document.addEventListener("DOMContentLoaded", async ()=>{
  await openDB();
  load();
  document.getElementById("addBtn").onclick = add;
});

async function load(){
  const list = document.getElementById("list");
  list.innerHTML = "";

  const items = await getAll(STORES.locations);

  items.forEach(i=>{
    const d = document.createElement("div");
    d.className="item";
    d.textContent = i.name;
    list.appendChild(d);
  });
}

async function add(){
  const name = document.getElementById("name").value.trim();
  if(!name) return;

  await addItem(STORES.locations,{
    id: generateId(),
    name
  });

  document.getElementById("name").value="";
  load();
}
