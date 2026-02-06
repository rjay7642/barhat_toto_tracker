import {
  openDB,
  getAll,
  getAttendanceByMonth,
  getTripsByMonth,
  getExpensesByMonth,
  deleteHistoryByDate,
  deleteTotoCompletely,
  deleteById,
  STORES
} from "../core/db.js";


/* ---------------- helpers ---------------- */

function currentMonth(){
  return new Date().toISOString().slice(0,7);
}

function money(n){
  return "₹" + Number(n||0).toLocaleString("en-IN");
}

/* ---------------- main ---------------- */

let totos = [];

document.addEventListener("DOMContentLoaded", async ()=>{

  await openDB();

  totos = await getAll(STORES.totos);

  document.getElementById("monthPicker").value = currentMonth();

  fillTotoSelect();
  loadSummary();

  document.getElementById("monthPicker")
    .addEventListener("change", loadSummary);

  document.getElementById("csvBtn")
    .addEventListener("click", exportCSV);

  document.getElementById("pdfBtn")
    .addEventListener("click", exportPDF);

  document.getElementById("deleteDateBtn")
    .addEventListener("click", deleteDay);

  document.getElementById("deleteTotoBtn")
    .addEventListener("click", deleteToto);

  document.getElementById("deleteExpenseBtn")
    .addEventListener("click", deleteExpensesByToto);
});

/* ---------------- dropdowns ---------------- */

function fillTotoSelect(){

  const sel1 = document.getElementById("deleteTotoSelect");
  const sel2 = document.getElementById("deleteExpenseToto");

  sel1.innerHTML = "";
  sel2.innerHTML = "";

  for(const t of totos){

    const o1 = document.createElement("option");
    o1.value = t.id;
    o1.textContent = t.name;
    sel1.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = t.id;
    o2.textContent = t.name;
    sel2.appendChild(o2);
  }
}

/* ---------------- summary ---------------- */

