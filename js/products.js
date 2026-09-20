/* ===== Landing page pública ===== */
(function () {
  "use strict";

  const DATA_URL = "products.json";

  const PRICE_RANGES = [
    { id: "all", label: "Todas", min: null, max: null },
    { id: "p50", label: "Até R$ 50", min: 0, max: 50 },
    { id: "p50_100", label: "R$ 50 – R$ 100", min: 50, max: 100 },
    { id: "p100_200", label: "R$ 100 – R$ 200", min: 100, max: 200 },
    { id: "p200", label: "Acima de R$ 200", min: 200, max: Infinity },
  ];

  const state = {
    products: [],
    query: "",
    category: "todas",
    price: "all",
    store: "todas",
  };

  const el = {
    searchInput: document.getElementById("searchInput"),
    searchBtn: document.getElementById("searchBtn"),
    categoryChips: document.getElementById("categoryChips"),
    priceChips: document.getElementById("priceChips"),
    storeChips: document.getElementById("storeChips"),
    carousel: document.getElementById("productCarousel"),
    track: document.getElementById("productTrack"),
    prevBtn: document.getElementById("carouselPrev"),
    nextBtn: document.getElementById("carouselNext"),
    count: document.getElementById("resultsCount"),
    clearFilters: document.getElementById("clearFilters"),
    toast: document.getElementById("toast"),
  };

  const formatBRL = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const initials = (name) =>
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  function buildImage(prod) {
    if (prod.image) {
      const img = document.createElement("img");
      img.src = prod.image;
      img.alt = prod.name;
      img.loading = "lazy";
      img.onerror = function () {
        const ph = document.createElement("div");
        ph.className = "placeholder-initials";
        ph.textContent = initials(prod.name);
        this.replaceWith(ph);
      };
      return img;
    }
    const ph = document.createElement("div");
    ph.className = "placeholder-initials";
    ph.textContent = initials(prod.name);
    return ph;
  }

  function renderProducts(list) {
    el.track.innerHTML = "";
    el.prevBtn.disabled = true;
    el.nextBtn.disabled = true;

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.style.flex = "1 1 100%";
      empty.innerHTML =
        '<p>Nenhum produto encontrado para os filtros selecionados.</p>' +
        '<p style="margin-top:8px"><a href="#" onclick="window.__clearAll();return false;">Limpar filtros</a></p>';
      el.track.appendChild(empty);
      el.count.textContent = "0 resultados";
      return;
    }

    list
      .slice()
      .sort((a, b) => (Number(b.featured) - Number(a.featured)) || a.id - b.id)
      .forEach((prod) => {
        const slide = document.createElement("div");
        slide.className = "carousel-slide";
        slide.appendChild(buildCard(prod));
        el.track.appendChild(slide);
      });

    el.count.textContent = list.length + (list.length === 1 ? " resultado" : " resultados");
    updateCarouselSize();
    updateCarouselArrows();
  }

  function buildCard(prod) {
    const card = document.createElement("article");
    card.className = "card";

    const media = document.createElement("div");
    media.className = "card-img";
    media.appendChild(buildImage(prod));

    if (prod.featured) {
      const badge = document.createElement("span");
      badge.className = "card-badge featured";
      badge.textContent = "Destaque";
      media.appendChild(badge);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const cat = document.createElement("span");
    cat.className = "card-cat";
    cat.textContent = prod.category || "Geral";

    const h3 = document.createElement("h3");
    h3.textContent = prod.name;

    const priceRow = document.createElement("div");
    priceRow.className = "card-price";
    const now = document.createElement("span");
    now.className = "price-now";
    now.textContent = formatBRL(prod.price);
    priceRow.appendChild(now);
    if (prod.oldPrice > prod.price) {
      const old = document.createElement("span");
      old.className = "price-old";
      old.textContent = formatBRL(prod.oldPrice);
      priceRow.appendChild(old);
    }

    const store = document.createElement("span");
    store.className = "card-store";
    store.textContent = "Disponível: " + (prod.store || "Online");

    const btn = document.createElement("a");
    btn.className = "card-btn";
    btn.href = prod.link || "#";
    btn.target = "_blank";
    btn.rel = "noopener sponsored";
    btn.textContent = "Ver oferta";

    body.appendChild(cat);
    body.appendChild(h3);
    body.appendChild(priceRow);
    body.appendChild(store);
    body.appendChild(btn);

    card.appendChild(media);
    card.appendChild(body);
    return card;
  }

  const GAP = 20;

  function itemsPerView() {
    const width = el.track.clientWidth || el.carousel.clientWidth;
    if (width < 560) return 1;
    if (width < 900) return 2;
    if (width < 1180) return 3;
    return 4;
  }

  function updateCarouselSize() {
    const slides = el.track.children;
    if (!slides.length) return;
    const n = itemsPerView();
    const width = (el.track.clientWidth - GAP * (n - 1)) / n;
    Array.from(slides).forEach((s) => (s.style.width = width + "px"));
  }

  const stepWidth = () => {
    const slide = el.track.firstElementChild;
    return slide ? slide.offsetWidth + GAP : 0;
  };

  function updateCarouselArrows() {
    const max = el.track.scrollWidth - el.track.clientWidth;
    el.prevBtn.disabled = el.track.scrollLeft <= 1;
    el.nextBtn.disabled = el.track.scrollLeft >= max - 1;
  }

  el.track.addEventListener("scroll", updateCarouselArrows, { passive: true });
  el.prevBtn.addEventListener("click", () =>
    el.track.scrollBy({ left: -stepWidth(), behavior: "smooth" }));
  el.nextBtn.addEventListener("click", () =>
    el.track.scrollBy({ left: stepWidth(), behavior: "smooth" }));
  window.addEventListener("resize", () => { updateCarouselSize(); updateCarouselArrows(); });

  function getFiltered() {
    const q = state.query.trim().toLowerCase();
    return state.products.filter((p) => {
      if (q && !(p.name + " " + (p.description || "")).toLowerCase().includes(q)) return false;
      if (state.category !== "todas" && p.category !== state.category) return false;
      if (state.store !== "todas" && (p.store || "") !== state.store) return false;
      const range = PRICE_RANGES.find((r) => r.id === state.price);
      if (range && range.min != null) {
        if (p.price < range.min || p.price > range.max) return false;
      }
      return true;
    });
  }

  function applyFilters() {
    renderProducts(getFiltered());
    document.querySelectorAll("#categoryChips .chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.value === state.category));
    document.querySelectorAll("#priceChips .chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.value === state.price));
    document.querySelectorAll("#storeChips .chip").forEach((c) =>
      c.classList.toggle("active", c.dataset.value === state.store));
  }

  function renderChips() {
    const cats = ["todas", ...new Set(state.products.map((p) => p.category).filter(Boolean))];
    el.categoryChips.innerHTML = cats
      .map((c) => `<button type="button" class="chip" data-value="${c}">${c === "todas" ? "Todas" : c}</button>`)
      .join("");

    el.priceChips.innerHTML = PRICE_RANGES
      .map((r) => `<button type="button" class="chip" data-value="${r.id}">${r.label}</button>`)
      .join("");

    const stores = ["todas", ...new Set(state.products.map((p) => p.store).filter(Boolean))];
    el.storeChips.innerHTML = stores
      .map((s) => `<button type="button" class="chip" data-value="${s}">${s === "todas" ? "Todas" : s}</button>`)
      .join("");

    document.querySelectorAll(".filters .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const group = chip.closest(".filter-group").querySelector("h3").textContent.trim();
        const value = chip.dataset.value;
        if (group === "Categorias") state.category = value;
        else if (group === "Faixa de preço") state.price = value;
        else state.store = value;
        applyFilters();
      });
    });
  }

  function showToast(msg, type) {
    el.toast.textContent = msg;
    el.toast.className = "toast show " + (type || "");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (el.toast.className = "toast"), 2600);
  }

  function clearAll() {
    state.query = "";
    state.category = "todas";
    state.price = "all";
    state.store = "todas";
    el.searchInput.value = "";
    applyFilters();
  }

  el.searchBtn.addEventListener("click", () => { state.query = el.searchInput.value; applyFilters(); });
  el.searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") { state.query = el.searchInput.value; applyFilters(); }
    else if (el.searchInput.value === "") { state.query = ""; applyFilters(); }
  });
  el.clearFilters.addEventListener("click", clearAll);
  window.__clearAll = clearAll;

  async function init() {
    try {
      const res = await fetch(DATA_URL + "?_t=" + Date.now());
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      state.products = Array.isArray(data.products) ? data.products : [];
      if (!state.products.length) {
        el.count.textContent = "Nenhum produto cadastrado ainda.";
      }
      renderChips();
      applyFilters();
} catch (err) {
      console.error(err);
      el.track.innerHTML =
        '<div class="empty" style="flex:1 1 100%">' +
        '<p>Não foi possível carregar os produtos.</p>' +
        '<p style="margin-top:8px">Verifique se o arquivo <strong>products.json</strong> foi enviado junto com o site.</p></div>';
      el.count.textContent = "Erro ao carregar";
      showToast("Falha ao carregar products.json", "error");
    }
  }

  init();
})();