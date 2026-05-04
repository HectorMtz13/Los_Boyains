// ========================= UTILIDADES GENERALES =========================
const $ = (s) => document.querySelector(s);

const state = { view: "productos", q: "" };

const api = {
  async get(path) {
    const r = await fetch(path);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || j.message || "Error del servidor");
    return j;
  },
  async send(path, method, body) {
    const r = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || j.message || "Error del servidor");
    return j;
  }
};

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
  children.forEach((c) =>
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c)
  );
  return el;
}

function table(headers, rows) {
  if (!rows.length) return h("div", { class: "empty" }, ["Sin registros."]);
  const thead = h("thead", {}, [h("tr", {}, headers.map((x) => h("th", {}, [x])))]);
  const tbody = h("tbody", {}, rows.map((r) => h("tr", {}, r.map((c) => h("td", {}, [c])))));
  return h("table", { class: "table" }, [thead, tbody]);
}

function field(label, name, value = "", full = false) {
  const input = h("input", { class: "input", name, value: String(value ?? "") });
  return h("div", { class: "field" + (full ? " full" : "") }, [
    h("div", { class: "label" }, [label]),
    input
  ]);
}

function numField(label, name, value = "", full = false) {
  const input = h("input", { class: "input", type: "number", name, value: String(value ?? "") });
  return h("div", { class: "field" + (full ? " full" : "") }, [
    h("div", { class: "label" }, [label]),
    input
  ]);
}

function dateField(label, name, value = "", full = false) {
  const input = h("input", { class: "input", type: "date", name, value: String(value ?? "").slice(0, 10) });
  return h("div", { class: "field" + (full ? " full" : "") }, [
    h("div", { class: "label" }, [label]),
    input
  ]);
}

function selectField(label, name, options, selectedVal = "", full = false) {
  const sel = document.createElement("select");
  sel.className = "input";
  sel.name = name;
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "— Seleccionar —";
  sel.appendChild(none);
  options.forEach(({ value, label: lbl }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = lbl;
    if (String(value) === String(selectedVal)) opt.selected = true;
    sel.appendChild(opt);
  });
  return h("div", { class: "field" + (full ? " full" : "") }, [
    h("div", { class: "label" }, [label]),
    sel
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
  const body = $("#modalBody");
  const foot = $("#modalFooter");
  body.innerHTML = "";
  foot.innerHTML = "";
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
    $("#search").value = "";
    state.q = "";
    setActiveNav();
    render();
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
  productos:   ["Productos",            "Gestión del inventario de productos"],
  clientes:    ["Clientes",             "Gestión de clientes"],
  proveedores: ["Proveedores",          "Gestión de proveedores"],
  empleados:   ["Empleados",            "Gestión del personal"],
  areas:       ["Áreas",                "Áreas o departamentos de la tienda"],
  ventas:      ["Ventas",               "Registro de ventas"],
  codigos:     ["Códigos de Barras 📷", "Escanea o registra códigos de barras de productos"]
};

async function render() {
  setActiveNav();
  const [title, hint] = viewMeta[state.view] || ["", ""];
  $("#viewTitle").textContent = title;
  $("#viewHint").textContent = hint;
  $("#content").innerHTML = "<div class='loading'>Cargando...</div>";
  try {
    if (state.view === "productos")   return await renderProductos();
    if (state.view === "clientes")    return await renderClientes();
    if (state.view === "proveedores") return await renderProveedores();
    if (state.view === "empleados")   return await renderEmpleados();
    if (state.view === "areas")       return await renderAreas();
    if (state.view === "ventas")      return await renderVentas();
    if (state.view === "codigos")     return await renderCodigos();
  } catch (e) {
    $("#content").innerHTML = "";
    $("#content").appendChild(h("div", { class: "error-box" }, ["⚠ " + e.message]));
  }
}

// ========================= PRODUCTOS =========================
async function renderProductos() {
  const { data } = await api.get(`/api/productos?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => [
    String(x.id),
    x.Nombre_producto || "—",
    String(x.Cantidad_producto ?? "—"),
    x.Precio_Producto != null ? `$${parseFloat(x.Precio_Producto).toFixed(2)}` : "—",
    x.Categoria_Producto || "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editProducto(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delProducto(x.id) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID", "Nombre", "Cantidad", "Precio", "Categoría", "Acciones"], rows));
}

async function newProducto() {
  const form = h("div", { class: "form" }, [
    field("Nombre del producto", "Nombre_producto", "", false),
    numField("Cantidad", "Cantidad_producto", "0", false),
    numField("Precio ($)", "Precio_Producto", "0.00", false),
    field("Categoría", "Categoria_Producto", "", false)
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.Nombre_producto) return toast("El nombre es obligatorio", true);
      await api.send("/api/productos", "POST", p);
      toast("Producto creado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Nuevo producto", "Inventario", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Crear"])
  ]);
}

async function editProducto(x) {
  const form = h("div", { class: "form" }, [
    field("Nombre del producto", "Nombre_producto", x.Nombre_producto, false),
    numField("Cantidad", "Cantidad_producto", x.Cantidad_producto ?? 0, false),
    numField("Precio ($)", "Precio_Producto", x.Precio_Producto ?? 0, false),
    field("Categoría", "Categoria_Producto", x.Categoria_Producto || "", false)
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      await api.send(`/api/productos/${x.id}`, "PUT", p);
      toast("Producto actualizado ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Editar producto", `ID ${x.id}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
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
    String(x.id_Cliente),
    x.Nombre_Cliente || "—",
    x.telefono || "—",
    x.email || "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editCliente(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delCliente(x.id_Cliente) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID", "Nombre", "Teléfono", "Email", "Acciones"], rows));
}

