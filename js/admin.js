/* ===== Painel do administrador ===== */
(function () {
  "use strict";

  const ADMIN_PASSWORD = "admin123"; // altere aqui a senha de acesso
  const DATA_URL = "products.json";
  const CACHE_KEY = "aff_products_cache_v1";
  const AUTH_KEY = "aff_admin_auth";

  let products = [];

  const el = {
    authGate: document.getElementById("authGate"),
    adminPanel: document.getElementById("adminPanel"),
    passwordInput: document.getElementById("passwordInput"),
    loginBtn: document.getElementById("loginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    form: document.getElementById("productForm"),
    formTitle: document.getElementById("formTitle"),
    productId: document.getElementById("productId"),
    fName: document.getElementById("fName"),
    fCategory: document.getElementById("fCategory"),
    fDescription: document.getElementById("fDescription"),
    fPrice: document.getElementById("fPrice"),
    fOldPrice: document.getElementById("fOldPrice"),
    fImage: document.getElementById("fImage"),
    fStore: document.getElementById("fStore"),
    fLink: document.getElementById("fLink"),
    fFeatured: document.getElementById("fFeatured"),
    saveBtn: document.getElementById("saveBtn"),
    resetBtn: document.getElementById("resetBtn"),
    categoryList: document.getElementById("categoryList"),
    tableBody: document.getElementById("productTableBody"),
    panelCount: document.getElementById("panelCount"),
    statTotal: document.getElementById("statTotal"),
    statFeatured: document.getElementById("statFeatured"),
    statCats: document.getElementById("statCats"),
    exportBtn: document.getElementById("exportBtn"),
    copyBtn: document.getElementById("copyBtn"),
    importBtn: document.getElementById("importBtn"),
    importArea: document.getElementById("importArea"),
    importText: document.getElementById("importText"),
    confirmImportBtn: document.getElementById("confirmImportBtn"),
    cancelImportBtn: document.getElementById("cancelImportBtn"),
    toast: document.getElementById("toast"),
  };

  const formatBRL = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const initials = (name) =>
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  function showToast(msg, type) {
    el.toast.textContent = msg;
    el.toast.className = "toast show " + (type || "");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (el.toast.className = "toast"), 2800);
  }

  /* ---------- Senha / sessão (proteção simples, não é segurança real) ---------- */
  function checkAuth() {
    return sessionStorage.getItem(AUTH_KEY) === "ok";
  }

  function enter() {
    el.authGate.hidden = true;
    el.adminPanel.hidden = false;
    el.logoutBtn.hidden = false;
    loadProducts();
  }

  el.loginBtn.addEventListener("click", () => {
    if (el.passwordInput.value === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "ok");
      enter();
    } else {
      showToast("Senha incorreta.", "error");
    }
  });

  el.passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") el.loginBtn.click();
  });

  el.logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
  });

  /* ---------- Dados ---------- */
  function persistCache() {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ products }));
  }

  async function loadProducts() {
    const cached = localStorage.getItem(CACHE_KEY);
    try {
      if (cached) {
        products = (JSON.parse(cached).products || []).map(normalize);
      } else {
        const res = await fetch(DATA_URL + "?_t=" + Date.now());
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        products = (data.products || []).map(normalize);
      }
      render();
    } catch (err) {
      console.error(err);
      products = [];
      render();
      showToast("Falha ao carregar products.json. Iniciando vazio.", "error");
    }
  }

  function normalize(p) {
    return {
      id: Number(p.id),
      name: String(p.name || ""),
      category: String(p.category || "Geral"),
      description: String(p.description || ""),
      price: Number(p.price) || 0,
      oldPrice: Number(p.oldPrice) || 0,
      image: String(p.image || ""),
      store: String(p.store || "Outra"),
      link: String(p.link || ""),
      featured: Boolean(p.featured),
    };
  }

  /* ---------- Rendering ---------- */
  function renderCats() {
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
    el.categoryList.innerHTML = cats.map((c) => `<option value="${c}">`).join("");
    el.statCats.textContent = cats.length;
  }

  function renderTable() {
    el.tableBody.innerHTML = products
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((p) => {
        const thumb = p.image
          ? `<img class="thumb" src="${p.image}" alt="" onerror="this.outerHTML='<div class=&quot;thumb-initials&quot;>${initials(p.name)}</div>'">`
          : `<div class="thumb-initials">${initials(p.name)}</div>`;
        return (
          "<tr>" +
          "<td>" + thumb + " " + escapeHtml(p.name) + "</td>" +
          "<td>" + escapeHtml(p.category) + "</td>" +
          "<td>" + formatBRL(p.price) + "</td>" +
          "<td>" + (p.featured ? "⭐" : "—") + "</td>" +
          '<td><div class="row-actions">' +
          '<button type="button" class="btn btn-sm btn-ghost" data-edit="' + p.id + '">Editar</button>' +
          '<button type="button" class="btn btn-sm btn-danger" data-del="' + p.id + '">Excluir</button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");

    el.tableBody.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => startEdit(Number(b.dataset.edit))));
    el.tableBody.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => removeProduct(Number(b.dataset.del))));

    el.statTotal.textContent = products.length;
    el.statFeatured.textContent = products.filter((p) => p.featured).length;
    el.panelCount.textContent = "(" + products.length + ")";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function render() {
    renderCats();
    renderTable();
  }

  /* ---------- Formulário ---------- */
  function resetForm() {
    el.form.reset();
    el.productId.value = "";
    el.formTitle.textContent = "Novo produto";
    el.saveBtn.textContent = "Salvar produto";
    el.resetBtn.hidden = true;
    el.fStore.value = "Mercado Livre";
  }

  function startEdit(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    el.productId.value = p.id;
    el.fName.value = p.name;
    el.fCategory.value = p.category;
    el.fDescription.value = p.description;
    el.fPrice.value = p.price;
    el.fOldPrice.value = p.oldPrice;
    el.fImage.value = p.image;
    el.fStore.value = p.store;
    el.fLink.value = p.link;
    el.fFeatured.checked = p.featured;
    el.formTitle.textContent = "Editar produto #" + p.id;
    el.saveBtn.textContent = "Salvar alterações";
    el.resetBtn.hidden = false;
    el.form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  el.resetBtn.addEventListener("click", resetForm);

  function removeProduct(id) {
    if (!confirm("Excluir este produto?")) return;
    products = products.filter((p) => p.id !== id);
    persistCache();
    render();
    if (Number(el.productId.value) === id) resetForm();
    showToast("Produto excluído.");
  }

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const price = parseFloat(String(el.fPrice.value).replace(",", "."));
    const oldPrice = parseFloat(String(el.fOldPrice.value).replace(",", ".")) || 0;
    const existingId = el.productId.value ? Number(el.productId.value) : null;

    const data = {
      name: el.fName.value.trim(),
      category: el.fCategory.value.trim(),
      description: el.fDescription.value.trim(),
      price: price,
      oldPrice: oldPrice,
      image: el.fImage.value.trim(),
      store: el.fStore.value,
      link: el.fLink.value.trim(),
      featured: el.fFeatured.checked,
    };

    if (!data.name || !data.category || !data.store || !data.link || !(price >= 0)) {
      showToast("Preencha os campos obrigatórios (nome, categoria, preço, loja e link).", "error");
      return;
    }

    if (existingId) {
      const idx = products.findIndex((p) => p.id === existingId);
      if (idx !== -1) products[idx] = normalize({ id: existingId, ...data });
      showToast("Produto atualizado!");
    } else {
      const nextId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
      products.push(normalize({ id: nextId, ...data }));
      showToast("Produto cadastrado!");
    }

    persistCache();
    render();
    resetForm();
  });

  /* ---------- Exportar / Importar ---------- */
  function exportJson() {
    const blob = new Blob([JSON.stringify({ products }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("products.json baixado. Envie-o para o seu servidor.");
  }

  function copyJson() {
    const text = JSON.stringify({ products }, null, 2);
    const done = () => showToast("JSON copiado para a área de transferência.");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    ta.remove();
    done();
  }

  function toggleImport(show) {
    el.importArea.hidden = !show;
  }

  function confirmImport() {
    try {
      const parsed = JSON.parse(el.importText.value);
      if (!parsed || !Array.isArray(parsed.products)) {
        throw new Error("estrutura inválida (precisa conter \"products\": [])");
      }
      products = parsed.products.map(normalize);
      persistCache();
      render();
      el.importText.value = "";
      toggleImport(false);
      showToast("Produtos importados com sucesso!");
    } catch (err) {
      showToast("JSON inválido: " + err.message, "error");
    }
  }

  el.exportBtn.addEventListener("click", exportJson);
  el.copyBtn.addEventListener("click", copyJson);
  el.importBtn.addEventListener("click", () => toggleImport(el.importArea.hidden));
  el.cancelImportBtn.addEventListener("click", () => { toggleImport(false); el.importText.value = ""; });
  el.confirmImportBtn.addEventListener("click", confirmImport);

  /* ---------- Init ---------- */
  resetForm();
  if (checkAuth()) enter();
})();