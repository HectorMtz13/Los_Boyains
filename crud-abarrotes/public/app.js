// ========================= AUTENTICACIÓN =========================
let sesionActiva = null;

const api = {
  async get(path) {
    const headers = {};
    if (sesionActiva) headers["x-usuario-id"] = sesionActiva.id_usuario;
    const r = await fetch(path, { headers });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { cerrarSesion(); throw new Error("Sesión expirada"); }
    if (!r.ok) throw new Error(j.error || j.message || "Error del servidor");
    return j;
  },
  async send(path, method, body) {
    const headers = { "Content-Type": "application/json" };
    if (sesionActiva) headers["x-usuario-id"] = sesionActiva.id_usuario;
    const r = await fetch(path, {
      method,
      headers,
      body: JSON.stringify(body || {})
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { cerrarSesion(); throw new Error("Sesión expirada"); }
    if (!r.ok) throw new Error(j.error || j.message || "Error del servidor");
    return j;
  }
};

function mostrarApp(usuario) {
  sesionActiva = usuario;
  sessionStorage.setItem("usuario", JSON.stringify(usuario));
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appShell").style.display    = "block";
  const chip = document.getElementById("userChip");
  chip.style.display  = "flex";
  const rolTexto = usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1);
  chip.textContent = `👤 ${usuario.nombre_empleado} — ${rolTexto}`;
  render();
}

function cerrarSesion() {
  sesionActiva = null;
  sessionStorage.removeItem("usuario");
  document.getElementById("appShell").style.display    = "none";
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("userChip").style.display    = "none";
  document.getElementById("loginUser").value = "";
  document.getElementById("loginPass").value = "";
  document.getElementById("loginError").textContent = "";
}

async function intentarLogin() {
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;
  const errorEl  = document.getElementById("loginError");
  const btn      = document.getElementById("loginBtn");
  errorEl.textContent = "";
  if (!username || !password) { errorEl.textContent = "Escribe tu usuario y contraseña."; return; }
  btn.disabled = true; btn.textContent = "Entrando...";
  try {
    const r = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { errorEl.textContent = data.error || "Credenciales incorrectas."; return; }
    mostrarApp(data);
  } catch (e) {
    errorEl.textContent = "Error de conexión. ¿Está corriendo el servidor?";
  } finally {
    btn.disabled = false; btn.textContent = "Entrar →";
  }
}

document.getElementById("loginBtn").addEventListener("click", intentarLogin);
document.getElementById("loginPass").addEventListener("keydown", (e) => { if (e.key === "Enter") intentarLogin(); });
document.getElementById("userChip").addEventListener("click", () => { if (confirm("¿Cerrar sesión?")) cerrarSesion(); });

(async function iniciarApp() {
  const guardado = sessionStorage.getItem("usuario");
  if (guardado) {
    try {
      const usuario = JSON.parse(guardado);
      const r = await fetch("/api/auth/me", { headers: { "x-usuario-id": usuario.id_usuario } });
      if (r.ok) { mostrarApp(await r.json()); return; }
    } catch (e) {}
  }
  document.getElementById("loginScreen").style.display = "flex";
})();

// ========================= UTILIDADES GENERALES =========================
const $ = (s) => document.querySelector(s);
const state = { view: "pos", q: "" };

function toast(msg, isError = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  children.forEach((c) => el.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
  return el;
}

function table(headers, rows) {
  if (!rows.length) return h("div", { class: "empty" }, ["Sin registros."]);
  const thead = h("thead", {}, [h("tr", {}, headers.map((x) => h("th", {}, [x])))]);
  const tbody = h("tbody", {}, rows.map((r) =>
    h("tr", {}, r.map((c, i) => {
      const td = document.createElement("td");
      td.setAttribute("data-label", headers[i] || "");
      if (typeof c === "string") td.textContent = c;
      else td.appendChild(c);
      return td;
    }))
  ));
  return h("table", { class: "table" }, [thead, tbody]);
}

function field(label, name, value = "", full = false) {
  return h("div", { class: "field" + (full ? " full" : "") }, [
    h("div", { class: "label" }, [label]),
    h("input", { class: "input", name, value: String(value ?? "") })
  ]);
}

function numField(label, name, value = "", full = false) {
  return h("div", { class: "field" + (full ? " full" : "") }, [
    h("div", { class: "label" }, [label]),
    h("input", { class: "input", type: "number", name, value: String(value ?? "") })
  ]);
}

function dateField(label, name, value = "", full = false) {
  return h("div", { class: "field" + (full ? " full" : "") }, [
    h("div", { class: "label" }, [label]),
    h("input", { class: "input", type: "date", name, value: String(value ?? "").slice(0, 10) })
  ]);
}

function selectField(label, name, options, selectedVal = "", full = false) {
  const sel = document.createElement("select");
  sel.className = "input"; sel.name = name;
  const none = document.createElement("option");
  none.value = ""; none.textContent = "— Seleccionar —";
  sel.appendChild(none);
  options.forEach(({ value, label: lbl }) => {
    const opt = document.createElement("option");
    opt.value = value; opt.textContent = lbl;
    if (String(value) === String(selectedVal)) opt.selected = true;
    sel.appendChild(opt);
  });
  return h("div", { class: "field" + (full ? " full" : "") }, [
    h("div", { class: "label" }, [label]), sel
  ]);
}

function readForm(root) {
  const obj = {};
  root.querySelectorAll("input[name], select[name], textarea[name]").forEach((i) => {
    obj[i.name] = i.value.trim();
  });
  return obj;
}

function openModal(title, subtitle, bodyEl, footerEls) {
  $("#modalTitle").textContent = title;
  $("#modalSubtitle").textContent = subtitle || "";
  const body = $("#modalBody"), foot = $("#modalFooter");
  body.innerHTML = ""; foot.innerHTML = "";
  body.appendChild(bodyEl);
  (footerEls || []).forEach((x) => foot.appendChild(x));
  $("#modal").classList.add("show");
}

function closeModal() {
  stopScanner();
  $("#modal").classList.remove("show");
}

$("#modalClose").addEventListener("click", closeModal);
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

document.querySelectorAll(".chip").forEach((b) => {
  b.addEventListener("click", () => {
    state.view = b.dataset.view;
    $("#search").value = ""; state.q = "";
    setActiveNav(); render();
  });
});

function setActiveNav() {
  document.querySelectorAll(".chip").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === state.view)
  );
}