async function newCliente() {
  const form = h("div", { class: "form" }, [
    field("Nombre del cliente", "Nombre_Cliente", "", false),
    field("Teléfono", "telefono", "", false),
    field("Email", "email", "", false)
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
    field("Nombre del cliente", "Nombre_Cliente", x.Nombre_Cliente, false),
    field("Teléfono", "telefono", x.telefono || "", false),
    field("Email", "email", x.email || "", false)
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      await api.send(`/api/clientes/${x.id_Cliente}`, "PUT", p);
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
    String(x.id_proveedor),
    x.Nombre_proveedor || "—",
    x.telefono || "—",
    x.email || "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editProveedor(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delProveedor(x.id_proveedor) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID", "Nombre", "Teléfono", "Email", "Acciones"], rows));
}

async function newProveedor() {
  const form = h("div", { class: "form" }, [
    field("Nombre del proveedor", "Nombre_proveedor", "", false),
    field("Teléfono", "telefono", "", false),
    field("Email", "email", "", false)
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
    field("Nombre del proveedor", "Nombre_proveedor", x.Nombre_proveedor, false),
    field("Teléfono", "telefono", x.telefono || "", false),
    field("Email", "email", x.email || "", false)
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      await api.send(`/api/proveedores/${x.id_proveedor}`, "PUT", p);
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
    String(x.Id_Empleado),
    x.Nombre_Empleado || "—",
    x.Puesto || "—",
    x.Nombre_Area || "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editEmpleado(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delEmpleado(x.Id_Empleado) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID", "Nombre", "Puesto", "Área", "Acciones"], rows));
}

async function newEmpleado() {
  const { data: areas } = await api.get("/api/areas");
  const areaOpts = areas.map((a) => ({ value: a.id_Area, label: a.Nombre_Area }));
  const form = h("div", { class: "form" }, [
    field("Nombre del empleado", "Nombre_Empleado", "", false),
    field("Puesto", "Puesto", "", false),
    selectField("Área", "id_Area", areaOpts, "", false)
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
    field("Nombre del empleado", "Nombre_Empleado", x.Nombre_Empleado, false),
    field("Puesto", "Puesto", x.Puesto || "", false),
    selectField("Área", "id_Area", areaOpts, x.id_Area || "", false)
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      await api.send(`/api/empleados/${x.Id_Empleado}`, "PUT", p);
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
    String(x.id_Area),
    x.Nombre_Area || "—",
    x.Descripcion || "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editArea(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delArea(x.id_Area) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID", "Nombre", "Descripción", "Acciones"], rows));
}

