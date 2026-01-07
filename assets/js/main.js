(function () {
  const WA_NUMBER = "50664202291";

  function buildWaLink(service) {
    const serviceLine = service ? `Servicio: ${service}. ` : "";
    const msg = `Hola Tracy, quiero agendar una cita. ${serviceLine}Mi nombre es ________. Puedo: ________ o ________. ¿Qué espacios tenés disponibles?`;
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
  }

  // Botones WhatsApp
  document.querySelectorAll("[data-wa]").forEach((el) => {
    const service = el.getAttribute("data-service") || "";
    el.setAttribute("href", buildWaLink(service));
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  });

  // Año footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Menú móvil
  const navBtn = document.getElementById("navBtn");
  const nav = document.getElementById("nav");
  if (navBtn && nav) {
    navBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        navBtn.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (e) => {
      const inside = nav.contains(e.target) || navBtn.contains(e.target);
      if (!inside) {
        nav.classList.remove("is-open");
        navBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Galería modal
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modalImg");

  function openModal(src) {
    if (!modal || !modalImg) return;
    modalImg.src = src;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  const gallery = document.getElementById("gallery");
  if (gallery) {
    gallery.querySelectorAll("[data-img]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.getAttribute("data-img")));
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target && e.target.matches("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  // Copiar mensaje recomendado
  const copyBtn = document.getElementById("copyMsg");
  const waTemplate = document.getElementById("waTemplate");
  if (copyBtn && waTemplate) {
    copyBtn.addEventListener("click", async () => {
      const text = waTemplate.innerText.trim();
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "Copiado";
        setTimeout(() => (copyBtn.textContent = "Copiar mensaje"), 1400);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        copyBtn.textContent = "Copiado";
        setTimeout(() => (copyBtn.textContent = "Copiar mensaje"), 1400);
      }
    });
  }
})();

/* =========================================================
   BOOKING: fecha + hora + servicios -> WhatsApp
========================================================= */

// Ajustes
const WA_NUMBER_BOOKING = "50664202291";

// Horario por día (0=Dom, 1=Lun, ... 6=Sáb)
const HOURS_BY_DAY = {
  1: { start: "06:00", end: "16:00" }, // Lunes
  2: { start: "09:00", end: "19:00" }, // Martes
  3: null,                             // Miércoles cerrado
  4: { start: "06:00", end: "16:00" }, // Jueves
  5: { start: "09:00", end: "19:00" }, // Viernes
  6: { start: "06:00", end: "14:00" }, // Sábado
  0: null                              // Domingo cerrado
};

// Intervalo de disponibilidad (en minutos)
const SLOT_MINUTES = 30;

// Helpers
function pad2(n){ return String(n).padStart(2, "0"); }
function timeToMinutes(hhmm){
  const [h,m] = hhmm.split(":").map(Number);
  return h*60 + m;
}
function minutesToTime(min){
  const h = Math.floor(min/60);
  const m = min % 60;
  return `${pad2(h)}:${pad2(m)}`;
}
function formatDateCR(yyyyMmDd){
  // input: "2026-01-06"
  const [y,m,d] = yyyyMmDd.split("-");
  return `${d}/${m}/${y}`;
}
function dayNameEs(day){
  return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][day];
}
function buildBookingWaMsg({name, date, time, services}){
  const s = services.length ? services.join(", ") : "Por definir (necesito recomendación)";
  const who = name ? `Mi nombre es ${name}. ` : "";
  return `Hola Tracy, quiero agendar una cita. ${who}Fecha: ${formatDateCR(date)} (${dayNameEs(new Date(date+"T00:00:00").getDay())}). Hora: ${time}. Servicio(s): ${s}. ¿Tenés disponible?`;
}
function openWa(msg){
  const url = `https://wa.me/${WA_NUMBER_BOOKING}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// DOM
const serviceChips = document.getElementById("serviceChips");
const bkDate = document.getElementById("bkDate");
const bkTime = document.getElementById("bkTime");
const bkName = document.getElementById("bkName");
const bkConfirm = document.getElementById("bkConfirm");
const bkClear = document.getElementById("bkClear");
const bkPreview = document.getElementById("bkPreview");

let selectedServices = new Set();

// Si la sección no existe, no ejecuta nada
if (serviceChips && bkDate && bkTime && bkConfirm && bkClear && bkPreview) {

  // Configurar mínimo: hoy
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = pad2(today.getMonth()+1);
  const dd = pad2(today.getDate());
  bkDate.min = `${yyyy}-${mm}-${dd}`;

  // Selección de servicios (chips)
  serviceChips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;

    const service = btn.getAttribute("data-service");
    if (!service) return;

    if (selectedServices.has(service)) {
      selectedServices.delete(service);
      btn.classList.remove("is-active");
    } else {
      selectedServices.add(service);
      btn.classList.add("is-active");
    }
    updatePreview();
  });

  // Cuando cambie la fecha: generar horas disponibles
  bkDate.addEventListener("change", () => {
    populateTimes();
    updatePreview();
  });

  // Cuando cambie la hora o nombre: actualizar preview
  bkTime.addEventListener("change", updatePreview);
  bkName.addEventListener("input", updatePreview);

  // Limpiar
  bkClear.addEventListener("click", () => {
    selectedServices.clear();
    serviceChips.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
    bkDate.value = "";
    bkTime.innerHTML = `<option value="">Seleccioná primero una fecha</option>`;
    bkName.value = "";
    bkPreview.textContent = "";
  });

  // Confirmar
  bkConfirm.addEventListener("click", () => {
    const date = bkDate.value;
    const time = bkTime.value;
    const name = (bkName.value || "").trim();
    const services = Array.from(selectedServices);

    // Validaciones
    if (!date) {
      bkPreview.textContent = "Seleccioná una fecha para ver las horas disponibles.";
      bkDate.focus();
      return;
    }

    const day = new Date(date + "T00:00:00").getDay();
    if (!HOURS_BY_DAY[day]) {
      bkPreview.textContent = "Ese día el salón está CERRADO. Elegí otra fecha.";
      bkDate.focus();
      return;
    }

    if (!time) {
      bkPreview.textContent = "Seleccioná una hora disponible.";
      bkTime.focus();
      return;
    }

    const msg = buildBookingWaMsg({ name, date, time, services });
    openWa(msg);
  });

  // Genera slots según día
  function populateTimes() {
    const date = bkDate.value;
    if (!date) return;

    const day = new Date(date + "T00:00:00").getDay();
    const schedule = HOURS_BY_DAY[day];

    if (!schedule) {
      bkTime.innerHTML = `<option value="">Cerrado (${dayNameEs(day)})</option>`;
      return;
    }

    const startM = timeToMinutes(schedule.start);
    const endM = timeToMinutes(schedule.end);

    // Generar lista cada SLOT_MINUTES (end no incluido)
    const options = [];
    for (let t = startM; t <= endM - SLOT_MINUTES; t += SLOT_MINUTES) {
      const hhmm = minutesToTime(t);
      options.push(`<option value="${hhmm}">${hhmm}</option>`);
    }

    bkTime.innerHTML = `<option value="">Elegí una hora</option>` + options.join("");
  }

  function updatePreview() {
    const date = bkDate.value;
    const time = bkTime.value;
    const name = (bkName.value || "").trim();
    const services = Array.from(selectedServices);

    if (!date && services.length === 0) {
      bkPreview.textContent = "Seleccioná servicio(s) + fecha + hora para preparar tu mensaje.";
      return;
    }

    // Validar día cerrado
    if (date) {
      const day = new Date(date + "T00:00:00").getDay();
      if (!HOURS_BY_DAY[day]) {
        bkPreview.textContent = `Día seleccionado: ${formatDateCR(date)} (${dayNameEs(day)}). Estado: CERRADO. Elegí otra fecha.`;
        return;
      }
    }

    const s = services.length ? services.join(", ") : "Sin seleccionar";
    const d = date ? `${formatDateCR(date)} (${dayNameEs(new Date(date+"T00:00:00").getDay())})` : "Sin fecha";
    const h = time || "Sin hora";
    const n = name ? `Nombre: ${name}. ` : "";

    bkPreview.textContent = `${n}Servicio(s): ${s}. Fecha: ${d}. Hora: ${h}.`;
  }

  // Inicial preview
  updatePreview();
}