$("#search").addEventListener("input", (e) => { state.q = e.target.value.trim(); });
$("#refresh").addEventListener("click", () => render());
$("#newBtn").addEventListener("click", () => onNew());

const viewMeta = {
  pos:         ["🛒 POS — Venta Rápida",    "Escanea o busca productos para cobrar"],
  productos:   ["Productos",                 "Gestión del inventario de productos"],
  clientes:    ["Clientes",                  "Gestión de clientes"],
  proveedores: ["Proveedores",               "Gestión de proveedores"],
  empleados:   ["Empleados",                 "Gestión del personal"],
  areas:       ["Áreas",                     "Áreas o departamentos de la tienda"],
  ventas:      ["Historial de Ventas",       "Registro de ventas completadas"],
  codigos:     ["Códigos de Barras 📷",      "Escanea o registra códigos de barras de productos"],
  categorias:  ["Categorías 🏷️",             "Administra las categorías de productos"],
};

async function render() {
  setActiveNav();
  const [title, hint] = viewMeta[state.view] || ["", ""];
  $("#viewTitle").textContent = title;
  $("#viewHint").textContent  = hint;

  // En POS ocultamos buscador y botón nuevo
  const esPOS = state.view === "pos";
  $("#newBtn").style.display  = esPOS ? "none" : "";
  $("#search").style.display  = esPOS ? "none" : "";
  $("#refresh").style.display = esPOS ? "none" : "";

  $("#content").innerHTML = "<div class='loading'>Cargando...</div>";
  try {
    if (state.view === "pos")         return await renderPOS();
    if (state.view === "productos")   return await renderProductos();
    if (state.view === "clientes")    return await renderClientes();
    if (state.view === "proveedores") return await renderProveedores();
    if (state.view === "empleados")   return await renderEmpleados();
    if (state.view === "areas")       return await renderAreas();
    if (state.view === "ventas")      return await renderVentas();
    if (state.view === "codigos")     return await renderCodigos();
    if (state.view === "categorias")  return await renderCategorias();
  } catch (e) {
    $("#content").innerHTML = "";
    $("#content").appendChild(h("div", { class: "error-box" }, ["⚠ " + e.message]));
  }
}

// ========================= POS — CARRITO (PBI-013, 014, 015) =========================
let carrito = []; // [{ id_producto, nombre, precio_unitario, cantidad, unidad }]

function carritoTotal() {
  return carrito.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
}