async function newArea() {
  const form = h("div", { class: "form" }, [
    field("Nombre del área", "Nombre_Area", "", false),
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
    field("Nombre del área", "Nombre_Area", x.Nombre_Area, false),
    field("Descripción", "Descripcion", x.Descripcion || "", true)
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      await api.send(`/api/areas/${x.id_Area}`, "PUT", p);
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

// ========================= VENTAS =========================
async function renderVentas() {
  const { data } = await api.get(`/api/ventas?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => [
    String(x.id_Venta),
    x.Nombre_Cliente || "—",
    x.Nombre_Empleado || "—",
    x.Nombre_producto || "—",
    String(x.cantidad ?? "—"),
    x.fecha ? String(x.fecha).slice(0, 10) : "—",
    x.total != null ? `$${parseFloat(x.total).toFixed(2)}` : "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editVenta(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delVenta(x.id_Venta) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID", "Cliente", "Empleado", "Producto", "Cantidad", "Fecha", "Total", "Acciones"], rows));
}

async function newVenta() {
  const [{ data: clientes }, { data: empleados }, { data: productos }] = await Promise.all([
    api.get("/api/clientes"), api.get("/api/empleados"), api.get("/api/productos")
  ]);
  const form = h("div", { class: "form" }, [
    selectField("Cliente", "id_Cliente", clientes.map((c) => ({ value: c.id_Cliente, label: c.Nombre_Cliente })), "", false),
    selectField("Empleado", "id_Empleado", empleados.map((e) => ({ value: e.Id_Empleado, label: e.Nombre_Empleado })), "", false),
    selectField("Producto *", "id_Producto", productos.map((p) => ({ value: p.id, label: p.Nombre_producto })), "", false),
    numField("Cantidad", "cantidad", "1", false),
    dateField("Fecha", "fecha", "", false),
    numField("Total ($)", "total", "0.00", false)
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      if (!p.id_Producto) return toast("El producto es obligatorio", true);
      await api.send("/api/ventas", "POST", p);
      toast("Venta registrada ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Nueva venta", "Registro de ventas", form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Registrar"])
  ]);
}

async function editVenta(x) {
  const [{ data: clientes }, { data: empleados }, { data: productos }] = await Promise.all([
    api.get("/api/clientes"), api.get("/api/empleados"), api.get("/api/productos")
  ]);
  const form = h("div", { class: "form" }, [
    selectField("Cliente", "id_Cliente", clientes.map((c) => ({ value: c.id_Cliente, label: c.Nombre_Cliente })), x.id_Cliente || "", false),
    selectField("Empleado", "id_Empleado", empleados.map((e) => ({ value: e.Id_Empleado, label: e.Nombre_Empleado })), x.id_Empleado || "", false),
    selectField("Producto *", "id_Producto", productos.map((p) => ({ value: p.id, label: p.Nombre_producto })), x.id_Producto || "", false),
    numField("Cantidad", "cantidad", x.cantidad ?? 1, false),
    dateField("Fecha", "fecha", x.fecha ? String(x.fecha).slice(0, 10) : "", false),
    numField("Total ($)", "total", x.total ?? 0, false)
  ]);
  const save = async () => {
    try {
      const p = readForm(form);
      await api.send(`/api/ventas/${x.id_Venta}`, "PUT", p);
      toast("Venta actualizada ✓"); closeModal(); render();
    } catch (e) { toast("Error: " + e.message, true); }
  };
  openModal("Editar venta", `ID ${x.id_Venta}`, form, [
    h("button", { class: "btn", onClick: closeModal }, ["Cancelar"]),
    h("button", { class: "btn primary", onClick: save }, ["Guardar"])
  ]);
}

async function delVenta(id) {
  if (!confirm("¿Eliminar esta venta?")) return;
  await api.send(`/api/ventas/${id}`, "DELETE");
  toast("Venta eliminada"); render();
}

// ========================= CÓDIGOS DE BARRAS =========================
let scanStream = null;
let scanTimer  = null;
let scannerActive = false;

function stopScanner() {
  scannerActive = false;
  if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
  if (scanStream) {
    scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
  }
}

async function renderCodigos() {
  const { data } = await api.get(`/api/codigos?q=${encodeURIComponent(state.q)}`);
  const rows = data.map((x) => [
    String(x.id_codigo),
    x.Nombre_producto || "—",
    x.codigo_barras || "—",
    x.fecha_registro ? String(x.fecha_registro).slice(0, 10) : "—",
    h("div", { class: "actions" }, [
      h("button", { class: "btn", onClick: () => editCodigo(x) }, ["Editar"]),
      h("button", { class: "btn danger", onClick: () => delCodigo(x.id_codigo) }, ["Eliminar"])
    ])
  ]);
  $("#content").innerHTML = "";
  $("#content").appendChild(table(["ID", "Producto", "Código de barras", "Fecha registro", "Acciones"], rows));
}

async function newCodigo() {
  const { data: productos } = await api.get("/api/productos");

  // ---- UI del escáner ----
  const video = document.createElement("video");
  video.setAttribute("playsinline", "true");
  video.setAttribute("muted", "true");
  video.style.cssText = "width:100%;border-radius:10px;background:#000;display:block;";

  const overlay = h("div", { class: "scanner-overlay" }, [
    h("div", { class: "scanner-frame" }, [h("div", { class: "scanner-line" })])
  ]);
  const wrap = h("div", { class: "scanner-wrap" });
  wrap.appendChild(video);
  wrap.appendChild(overlay);

  const resultRow = h("div", { class: "scanner-result-row", style: "display:none;margin-top:8px;" });
  const resultText = h("strong", {}, [""]);
  resultRow.appendChild(h("span", {}, ["📦 "]));
  resultRow.appendChild(resultText);

  const snapCanvas = document.createElement("canvas");
  const snapCtx = snapCanvas.getContext("2d", { willReadFrequently: true });

  const btnRow = h("div", { style: "display:flex;gap:8px;margin-bottom:8px;" });
  const scanBtn    = h("button", { class: "btn primary", style: "flex:1;" }, ["📷 Iniciar cámara"]);
  const captureBtn = h("button", { class: "btn", style: "flex:1;display:none;" }, ["🔍 Leer código ahora"]);
  btnRow.appendChild(scanBtn);
  btnRow.appendChild(captureBtn);

  const scannerSection = h("div", { class: "field full" }, [
    h("div", { class: "label" }, ["Escanear código de barras con la cámara"]),
    btnRow,
    wrap,
    resultRow
  ]);

  const codigoInput = h("input", { class: "input", name: "codigo_barras", value: "", placeholder: "O escríbelo manualmente" });

  const form = h("div", { class: "form" }, [
    scannerSection,
    selectField("Producto *", "id_producto", productos.map((p) => ({ value: p.id, label: p.Nombre_producto })), "", false),
    h("div", { class: "field" }, [h("div", { class: "label" }, ["Código de barras *"]), codigoInput])
  ]);

  // ---- Función que lee el frame actual ----
  function tryReadFrame() {
    if (!video.videoWidth) return false;
    snapCanvas.width  = video.videoWidth;
    snapCanvas.height = video.videoHeight;
    snapCtx.drawImage(video, 0, 0);
    return true;
  }

  function onRead(code) {
    stopScanner();
    video.srcObject = null;
    captureBtn.style.display = "none";
    scanBtn.textContent = "📷 Escanear de nuevo";
    codigoInput.value = code;
    resultText.textContent = code;
    resultRow.style.display = "flex";
    toast("✅ Código leído: " + code);
  }

  // ---- Botón "Leer ahora" — captura manual ----
  captureBtn.addEventListener("click", async () => {
    if (!tryReadFrame()) { toast("La cámara aún no está lista", true); return; }

    // 1. BarcodeDetector nativo (Chrome Android)
    if (typeof BarcodeDetector !== "undefined") {
      try {
        const det = new BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"] });
        const bs = await det.detect(snapCanvas);
        if (bs.length) { onRead(bs[0].rawValue); return; }
      } catch(e) {}
    }

    // 2. ZXing @0.18.6 (funciona en iOS Safari, Firefox, etc.)
    if (typeof ZXing !== "undefined") {
      try {
        const reader = new ZXing.BrowserMultiFormatReader();
        const imgEl = new Image();
        imgEl.src = snapCanvas.toDataURL();
        await new Promise(r => { imgEl.onload = r; });
        const result = await reader.decodeFromImage(imgEl);
        if (result) { onRead(result.getText()); return; }
      } catch(e) {}
    }

    toast("No detecté código. Centra bien el código y pulsa de nuevo.", true);
  });

  // ---- Botón principal: iniciar/detener cámara ----
  scanBtn.addEventListener("click", async () => {
    if (scannerActive) {
      stopScanner();
      video.srcObject = null;
      captureBtn.style.display = "none";
      scanBtn.textContent = "📷 Iniciar cámara";
      return;
    }

    try {
      scanBtn.textContent = "⏳ Solicitando permiso...";
      scanBtn.disabled = true;

      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = scanStream;
      await video.play();

      scannerActive = true;
      scanBtn.disabled = false;
      scanBtn.textContent = "⏹ Detener cámara";
      captureBtn.style.display = "flex";

      // Auto-detección cada 700ms: BarcodeDetector nativo si disponible, sino ZXing
      if (typeof BarcodeDetector !== "undefined") {
        const det = new BarcodeDetector({ formats: ["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"] });
        (function autoLoop() {
          if (!scannerActive) return;
          det.detect(video).then(bs => {
            if (bs.length) { onRead(bs[0].rawValue); }
            else { scanTimer = setTimeout(autoLoop, 700); }
          }).catch(() => { scanTimer = setTimeout(autoLoop, 700); });
        })();
      } else if (typeof ZXing !== "undefined") {
        // Fallback ZXing para iOS Safari / Firefox
        const zxReader = new ZXing.BrowserMultiFormatReader();
        (function autoLoopZX() {
          if (!scannerActive) return;
          if (!video.videoWidth) { scanTimer = setTimeout(autoLoopZX, 700); return; }
          snapCanvas.width  = video.videoWidth;
          snapCanvas.height = video.videoHeight;
          snapCtx.drawImage(video, 0, 0);
          const imgEl = new Image();
          imgEl.src = snapCanvas.toDataURL();
          imgEl.onload = () => {
            zxReader.decodeFromImage(imgEl).then(result => {
              if (result && scannerActive) onRead(result.getText());
              else if (scannerActive) scanTimer = setTimeout(autoLoopZX, 700);
            }).catch(() => { if (scannerActive) scanTimer = setTimeout(autoLoopZX, 700); });
          };
        })();
      }

    } catch (err) {
      stopScanner();
      scanBtn.disabled = false;
      scanBtn.textContent = "📷 Iniciar cámara";
      if (err.name === "NotAllowedError") {
        toast("Permiso de cámara denegado. Acepta el permiso e intenta de nuevo.", true);
      } else {
        toast("Error de cámara: " + err.message, true);
      }
    }
  });

  // ---- Guardar ----
  const save = async () => {
    try {
      const p = readForm(form);
      p.codigo_barras = codigoInput.value.trim();
      if (!p.id_producto)   return toast("Selecciona un producto", true);
      if (!p.codigo_barras) return toast("El código de barras es obligatorio", true);
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
    selectField("Producto *", "id_producto", productos.map((p) => ({ value: p.id, label: p.Nombre_producto })), x.id_producto || "", false),
    field("Código de barras *", "codigo_barras", x.codigo_barras || "", false)
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

// ========================= DISPATCHER =========================
function onNew() {
  if (state.view === "productos")   return newProducto();
  if (state.view === "clientes")    return newCliente();
  if (state.view === "proveedores") return newProveedor();
  if (state.view === "empleados")   return newEmpleado();
  if (state.view === "areas")       return newArea();
  if (state.view === "ventas")      return newVenta();
  if (state.view === "codigos")     return newCodigo();
}

render();