import {
  openDB,
  getAll,
  addItem,
  getAttendanceByTotoAndDate,
  generateId,
  STORES
} from "../core/db.js";

/* -------------------------
 helpers
-------------------------- */

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(t) {
  const d = document.createElement("div");
  d.textContent = t || "";
  return d.innerHTML;
}

/* -------------------------
 main
-------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  await openDB();
  loadAttendance();
});

async function loadAttendance() {
  const wrap = document.getElementById("attendanceList");
  wrap.innerHTML = "";

  const totos = await getAll(STORES.totos);
  const today = todayStr();

  if (!totos.length) {
    wrap.innerHTML = `
      <div style="color:#9ca3af;font-size:13px;">
        No toto added yet.
      </div>
    `;
    return;
  }

  for (const toto of totos) {

    const already = await getAttendanceByTotoAndDate(toto.id, today);

    const card = document.createElement("div");
    card.className = "card";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="name">${escapeHtml(toto.name)}</div>
      <div class="status">
        ${already
          ? (already.present ? "Marked present" : "Marked absent")
          : "Not marked yet"}
      </div>
    `;

    const right = document.createElement("div");
    right.className = "actions";

    if (already) {
      const doneBtn = document.createElement("button");
      doneBtn.className = "done";
      doneBtn.textContent = "Done";
      right.appendChild(doneBtn);
    } else {

      const presentBtn = document.createElement("button");
      presentBtn.className = "present";
      presentBtn.textContent = "Present";

      const absentBtn = document.createElement("button");
      absentBtn.className = "absent";
      absentBtn.textContent = "Absent";

      presentBtn.onclick = async () => {
        await mark(toto.id, true);
      };

      absentBtn.onclick = async () => {
        await mark(toto.id, false);
      };

      right.appendChild(presentBtn);
      right.appendChild(absentBtn);
    }

    card.appendChild(left);
    card.appendChild(right);
    wrap.appendChild(card);
  }
}

/* -------------------------
 save
-------------------------- */

async function mark(totoId, present) {

  const record = {
    id: generateId(),
    totoId,
    date: todayStr(),
    present: !!present
  };

  await addItem(STORES.attendance, record);

  // refresh screen
  loadAttendance();
}