async function renderPOS() {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:16px;";

  // ── Buscador / escáner ──────────────────────────────────────
  const searchRow = h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap;" });
  const codigoInput = h("input", {
    class: "input",
    placeholder: "Buscar producto o código de barras…",
    style: "flex:1;min-width:160px;"
  });
  const buscarBtn = h("button", { class: "btn primary" }, ["🔍 Buscar"]);
  const camBtn    = h("button", { class: "btn" },         ["📷 Cámara"]);
  searchRow.append(codigoInput, buscarBtn, camBtn);

  // Video del escáner
  const video = document.createElement("video");
  video.setAttribute("playsinline", "true");
  video.setAttribute("muted", "true");
  video.style.cssText = "width:100%;border-radius:10px;background:#000;display:none;margin-top:8px;max-height:240px;object-fit:cover;";
  const snapCanvas = document.createElement("canvas");
  const snapCtx    = snapCanvas.getContext("2d", { willReadFrequently: true });

  // Sugerencias de búsqueda
  const sugerenciasEl = h("div", { style: "display:none;" });

  // ── Carrito ─────────────────────────────────────────────────
  const carritoEl = h("div", { class: "panel" });
  const totalEl   = h("div", {
    style: "font-size:1.4rem;font-weight:700;text-align:right;padding:8px 0;"
  }, ["Total: $0.00"]);
  const descInput = h("input", {
    class: "input", type: "number",
    placeholder: "Descuento ($)", value: "0",
    style: "width:140px;text-align:right;"
  });
  const cobrarBtn  = h("button", { class: "btn primary", style: "font-size:1.1rem;" }, ["💳 Cobrar"]);
  const cancelBtn  = h("button", { class: "btn danger" }, ["🗑 Cancelar venta"]);

  // ── Renderizar items del carrito ────────────────────────────
  function actualizarCarrito() {
    carritoEl.innerHTML = "";
    if (!carrito.length) {
      carritoEl.appendChild(h("div", { class: "empty" }, ["Carrito vacío — escanea o busca un producto"]));
    } else {
      carrito.forEach((item, idx) => {
        const row = h("div", {
          style: "display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border);"
        });

        // Info del producto
        const info = h("div", { style: "flex:2;" });
        info.appendChild(h("div", { style: "font-weight:600;" }, [item.nombre]));
        info.appendChild(h("div", { style: "color:var(--muted);font-size:.85rem;" },
          [`$${item.precio_unitario.toFixed(2)} / ${item.unidad || "pza"}`]));

        // Controles de cantidad (PBI-015)
        const minusBtn = h("button", { class: "btn", style: "padding:4px 10px;" }, ["−"]);
        const cantEl   = h("span", { style: "font-weight:700;min-width:28px;text-align:center;" }, [String(item.cantidad)]);
        const plusBtn  = h("button", { class: "btn", style: "padding:4px 10px;" }, ["+"]); 

        minusBtn.addEventListener("click", () => {
          if (item.cantidad <= 1) carrito.splice(idx, 1);
          else item.cantidad--;
          actualizarCarrito();
        });
        plusBtn.addEventListener("click", () => {
          item.cantidad++;
          actualizarCarrito();
        });

        // Subtotal y eliminar
        const subtotal = h("div", { style: "font-weight:700;min-width:72px;text-align:right;" },
          [`$${(item.cantidad * item.precio_unitario).toFixed(2)}`]);
        const delBtn = h("button", { class: "btn danger", style: "padding:4px 8px;" }, ["✕"]);
        delBtn.addEventListener("click", () => { carrito.splice(idx, 1); actualizarCarrito(); });

        row.append(info, minusBtn, cantEl, plusBtn, subtotal, delBtn);
        carritoEl.appendChild(row);
      });
    }

    // Recalcular total con descuento
    const desc  = parseFloat(descInput.value) || 0;
    const total = Math.max(0, carritoTotal() - desc);
    totalEl.textContent = `Total: $${total.toFixed(2)}`;
  }

  descInput.addEventListener("input", actualizarCarrito);
  actualizarCarrito();

  // ── Agregar producto al carrito (PBI-014) ───────────────────
  async function agregarProducto(prod) {
    if (!prod || !prod.activo) { toast("Producto inactivo o no encontrado", true); return; }
    if (prod.Cantidad_producto <= 0) { toast(`Sin stock: ${prod.Nombre_producto}`, true); return; }

    const existe = carrito.find((i) => i.id_producto === prod.id);
    if (existe) {
      if (existe.cantidad >= prod.Cantidad_producto) { toast("No hay más stock disponible", true); return; }
      existe.cantidad++;
    } else {
      carrito.push({
        id_producto:     prod.id,
        nombre:          prod.Nombre_producto,
        precio_unitario: parseFloat(prod.Precio_Producto) || 0,
        cantidad:        1,
        unidad:          prod.unidad_medida || "pza",
      });
    }
    toast(`✓ ${prod.Nombre_producto} agregado`);
    actualizarCarrito();
    sugerenciasEl.style.display = "none";
    codigoInput.value = "";
  }

  // ── Buscar por texto o código ───────────────────────────────
  async function buscarPorTexto() {
    const q = codigoInput.value.trim();
    if (!q) return;

    // 1. Intentar como código de barras exacto
    try {
      const { data } = await api.get(`/api/productos/barcode/${encodeURIComponent(q)}`);
      if (data) { agregarProducto(data); return; }
    } catch (_) {}

    // 2. Buscar por nombre
    try {
      const { data } = await api.get(`/api/productos?q=${encodeURIComponent(q)}`);
      if (data.length === 1) { agregarProducto(data[0]); return; }
      if (data.length > 1) {
        sugerenciasEl.innerHTML = "";
        sugerenciasEl.style.display = "block";
        data.slice(0, 8).forEach((p) => {
          const btn = h("button", {
            class: "btn",
            style: "display:block;width:100%;text-align:left;margin-bottom:4px;"
          }, [`${p.Nombre_producto} — $${parseFloat(p.Precio_Producto).toFixed(2)} (stock: ${p.Cantidad_producto})`]);
          btn.addEventListener("click", () => agregarProducto(p));
          sugerenciasEl.appendChild(btn);
        });
        return;
      }
      toast("Producto no encontrado", true);
    } catch (e) { toast("Error: " + e.message, true); }
  }

  buscarBtn.addEventListener("click", buscarPorTexto);
  codigoInput.addEventListener("keydown", (e) => { if (e.key === "Enter") buscarPorTexto(); });

  // ── Escáner de cámara ───────────────────────────────────────
  function onScan(code) {
    stopScanner();
    video.style.display = "none";
    camBtn.textContent  = "📷 Cámara";
    codigoInput.value   = code;
    buscarPorTexto();
  }

  camBtn.addEventListener("click", async () => {
    if (scannerActive) {
      stopScanner(); video.style.display = "none"; camBtn.textContent = "📷 Cámara"; return;
    }
    try {
      camBtn.textContent = "⏳ Permiso..."; camBtn.disabled = true;
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = scanStream;
      await video.play();
      video.style.display = "block";
      scannerActive = true;
      camBtn.disabled = false; camBtn.textContent = "⏹ Detener";

      if (typeof BarcodeDetector !== "undefined") {
        const det = new BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"] });
        (function loop() {
          if (!scannerActive) return;
          det.detect(video).then(bs => {
            if (bs.length) onScan(bs[0].rawValue);
            else scanTimer = setTimeout(loop, 600);
          }).catch(() => { scanTimer = setTimeout(loop, 600); });
        })();
      } else if (typeof ZXing !== "undefined") {
        const zxr = new ZXing.BrowserMultiFormatReader();
        (function loopZX() {
          if (!scannerActive) return;
          if (!video.videoWidth) { scanTimer = setTimeout(loopZX, 600); return; }
          snapCanvas.width = video.videoWidth; snapCanvas.height = video.videoHeight;
          snapCtx.drawImage(video, 0, 0);
          const img = new Image(); img.src = snapCanvas.toDataURL();
          img.onload = () => zxr.decodeFromImage(img)
            .then(r => { if (r && scannerActive) onScan(r.getText()); else if (scannerActive) scanTimer = setTimeout(loopZX, 600); })
            .catch(() => { if (scannerActive) scanTimer = setTimeout(loopZX, 600); });
        })();
      }
    } catch (err) {
      stopScanner(); camBtn.disabled = false; camBtn.textContent = "📷 Cámara";
      toast(err.name === "NotAllowedError" ? "Permiso de cámara denegado" : "Error: " + err.message, true);
    }
  });

  // ── Cobrar (PBI-015) ────────────────────────────────────────
  cobrarBtn.addEventListener("click", async () => {
    if (!carrito.length) { toast("El carrito está vacío", true); return; }
    const desc  = parseFloat(descInput.value) || 0;
    const total = Math.max(0, carritoTotal() - desc);

    // Modal de confirmación
    const body = h("div", {});

    // Resumen del ticket
    const resumen = h("div", { style: "margin-bottom:12px;" });
    carrito.forEach(i => {
      const fila = h("div", { style: "display:flex;justify-content:space-between;padding:4px 0;" });
      fila.appendChild(h("span", {}, [`${i.cantidad}× ${i.nombre}`]));
      fila.appendChild(h("span", {}, [`$${(i.cantidad * i.precio_unitario).toFixed(2)}`]));
      resumen.appendChild(fila);
    });
    if (desc > 0) {
      const descFila = h("div", { style: "display:flex;justify-content:space-between;color:#dc2626;" });
      descFila.appendChild(h("span", {}, ["Descuento"]));
      descFila.appendChild(h("span", {}, [`-$${desc.toFixed(2)}`]));
      resumen.appendChild(descFila);
    }
    const totalFila = h("div", {
      style: "display:flex;justify-content:space-between;font-weight:700;font-size:1.2rem;border-top:2px solid var(--border);margin-top:8px;padding-top:8px;"
    });
    totalFila.appendChild(h("span", {}, ["TOTAL"]));
    totalFila.appendChild(h("span", {}, [`$${total.toFixed(2)}`]));
    resumen.appendChild(totalFila);

    // Campo efectivo recibido
    const efectivoInput = h("input", {
      class: "input", type: "number",
      placeholder: "Efectivo recibido ($)",
      style: "margin-top:12px;"
    });
    const cambioEl = h("div", {
      style: "font-size:1.1rem;font-weight:600;color:green;margin-top:8px;text-align:right;"
    }, [""]);
    efectivoInput.addEventListener("input", () => {
      const recibido = parseFloat(efectivoInput.value) || 0;
      cambioEl.textContent = recibido >= total ? `Cambio: $${(recibido - total).toFixed(2)}` : "";
    });

    body.append(resumen, efectivoInput, cambioEl);

    const confirmarBtn = h("button", { class: "btn primary", style: "font-size:1.05rem;" }, ["✅ Confirmar cobro"]);
    confirmarBtn.addEventListener("click", async () => {
      confirmarBtn.disabled = true;
      try {
        const items = carrito.map(i => ({
          id_producto:     i.id_producto,
          cantidad:        i.cantidad,
          precio_unitario: i.precio_unitario
        }));
        await api.send("/api/pos", "POST", {
          id_Empleado: sesionActiva?.id_empleado || null,
          descuento:   desc,
          items,
          fecha: new Date().toISOString().slice(0, 10)
        });
        carrito = [];
        toast("✅ Venta registrada con éxito");
        closeModal();
        actualizarCarrito();
      } catch (e) {
        toast("Error: " + e.message, true);
        confirmarBtn.disabled = false;
      }
    });

    openModal("Confirmar cobro", `Total: $${total.toFixed(2)}`, body, [
      h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
      confirmarBtn
    ]);
  });

  // ── Cancelar venta ──────────────────────────────────────────
  cancelBtn.addEventListener("click", () => {
    if (!carrito.length || confirm("¿Cancelar la venta y vaciar el carrito?")) {
      carrito = []; actualizarCarrito();
    }
  });

  // ── Fila inferior ───────────────────────────────────────────
  const bottomRow = h("div", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap;" });
  bottomRow.append(descInput, totalEl, cancelBtn, cobrarBtn);

  wrap.append(searchRow, video, sugerenciasEl, carritoEl, bottomRow);
  $("#content").innerHTML = "";
  $("#content").appendChild(wrap);
}

// ========================= PRODUCTOS =========================
async function renderProductos() {
  const mostrarTodos = state.q === "" ? "0" : "1";
  const { data } = await api.get(`/api/productos?q=${encodeURIComponent(state.q)}&todos=${mostrarTodos}`);

  const stockBajo = data.filter(x => x.Cantidad_producto <= (x.stock_minimo || 5));
  if (stockBajo.length) {
    const alerta = h("div", {
      style: "background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:.9rem;"
    }, [`⚠️ ${stockBajo.length} producto(s) con stock bajo: ${stockBajo.map(p => p.Nombre_producto).join(", ")}`]);
    $("#content").innerHTML = "";
    $("#content").appendChild(alerta);
  } else {
    $("#content").innerHTML = "";
  }

  const rows = data.map((x) => {
    const activo      = x.activo !== 0;
    const stockAlerta = activo && x.Cantidad_producto <= (x.stock_minimo || 5);
    return [
      String(x.id),
      x.Nombre_producto || "—",
      x.codigo_barras   || "—",
      (() => {
        const el = h("span", { style: stockAlerta ? "color:#dc2626;font-weight:700;" : "" },
          [String(x.Cantidad_producto ?? "—")]);
        if (stockAlerta) el.title = "Stock bajo";
        return el;
      })(),
      String(x.stock_minimo ?? "—"),
      x.Precio_Producto != null ? `$${parseFloat(x.Precio_Producto).toFixed(2)}` : "—",
      x.unidad_medida   || "pieza",
      x.Categoria_Producto || "—",
      h("span", {
        style: `display:inline-block;padding:2px 8px;border-radius:20px;font-size:.75rem;font-weight:600;
                background:${activo ? "#d1fae5" : "#fee2e2"};color:${activo ? "#065f46" : "#991b1b"};`
      }, [activo ? "Activo" : "Inactivo"]),
      h("div", { class: "actions" }, [
        h("button", { class: "btn", onClick: () => editProducto(x) }, ["Editar"]),
        h("button", { class: activo ? "btn" : "btn primary", onClick: () => toggleActivo(x) },
          [activo ? "Inactivar" : "Activar"]),
        h("button", { class: "btn danger", onClick: () => delProducto(x.id) }, ["Eliminar"]),
      ])
    ];
  });

  $("#content").appendChild(table(
    ["ID","Nombre","Código","Stock","Mín.","Precio","Unidad","Categoría","Estado","Acciones"], rows
  ));
}

async function newProducto() {
  const form = h("div", { class: "form" }, [
    field("Nombre del producto *", "Nombre_producto", ""),
    numField("Cantidad inicial",   "Cantidad_producto", "0"),
    numField("Precio venta ($) *", "Precio_Producto", "0.00"),
    numField("Precio compra ($)",  "precio_compra", "0.00"),
    numField("Stock mínimo",       "stock_minimo", "5"),
    field("Unidad de medida",      "unidad_medida", "pieza"),
    field("Categoría",             "Categoria_Producto", ""),
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.Nombre_producto)            return toast("El nombre es obligatorio", true);
      if (parseFloat(p.Precio_Producto) < 0) return toast("El precio de venta no puede ser negativo", true);
      if (parseFloat(p.precio_compra)   < 0) return toast("El precio de compra no puede ser negativo", true);
      if (parseInt(p.Cantidad_producto) < 0) return toast("El stock no puede ser negativo", true);
      await api.send("/api/productos", "POST", p);
      toast("Producto creado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Nuevo producto", "Inventario", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"]),
  ]);
}

async function editProducto(x) {
  const form = h("div", { class: "form" }, [
    field("Nombre del producto *", "Nombre_producto", x.Nombre_producto),
    numField("Cantidad",           "Cantidad_producto", x.Cantidad_producto ?? 0),
    numField("Precio venta ($)",   "Precio_Producto", x.Precio_Producto ?? 0),
    numField("Precio compra ($)",  "precio_compra", x.precio_compra ?? 0),
    numField("Stock mínimo",       "stock_minimo", x.stock_minimo ?? 5),
    field("Unidad de medida",      "unidad_medida", x.unidad_medida || "pieza"),
    field("Categoría",             "Categoria_Producto", x.Categoria_Producto || ""),
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.Nombre_producto)            return toast("El nombre es obligatorio", true);
      if (parseFloat(p.Precio_Producto) < 0) return toast("El precio de venta no puede ser negativo", true);
      if (parseFloat(p.precio_compra)   < 0) return toast("El precio de compra no puede ser negativo", true);
      if (parseInt(p.Cantidad_producto) < 0) return toast("El stock no puede ser negativo", true);
      p.activo = x.activo;
      await api.send(`/api/productos/${x.id}`, "PUT", p);
      toast("Producto actualizado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Editar producto", `ID ${x.id}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"]),
  ]);
}

async function toggleActivo(x) {
  const nuevoEstado = x.activo === 0 ? 1 : 0;
  const msg = nuevoEstado ? "¿Reactivar este producto?" : "¿Inactivar este producto? No se podrá vender.";
  if (!confirm(msg)) return;
  try {
    await api.send(`/api/productos/${x.id}/activo`, "PATCH", { activo: nuevoEstado });
    toast(nuevoEstado ? "Producto activado ✓" : "Producto inactivado ✓"); render();
  } catch (e) { toast("Error: " + e.message, true); }
}

async function delProducto(id) {
  if (!confirm("¿Eliminar este producto?")) return;
  await api.send(`/api/productos/${id}`, "DELETE");
  toast("Producto eliminado"); render();
}

// ========================= CLIENTES =========================
async function renderClientes() {
  const { data } = await api.get(`/api/clientes?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => [
    String(x.id_Cliente), x.Nombre_Cliente||"—", x.telefono||"—", x.email||"—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editCliente(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delCliente(x.id_Cliente) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Nombre","Teléfono","Email","Acciones"], rows));
}

async function newCliente() {
  const form = h("div", { class: "form" }, [
    field("Nombre del cliente", "Nombre_Cliente"),
    field("Teléfono", "telefono"),
    field("Email", "email")
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.Nombre_Cliente) return toast("El nombre es obligatorio", true);
      await api.send("/api/clientes", "POST", p);
      toast("Cliente creado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Nuevo cliente", "Clientes", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function editCliente(x) {
  const form = h("div", { class: "form" }, [
    field("Nombre del cliente", "Nombre_Cliente", x.Nombre_Cliente),
    field("Teléfono", "telefono", x.telefono||""),
    field("Email", "email", x.email||"")
  ]);
  const save = async () => {
    try {
      await api.send(`/api/clientes/${x.id_Cliente}`, "PUT", readForm(form));
      toast("Cliente actualizado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Editar cliente", `ID ${x.id_Cliente}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delCliente(id) {
  if (!confirm("¿Eliminar este cliente?")) return;
  await api.send(`/api/clientes/${id}`, "DELETE");
  toast("Cliente eliminado"); render();
}

// ========================= PROVEEDORES =========================
async function renderProveedores() {
  const { data } = await api.get(`/api/proveedores?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => [
    String(x.id_proveedor), x.Nombre_proveedor||"—", x.telefono||"—", x.email||"—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editProveedor(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delProveedor(x.id_proveedor) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Nombre","Teléfono","Email","Acciones"], rows));
}

async function newProveedor() {
  const form = h("div", { class: "form" }, [
    field("Nombre del proveedor", "Nombre_proveedor"),
    field("Teléfono", "telefono"),
    field("Email", "email")
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.Nombre_proveedor) return toast("El nombre es obligatorio", true);
      await api.send("/api/proveedores", "POST", p);
      toast("Proveedor creado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Nuevo proveedor", "Proveedores", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function editProveedor(x) {
  const form = h("div", { class: "form" }, [
    field("Nombre del proveedor", "Nombre_proveedor", x.Nombre_proveedor),
    field("Teléfono", "telefono", x.telefono||""),
    field("Email", "email", x.email||"")
  ]);
  const save = async () => {
    try {
      await api.send(`/api/proveedores/${x.id_proveedor}`, "PUT", readForm(form));
      toast("Proveedor actualizado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Editar proveedor", `ID ${x.id_proveedor}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delProveedor(id) {
  if (!confirm("¿Eliminar este proveedor?")) return;
  await api.send(`/api/proveedores/${id}`, "DELETE");
  toast("Proveedor eliminado"); render();
}

// ========================= EMPLEADOS =========================
async function renderEmpleados() {
  const { data } = await api.get(`/api/empleados?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => [
    String(x.Id_Empleado), x.Nombre_Empleado||"—", x.Puesto||"—", x.Nombre_Area||"—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editEmpleado(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delEmpleado(x.Id_Empleado) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Nombre","Puesto","Área","Acciones"], rows));
}

async function newEmpleado() {
  const { data: areas } = await api.get("/api/areas");
  const areaOpts = areas.map((a) => ({ value: a.id_Area, label: a.Nombre_Area }));
  const form = h("div", { class: "form" }, [
    field("Nombre del empleado", "Nombre_Empleado"),
    field("Puesto", "Puesto"),
    selectField("Área", "id_Area", areaOpts)
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.Nombre_Empleado) return toast("El nombre es obligatorio", true);
      await api.send("/api/empleados", "POST", p);
      toast("Empleado creado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Nuevo empleado", "Personal", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function editEmpleado(x) {
  const { data: areas } = await api.get("/api/areas");
  const areaOpts = areas.map((a) => ({ value: a.id_Area, label: a.Nombre_Area }));
  const form = h("div", { class: "form" }, [
    field("Nombre del empleado", "Nombre_Empleado", x.Nombre_Empleado),
    field("Puesto", "Puesto", x.Puesto||""),
    selectField("Área", "id_Area", areaOpts, x.id_Area||"")
  ]);
  const save = async () => {
    try {
      await api.send(`/api/empleados/${x.Id_Empleado}`, "PUT", readForm(form));
      toast("Empleado actualizado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Editar empleado", `ID ${x.Id_Empleado}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delEmpleado(id) {
  if (!confirm("¿Eliminar este empleado?")) return;
  await api.send(`/api/empleados/${id}`, "DELETE");
  toast("Empleado eliminado"); render();
}

// ========================= AREAS =========================
async function renderAreas() {
  const { data } = await api.get("/api/areas");
  const rows = data.map((x) => [
    String(x.id_Area), x.Nombre_Area||"—", x.Descripcion||"—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editArea(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delArea(x.id_Area) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Nombre","Descripción","Acciones"], rows));
}

async function newArea() {
  const form = h("div", { class: "form" }, [
    field("Nombre del área", "Nombre_Area"),
    field("Descripción", "Descripcion", "", true)
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.Nombre_Area) return toast("El nombre es obligatorio", true);
      await api.send("/api/areas", "POST", p);
      toast("Área creada ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Nueva área", "Departamentos", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function editArea(x) {
  const form = h("div", { class: "form" }, [
    field("Nombre del área", "Nombre_Area", x.Nombre_Area),
    field("Descripción", "Descripcion", x.Descripcion||"", true)
  ]);
  const save = async () => {
    try {
      await api.send(`/api/areas/${x.id_Area}`, "PUT", readForm(form));
      toast("Área actualizada ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Editar área", `ID ${x.id_Area}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delArea(id) {
  if (!confirm("¿Eliminar esta área?")) return;
  await api.send(`/api/areas/${id}`, "DELETE");
  toast("Área eliminada"); render();
}

// ========================= VENTAS — HISTORIAL =========================
async function renderVentas() {
  const { data } = await api.get(`/api/pos?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => [
    String(x.id_Venta),
    x.Nombre_Cliente  || "—",
    x.Nombre_Empleado || "—",
    String(x.num_productos ?? "—"),
    x.fecha ? String(x.fecha).slice(0,10) : "—",
    x.descuento > 0 ? `-$${parseFloat(x.descuento).toFixed(2)}` : "—",
    x.total != null ? `$${parseFloat(x.total).toFixed(2)}` : "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn",    onClick: () => verDetalleVenta(x.id_Venta) }, ["Ver"]),
      h("button", { class: "btn danger", onClick: () => delVentaPOS(x.id_Venta) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(
    ["ID","Cliente","Empleado","Productos","Fecha","Descuento","Total","Acciones"], rows
  ));
}

async function verDetalleVenta(id) {
  try {
    const { data } = await api.get(`/api/pos/${id}`);
    const body = h("div", {});
    const thead = h("thead", {}, [h("tr", {}, ["Producto","Cant.","Precio","Subtotal"].map(t => h("th",{},[t])))]);
    const tbody = h("tbody", {}, (data.items || []).map(i =>
      h("tr", {}, [
        h("td",{},[i.Nombre_producto]),
        h("td",{},[String(i.cantidad)]),
        h("td",{},[`$${parseFloat(i.precio_unitario).toFixed(2)}`]),
        h("td",{},[`$${parseFloat(i.subtotal).toFixed(2)}`]),
      ])
    ));
    const tbl = h("table", { class: "table" });
    tbl.append(thead, tbody);
    const totalRow = h("div", { style: "text-align:right;font-weight:700;font-size:1.1rem;margin-top:8px;" },
      [`Total: $${parseFloat(data.total).toFixed(2)}`]);
    body.append(tbl, totalRow);
    openModal(`Venta #${id}`, data.Nombre_Cliente || "Sin cliente", body, [
      h("button", { class: "btn primary", onClick: closeModal }, ["Cerrar"])
    ]);
  } catch (e) { toast("Error: " + e.message, true); }
}

async function delVentaPOS(id) {
  if (!confirm("¿Eliminar esta venta?")) return;
  try {
    await api.send(`/api/pos/${id}`, "DELETE");
    toast("Venta eliminada"); render();
  } catch (e) { toast("Error: " + e.message, true); }
}

// ========================= CÓDIGOS DE BARRAS =========================
let scanStream    = null;
let scanTimer     = null;
let scannerActive = false;

function stopScanner() {
  scannerActive = false;
  if (scanTimer)  { clearTimeout(scanTimer); scanTimer = null; }
  if (scanStream) { scanStream.getTracks().forEach((t) => t.stop()); scanStream = null; }
}

async function renderCodigos() {
  const { data } = await api.get(`/api/codigos?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => [
    String(x.id_codigo), x.Nombre_producto||"—", x.codigo_barras||"—",
    x.fecha_registro ? String(x.fecha_registro).slice(0,10) : "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editCodigo(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delCodigo(x.id_codigo) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Producto","Código de barras","Fecha registro","Acciones"], rows));
}

async function newCodigo() {
  const { data: productos } = await api.get("/api/productos");
  const video = document.createElement("video");
  video.setAttribute("playsinline", "true");
  video.setAttribute("muted", "true");
  video.style.cssText = "width:100%;border-radius:10px;background:#000;display:block;";
  const overlay = h("div", { class: "scanner-overlay" }, [
    h("div", { class: "scanner-frame" }, [h("div", { class: "scanner-line" })])
  ]);
  const wrap = h("div", { class: "scanner-wrap" });
  wrap.appendChild(video); wrap.appendChild(overlay);
  const resultRow  = h("div", { class: "scanner-result-row", style: "display:none;margin-top:8px;" });
  const resultText = h("strong", {}, [""]);
  resultRow.appendChild(h("span", {}, ["📦 "])); resultRow.appendChild(resultText);
  const snapCanvas = document.createElement("canvas");
  const snapCtx    = snapCanvas.getContext("2d", { willReadFrequently: true });
  const btnRow     = h("div", { style: "display:flex;gap:8px;margin-bottom:8px;" });
  const scanBtn    = h("button", { class: "btn primary", style: "flex:1;" }, ["📷 Iniciar cámara"]);
  const captureBtn = h("button", { class: "btn", style: "flex:1;display:none;" }, ["🔍 Leer código ahora"]);
  btnRow.appendChild(scanBtn); btnRow.appendChild(captureBtn);
  const scannerSection = h("div", { class: "field full" }, [
    h("div", { class: "label" }, ["Escanear código de barras con la cámara"]),
    btnRow, wrap, resultRow
  ]);
  const codigoInput = h("input", { class: "input", name: "codigo_barras", value: "", placeholder: "O escríbelo manualmente" });
  const form = h("div", { class: "form" }, [
    scannerSection,
    selectField("Producto *", "id_producto", productos.map((p) => ({ value: p.id, label: p.Nombre_producto }))),
    h("div", { class: "field" }, [h("div", { class: "label" }, ["Código de barras *"]), codigoInput])
  ]);

  function tryReadFrame() {
    if (!video.videoWidth) return false;
    snapCanvas.width = video.videoWidth; snapCanvas.height = video.videoHeight;
    snapCtx.drawImage(video, 0, 0); return true;
  }
  function onRead(code) {
    stopScanner(); video.srcObject = null; captureBtn.style.display = "none";
    scanBtn.textContent = "📷 Escanear de nuevo";
    codigoInput.value = code; resultText.textContent = code;
    resultRow.style.display = "flex"; toast("✅ Código leído: " + code);
  }

  captureBtn.addEventListener("click", async () => {
    if (!tryReadFrame()) { toast("La cámara aún no está lista", true); return; }
    if (typeof BarcodeDetector !== "undefined") {
      try {
        const det = new BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"] });
        const bs = await det.detect(snapCanvas);
        if (bs.length) { onRead(bs[0].rawValue); return; }
      } catch(e) {}
    }
    if (typeof ZXing !== "undefined") {
      try {
        const reader = new ZXing.BrowserMultiFormatReader();
        const imgEl = new Image(); imgEl.src = snapCanvas.toDataURL();
        await new Promise(r => { imgEl.onload = r; });
        const result = await reader.decodeFromImage(imgEl);
        if (result) { onRead(result.getText()); return; }
      } catch(e) {}
    }
    toast("No detecté código. Centra bien el código y pulsa de nuevo.", true);
  });

  scanBtn.addEventListener("click", async () => {
    if (scannerActive) {
      stopScanner(); video.srcObject = null;
      captureBtn.style.display = "none"; scanBtn.textContent = "📷 Iniciar cámara"; return;
    }
    try {
      scanBtn.textContent = "⏳ Solicitando permiso..."; scanBtn.disabled = true;
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = scanStream; await video.play();
      scannerActive = true; scanBtn.disabled = false;
      scanBtn.textContent = "⏹ Detener cámara"; captureBtn.style.display = "flex";
      if (typeof BarcodeDetector !== "undefined") {
        const det = new BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"] });
        (function autoLoop() {
          if (!scannerActive) return;
          det.detect(video).then(bs => {
            if (bs.length) onRead(bs[0].rawValue);
            else scanTimer = setTimeout(autoLoop, 700);
          }).catch(() => { scanTimer = setTimeout(autoLoop, 700); });
        })();
      } else if (typeof ZXing !== "undefined") {
        const zxReader = new ZXing.BrowserMultiFormatReader();
        (function autoLoopZX() {
          if (!scannerActive) return;
          if (!video.videoWidth) { scanTimer = setTimeout(autoLoopZX, 700); return; }
          snapCanvas.width = video.videoWidth; snapCanvas.height = video.videoHeight;
          snapCtx.drawImage(video, 0, 0);
          const imgEl = new Image(); imgEl.src = snapCanvas.toDataURL();
          imgEl.onload = () => {
            zxReader.decodeFromImage(imgEl).then(result => {
              if (result && scannerActive) onRead(result.getText());
              else if (scannerActive) scanTimer = setTimeout(autoLoopZX, 700);
            }).catch(() => { if (scannerActive) scanTimer = setTimeout(autoLoopZX, 700); });
          };
        })();
      }
    } catch (err) {
      stopScanner(); scanBtn.disabled = false; scanBtn.textContent = "📷 Iniciar cámara";
      toast(err.name === "NotAllowedError" ? "Permiso de cámara denegado." : "Error de cámara: " + err.message, true);
    }
  });

  const save = async () => {
    try {
      const p = readForm(form);
      const codigo = codigoInput.value.trim();
      if (!p.id_producto)  return toast("Selecciona un producto", true);
      if (!codigo)         return toast("El código de barras es obligatorio", true);
      if (codigo.length < 3 || codigo.length > 50) return toast("El código debe tener entre 3 y 50 caracteres", true);
      if (!/^[a-zA-Z0-9\-_]+$/.test(codigo)) return toast("Solo letras, números, guiones y guiones bajos", true);
      p.codigo_barras = codigo;
      await api.send("/api/codigos", "POST", p);
      toast("Código registrado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };

  openModal("Nuevo código de barras", "Escáner + registro", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function editCodigo(x) {
  const { data: productos } = await api.get("/api/productos");
  const form = h("div", { class: "form" }, [
    selectField("Producto *", "id_producto", productos.map((p) => ({ value: p.id, label: p.Nombre_producto })), x.id_producto||""),
    field("Código de barras *", "codigo_barras", x.codigo_barras||"")
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.id_producto || !p.codigo_barras) return toast("Producto y código son obligatorios", true);
      await api.send(`/api/codigos/${x.id_codigo}`, "PUT", p);
      toast("Código actualizado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Editar código de barras", `ID ${x.id_codigo}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delCodigo(id) {
  if (!confirm("¿Eliminar este código de barras?")) return;
  await api.send(`/api/codigos/${id}`, "DELETE");
  toast("Código eliminado"); render();
}

// ========================= CATEGORÍAS (PBI-011) =========================
async function renderCategorias() {
  const { data } = await api.get("/api/categorias?todas=1");
  const rows = data.map((x) => [
    String(x.id_categoria),
    x.Nombre_Categoria || "—",
    h("span", {
      style: `display:inline-block;padding:2px 8px;border-radius:20px;font-size:.75rem;font-weight:600;
              background:${x.activo ? "#d1fae5" : "#fee2e2"};
              color:${x.activo ? "#065f46" : "#991b1b"};`
    }, [x.activo ? "Activa" : "Inactiva"]),
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editCategoria(x) }, ["Editar"]),
      h("button", {
        class: x.activo ? "btn" : "btn primary",
        onClick: () => toggleCategoria(x)
      }, [x.activo ? "Inactivar" : "Activar"]),
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID","Nombre","Estado","Acciones"], rows));
}

async function newCategoria() {
  const form = h("div", { class: "form" }, [
    field("Nombre de la categoría *", "Nombre_Categoria", ""),
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.Nombre_Categoria) return toast("El nombre es obligatorio", true);
      await api.send("/api/categorias", "POST", p);
      toast("Categoría creada ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Nueva categoría", "Catálogo", form, [
    h("button", { class: "btn",         onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save      }, ["Crear"]),
  ]);
}

async function editCategoria(x) {
  const form = h("div", { class: "form" }, [
    field("Nombre de la categoría *", "Nombre_Categoria", x.Nombre_Categoria),
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.Nombre_Categoria) return toast("El nombre es obligatorio", true);
      await api.send(`/api/categorias/${x.id_categoria}`, "PUT", p);
      toast("Categoría actualizada ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Editar categoría", `ID ${x.id_categoria}`, form, [
    h("button", { class: "btn",         onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save      }, ["Guardar"]),
  ]);
}

async function toggleCategoria(x) {
  const nuevoEstado = x.activo ? 0 : 1;
  const msg = nuevoEstado ? "¿Reactivar esta categoría?" : "¿Inactivar esta categoría?";
  if (!confirm(msg)) return;
  try {
    await api.send(`/api/categorias/${x.id_categoria}/activo`, "PATCH", { activo: nuevoEstado });
    toast(nuevoEstado ? "Categoría activada ✓" : "Categoría inactivada ✓"); render();
  } catch (e) { toast("Error: " + e.message, true); }
}

// ========================= DISPATCHER =========================
function onNew() {
  if (state.view === "productos")   return newProducto();
  if (state.view === "clientes")    return newCliente();
  if (state.view === "proveedores") return newProveedor();
  if (state.view === "empleados")   return newEmpleado();
  if (state.view === "areas")       return newArea();
  if (state.view === "codigos")     return newCodigo();
  if (state.view === "categorias")  return newCategoria();
  // POS y Ventas no tienen botón "Nuevo"
}

// ========================= SETUP DE USUARIO =========================
document.getElementById("showSetupBtn").addEventListener("click", () => {
  const panel = document.getElementById("setupPanel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
});

document.getElementById("setupBtn").addEventListener("click", async () => {
  const clave_admin = document.getElementById("setupClave").value.trim();
  const username    = document.getElementById("setupUser").value.trim();
  const password    = document.getElementById("setupPass").value;
  const msgEl       = document.getElementById("setupMsg");
  msgEl.style.color = "#888"; msgEl.textContent = "Procesando...";
  try {
    const r = await fetch("/api/auth/setup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave_admin, username, password, rol: "gerente" })
    });
    const data = await r.json();
    if (!r.ok) { msgEl.style.color = "red"; msgEl.textContent = data.error || "Error"; }
    else {
      msgEl.style.color = "green";
      msgEl.textContent = data.mensaje + " — ya puedes iniciar sesión";
      document.getElementById("loginUser").value = username;
    }
  } catch (e) { msgEl.style.color = "red"; msgEl.textContent = "Error de conexión"; }
});

render();