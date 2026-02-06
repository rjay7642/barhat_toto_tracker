// assets/js/pages/home.js

import {
  openDB,
  getAll,
  getAttendanceByTotoAndDate,
  getAttendanceByMonth,
  getTripsByMonth,
  getExpensesByMonth,
  STORES
} from "../core/db.js";

/* -----------------------------
  helpers
----------------------------- */

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // yyyy-mm-dd
}

function currentMonthStr() {
  const d = new Date();
  return d.toISOString().slice(0, 7); // yyyy-mm
}

function formatMoney(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

/* -----------------------------
  main
----------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  await openDB();
  loadDashboard();
});

async function loadDashboard() {
  const container = document.getElementById("totoList");
  container.innerHTML = "";

  const totos = await getAll(STORES.totos);

  if (!totos.length) {
    container.innerHTML = `
      <div style="color:#9ca3af;font-size:13px;padding:10px;">
        No toto added yet.
      </div>
    `;
    return;
  }

  const today = todayStr();
  const month = currentMonthStr();

  for (const toto of totos) {

    // -----------------------------
    // Today attendance
    // -----------------------------
    const todayAttendance =
      await getAttendanceByTotoAndDate(toto.id, today);

    const present =
      todayAttendance && todayAttendance.present === true;

    // -----------------------------
    // Monthly attendance (run days)
    // -----------------------------
    const monthAttendance =
      await getAttendanceByMonth(toto.id, month);

    const runDays = monthAttendance.filter(a => a.present).length;

    // -----------------------------
    // Trips today
    // -----------------------------
    const monthTrips =
      await getTripsByMonth(toto.id, month);

    const todayTrips =
      monthTrips.filter(t => t.date === today);

    const tripCountToday = todayTrips.reduce((sum, t) => {
      return sum + Number(t.count || 0);
    }, 0);

    // -----------------------------
    // Monthly expense
    // -----------------------------
    const monthExpenses =
      await getExpensesByMonth(toto.id, month);

    const totalExpense = monthExpenses.reduce((sum, e) => {
      return sum + Number(e.amount || 0);
    }, 0);
const unpaid = monthExpenses
  .filter(e => e.paid === false)
  .reduce((s,e)=>s+Number(e.amount||0),0);

    // -----------------------------
    // UI card
    // -----------------------------
    const card = document.createElement("div");
    card.className = "toto-card";

    card.innerHTML = `
      <div class="toto-head">
        <div class="toto-name">${escapeHtml(toto.name)}</div>
        <div class="today-status">
          ${present ? "Present" : "Not marked"}
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="value">${tripCountToday}</div>
          <div class="label">Trips today</div>
        </div>

        <div class="stat">
          <div class="value">${runDays}</div>
          <div class="label">Run days</div>
        </div>

        <div class="stat">
          <div class="value">${formatMoney(totalExpense)}</div>
          <div class="label">This month</div>
        </div>
      </div>
<div class="stat">
    <div class="value">${formatMoney(unpaid)}</div>
    <div class="label">Unpaid</div>
  </div>
      <div class="card-actions">
        <a href="pages/attendance.html?toto=${toto.id}">Mark</a>
        <a href="pages/trips.html?toto=${toto.id}">Trip</a>
        <a href="pages/expenses.html?toto=${toto.id}">Expense</a>
      </div>
    `;

    container.appendChild(card);
  }
}

/* -----------------------------
  tiny safety
----------------------------- */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}