async function loadSummary(){

  const month = document.getElementById("monthPicker").value;
  const list  = document.getElementById("summaryList");

  list.innerHTML = "";
  if(!month) return;

  for(const t of totos){

    const att = await getAttendanceByMonth(t.id, month);
    const runDays = att.filter(a=>a.present).length;

    const trips = await getTripsByMonth(t.id, month);
    const totalTrips = trips.reduce((s,x)=>s+Number(x.count||0),0);

    const exp = await getExpensesByMonth(t.id, month);
    const totalExp = exp.reduce((s,x)=>s+Number(x.amount||0),0);

    const unpaid = exp
      .filter(e=>e.paid === false)
      .reduce((s,x)=>s+Number(x.amount||0),0);

    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div>
        <div>${t.name}</div>
        <div class="muted">
          Run days: ${runDays} |
          Trips: ${totalTrips} |
          Unpaid: ${money(unpaid)}
        </div>
      </div>
      <div>${money(totalExp)}</div>
    `;

    list.appendChild(div);
  }
}

/* ---------------- CSV ---------------- */

async function exportCSV(){

  const exp   = await getAll(STORES.expenses);
  const trips = await getAll(STORES.trips);
  const att   = await getAll(STORES.attendance);

  const totoMap = {};
  totos.forEach(t => totoMap[t.id] = t.name);

  const rows = [];

  rows.push([
    "type",
    "toto_name",
    "date",
    "value",
    "category",
    "status"
  ]);

  att.forEach(a=>{
    rows.push([
      "attendance",
      totoMap[a.totoId] || "",
      a.date,
      a.present ? "present" : "absent",
      "",
      ""
    ]);
  });

  trips.forEach(t=>{
    rows.push([
      "trip",
      totoMap[t.totoId] || "",
      t.date,
      t.count,
      "",
      ""
    ]);
  });

  exp.forEach(e=>{
    rows.push([
      "expense",
      totoMap[e.totoId] || "",
      e.date,
      e.amount,
      e.category || "",
      e.paid ? "paid" : "unpaid"
    ]);
  });

  const csv = rows.map(r =>
    r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")
  ).join("\n");

  const blob = new Blob(
    ["\ufeff" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "toto-report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- PDF (invoice style, daily) ---------------- */

async function exportPDF(){

  const month = document.getElementById("monthPicker").value;
  if(!month) return alert("Select month");

  let rows = "";

  for(const t of totos){

    const att = await getAttendanceByMonth(t.id, month);
    const exp = await getExpensesByMonth(t.id, month);

    const dates = new Set([
      ...att.map(a=>a.date),
      ...exp.map(e=>e.date)
    ]);

    const sorted = Array.from(dates).sort();

    for(const d of sorted){

      const ran = att.find(a=>a.date===d && a.present);

      const dayExp = exp.filter(e=>e.date===d);

      if(!ran && !dayExp.length) continue;

      const paidSum = dayExp
        .filter(e=>e.paid)
        .reduce((s,e)=>s+Number(e.amount||0),0);

      const unpaidSum = dayExp
        .filter(e=>!e.paid)
        .reduce((s,e)=>s+Number(e.amount||0),0);

      rows += `
        <tr>
          <td>${t.name}</td>
          <td>${d}</td>
          <td style="text-align:center">${ran ? "Yes" : "No"}</td>
          <td style="text-align:right">₹${paidSum.toLocaleString("en-IN")}</td>
          <td style="text-align:right">₹${unpaidSum.toLocaleString("en-IN")}</td>
        </tr>
      `;
    }
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Toto Daily Invoice</title>
<style>
body{font-family:Arial;padding:25px;color:#111}
.header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  border-bottom:2px solid #222;
  padding-bottom:8px;
  margin-bottom:15px;
}
.brand{font-size:18px;font-weight:bold}
.meta{font-size:12px;text-align:right}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #ccc;padding:6px}
th{background:#f3f4f6}
.footer{margin-top:18px;font-size:11px;color:#555;text-align:center}
</style>
</head>
<body>

<div class="header">
  <div class="brand">Toto Manager – Daily Invoice</div>
  <div class="meta">
    Month: ${month}<br>
    Generated: ${new Date().toLocaleString()}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Toto</th>
      <th>Date</th>
      <th>Ran</th>
      <th>Paid</th>
      <th>Unpaid</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

<div class="footer">
  Made with Jaya Technology
</div>

</body>
</html>
`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

/* ---------------- admin delete ---------------- */

async function deleteDay(){

  const d = document.getElementById("deleteDate").value;
  if(!d) return alert("Select date");

  if(!confirm("Delete all history of this date?")) return;

  await deleteHistoryByDate(d);
  alert("Deleted");

  loadSummary();
}

async function deleteExpensesByToto(){

  const totoId =
    document.getElementById("deleteExpenseToto").value;

  const date =
    document.getElementById("deleteExpenseDate").value;

  if(!totoId){
    alert("Select toto");
    return;
  }

  if(!date){
    alert("Select date");
    return;
  }

  if(!confirm("Delete expenses of this toto for selected date?"))
    return;

  const all = await getAll(STORES.expenses);

  const targets = all.filter(e =>
    e.totoId === totoId && e.date === date
  );

  if(!targets.length){
    alert("No expenses found for this toto on this date");
    return;
  }

  for(const ex of targets){
    await deleteById(STORES.expenses, ex.id);
  }

  alert("Selected expenses deleted");

  loadSummary();
}
async function deleteToto(){

  const id = document.getElementById("deleteTotoSelect").value;
  if(!id){
    alert("Select toto");
    return;
  }

  if(!confirm("Delete this toto and all its data?")) return;

  await deleteTotoCompletely(id);

  totos = await getAll(STORES.totos);
  fillTotoSelect();
  loadSummary();

  alert("Toto deleted");
}
