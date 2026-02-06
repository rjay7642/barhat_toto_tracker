import {
  openDB,
  getAll,
  addItem,
  putItem,
  generateId,
  STORES
} from "../core/db.js";

/* -----------------------
 helpers
------------------------ */

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

/* -----------------------
 main
------------------------ */

let allExpenses = [];
let allTotos = [];

document.addEventListener("DOMContentLoaded", async () => {

  await openDB();

  document.getElementById("expDate").value = todayStr();

  await loadTotos();
  await loadExpenses();

  const pre = getParam("toto");
  if(pre){
    document.getElementById("totoSelect").value = pre;
  }

  document.getElementById("saveBtn")
    .addEventListener("click", saveExpense);

  document.getElementById("expDate")
    .addEventListener("change", renderList);

  document.getElementById("totoSelect")
    .addEventListener("change", renderList);
});

/* -----------------------
 load
------------------------ */

async function loadTotos(){

  const sel = document.getElementById("totoSelect");
  sel.innerHTML = "";

  allTotos = await getAll(STORES.totos);

  // 👇 very important
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = "All Totos";
  sel.appendChild(allOpt);

  if(!allTotos.length){
    return;
  }

  for(const t of allTotos){
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  }
}


async function loadExpenses(){
  allExpenses = await getAll(STORES.expenses);
  renderList();
}

/* -----------------------
 render
------------------------ */

function renderList(){

  const list = document.getElementById("expenseList");
  list.innerHTML = "";

  const selDate = document.getElementById("expDate").value;
  const selToto = document.getElementById("totoSelect").value;

  const filtered = allExpenses.filter(e => {
    if(e.date !== selDate) return false;
    if(selToto && e.totoId !== selToto) return false;
    return true;
  });

  if(!filtered.length){
    list.innerHTML = `
      <div class="small">No expenses for this date.</div>
    `;
    return;
  }

  for(const ex of filtered){

    const toto = allTotos.find(t => t.id === ex.totoId);

    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div>
        <div>${escapeHtml(toto ? toto.name : "Unknown")}</div>
        <div class="small">
          ${escapeHtml(ex.category || "")}
          • ${ex.paid ? "Paid" : "Unpaid"}
        </div>
      </div>
      <div style="text-align:right">
        ₹${Number(ex.amount || 0).toLocaleString("en-IN")}
        ${
          ex.paid ? "" :
          `<div>
            <button data-id="${ex.id}"
              style="margin-top:4px;font-size:11px;">
              Mark paid
            </button>
          </div>`
        }
      </div>
    `;

    const btn = div.querySelector("button");
    if(btn){
      btn.onclick = async () => {

        const id = btn.getAttribute("data-id");
        const item = allExpenses.find(x => x.id === id);
        if(!item) return;

        item.paid = true;
        item.paidAt = new Date().toISOString();

        await putItem(STORES.expenses, item);
        await loadExpenses();
      };
    }

    list.appendChild(div);
  }
}

/* -----------------------
 save
------------------------ */

async function saveExpense(){

  const totoId = document.getElementById("totoSelect").value;
  const date   = document.getElementById("expDate").value;
  const cat    = document.getElementById("category").value;
  const amt    = Number(document.getElementById("amount").value);
  const note   = document.getElementById("note").value.trim();

  const status = document.getElementById("paidStatus").value;

  if(!totoId){
    alert("Select toto");
    return;
  }

  if(!date){
    alert("Select date");
    return;
  }

  if(!amt || amt <= 0){
    alert("Enter valid amount");
    return;
  }

  const record = {
    id: generateId(),
    totoId,
    date,
    category: cat,
    amount: amt,
    note,
    paid: status === "paid",
    paidAt: status === "paid" ? new Date().toISOString() : null
  };

  await addItem(STORES.expenses, record);

  document.getElementById("amount").value = "";
  document.getElementById("note").value = "";

  await loadExpenses();
}
