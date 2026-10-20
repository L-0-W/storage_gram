(function () {
  const docs = window.DOCS;
  const contentEl = document.getElementById("content");
  const tocEl = document.getElementById("toc");
  const navEl = document.getElementById("nav");
  const searchEl = document.getElementById("search");
  const searchPop = document.getElementById("search-pop");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("backdrop");
  const menuBtn = document.getElementById("menu-btn");

  const flat = [];
  docs.nav.forEach((group) => {
    group.items.forEach((item) => flat.push({ ...item, group: group.label }));
  });

  const byId = Object.fromEntries(docs.functions.map((fn) => [fn.id, fn]));
  docs.functions.forEach((fn) => {
    fn.calledBy = [];
  });
  docs.functions.forEach((fn) => {
    (fn.calls || []).forEach((call) => {
      if (call.id && byId[call.id] && !byId[call.id].calledBy.includes(fn.id)) {
        byId[call.id].calledBy.push(fn.id);
      }
    });
  });

  const pageOfGroup = {
    main: "file-main",
    types: "file-types",
    manager: "file-manager",
    store: "file-store",
    macros: "file-macros",
  };

  function renderNav(active) {
    navEl.innerHTML = docs.nav
      .map((group) => {
        const links = group.items
          .map(
            (item) =>
              `<a class="nav-link${item.id === active ? " active" : ""}" href="#${item.id}">${item.title}</a>`
          )
          .join("");
        return `<div class="nav-label">${group.label}</div>${links}`;
      })
      .join("");
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function highlight(code) {
    const kw = new Set([
      "async", "await", "fn", "let", "mut", "pub", "struct", "enum", "impl", "use", "mod",
      "match", "if", "else", "return", "for", "in", "loop", "type", "trait", "self", "Self",
      "true", "false", "as", "where", "move", "dyn", "crate", "super", "ref",
    ]);
    let i = 0;
    let out = "";
    while (i < code.length) {
      if (code.startsWith("//", i)) {
        let j = code.indexOf("\n", i);
        if (j < 0) j = code.length;
        out += `<span class="tok-cm">${esc(code.slice(i, j))}</span>`;
        i = j;
        continue;
      }
      const c = code[i];
      if (c === '"') {
        let j = i + 1;
        while (j < code.length && code[j] !== '"') {
          if (code[j] === "\\") j += 1;
          j += 1;
        }
        j = Math.min(code.length, j + 1);
        out += `<span class="tok-str">${esc(code.slice(i, j))}</span>`;
        i = j;
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i + 1;
        while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j += 1;
        const word = code.slice(i, j);
        let cls = "";
        if (kw.has(word)) cls = "tok-kw";
        else if (/^[A-Z]/.test(word)) cls = "tok-ty";
        else if (code[j] === "(") cls = "tok-fn";
        out += cls ? `<span class="${cls}">${esc(word)}</span>` : esc(word);
        i = j;
        continue;
      }
      out += esc(c);
      i += 1;
    }
    return out;
  }

  function chip(call) {
    if (!call.id || !byId[call.id]) return `<span class="chip">${esc(call.name)}</span>`;
    const page = pageOfGroup[byId[call.id].group] || "funcoes";
    return `<a class="chip" href="#${page}/${call.id}">${esc(call.name)}</a>`;
  }

  function renderFunction(fn, open) {
    const callers = (fn.calledBy || [])
      .map((id) => chip({ id, name: byId[id].name }))
      .join("") || `<span class="muted">ninguém neste repositório</span>`;
    const calls = (fn.calls || []).map(chip).join("") || `<span class="muted">não chama outra função daqui</span>`;
    const pills = (fn.pills || []).map((p) => `<span class="pill ${p}">${p}</span>`).join("");
    return `<details class="fn" id="${fn.id}" ${open ? "open" : ""}>
      <summary>
        <span>
          <span class="fn-name">${esc(fn.name)}</span>
          <span class="fn-where">${esc(fn.where)}</span>
        </span>
        <span class="pills">${pills}</span>
      </summary>
      <div class="fn-body">
        <div class="sig">${esc(fn.sig)}</div>
        <p>${fn.summary}</p>
        ${fn.body || ""}
        <div class="meta">
          <b>Chamada por</b><div class="chips">${callers}</div>
          <b>Chama</b><div class="chips">${calls}</div>
        </div>
      </div>
    </details>`;
  }

  function mountFns(el) {
    const group = el.dataset.fns;
    const open = el.dataset.open === "1";
    const list = group === "all" ? docs.functions : docs.functions.filter((fn) => fn.group === group);
    const kindLabel = { tudo: "Tudo", fn: "Funções", type: "Tipos", enum: "Enums", trait: "Traits", macro: "Macros" };
    const tools = group === "all"
      ? `<div class="fn-tools"><input type="search" placeholder="Filtrar por nome, arquivo ou efeito" data-fn-filter /></div>
         <div class="filters" data-fn-kinds>
           ${Object.keys(kindLabel).map((k, i) => `<button type="button" data-kind="${k}" aria-pressed="${i === 0 ? "true" : "false"}">${kindLabel[k]}</button>`).join("")}
         </div>`
      : `<div class="fn-tools"><button type="button" data-toggle-fns>${open ? "Fechar todas" : "Abrir todas"}</button></div>`;
    el.innerHTML = tools + `<div data-fn-list></div>`;
    const listEl = el.querySelector("[data-fn-list]");
    let kind = "tudo";
    let query = "";

    function draw() {
      const shown = list.filter((fn) => {
        const kindOk = kind === "tudo" || fn.pills.includes(kind) || fn.kind === kind;
        const blob = `${fn.name} ${fn.where} ${fn.sig} ${fn.summary}`.toLowerCase();
        return kindOk && blob.includes(query);
      });
      listEl.innerHTML = shown.length
        ? shown.map((fn) => renderFunction(fn, open && group !== "all")).join("")
        : `<p class="muted">Nenhuma função com esse filtro.</p>`;
    }
    draw();

    const filter = el.querySelector("[data-fn-filter]");
    if (filter) {
      filter.addEventListener("input", () => {
        query = filter.value.trim().toLowerCase();
        draw();
      });
    }
    el.querySelectorAll("[data-kind]").forEach((btn) => {
      btn.addEventListener("click", () => {
        kind = btn.dataset.kind;
        el.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        draw();
      });
    });
    const toggle = el.querySelector("[data-toggle-fns]");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const items = [...listEl.querySelectorAll("details")];
        const shouldOpen = items.some((d) => !d.open);
        items.forEach((d) => { d.open = shouldOpen; });
        toggle.textContent = shouldOpen ? "Fechar todas" : "Abrir todas";
      });
    }
  }

  function renderBoard(state) {
    const mem = (state.mem || [])
      .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
      .join("");
    const disk = (state.disk || [])
      .map(([k, v]) => `<div class="fileline"><b>${esc(k)}</b><span>${esc(v)}</span></div>`)
      .join("");
    const topics = state.topics || [];
    const topicHtml = topics.length
      ? topics.map((t) => `<span class="topic${t.active ? " on" : ""}">${esc(t.title)}</span>`).join("")
      : `<span class="topic">sem tópicos</span>`;
    const bubbles = topics.flatMap((t) => (t.messages || []).map((m) => ({ ...m, topic: t.title })));
    const bubbleHtml = bubbles.length
      ? bubbles.map((m) => `<div class="bubble"><em>${esc(m.topic)} · ${esc(m.from)}</em>${esc(m.text)}</div>`).join("")
      : "";
    return `<div class="board">
      <section class="panel mem"><header>Memória do processo</header><dl>${mem}</dl></section>
      <section class="panel disk"><header>Disco local</header>${disk}</section>
      <section class="panel tg"><header>Telegram</header>
        <div class="phone">
          <div class="phone-top">${esc(state.channel || "nenhum canal")}<span class="phone-sub">${state.channel ? "fórum · banco" : "conta ainda sem banco"}</span></div>
          <div class="topics">${topicHtml}</div>
          <div class="bubbles">${bubbleHtml}</div>
        </div>
        <p class="note">${esc(state.note || "")}</p>
      </section>
    </div>`;
  }

  function mountFlow(el) {
    const flow = docs.flows[el.dataset.flow];
    if (!flow) return;
    let index = 0;
    el.innerHTML = `<div class="flow">
      <div class="flow-head"><strong data-count></strong><span class="muted">${esc(flow.title)}</span></div>
      <ol class="flow-rail"></ol>
      <div class="flow-layout">
        <div class="flow-copy"></div>
        <div data-board></div>
      </div>
      <div class="row-actions">
        <button type="button" data-prev>Passo anterior</button>
        <button type="button" data-next>Próximo passo</button>
      </div>
    </div>`;
    const rail = el.querySelector(".flow-rail");
    rail.innerHTML = flow.steps
      .map((step, i) => `<li><button type="button" data-step="${i}">${i + 1}. ${esc(step.label)}</button></li>`)
      .join("");

    function show(i) {
      index = (i + flow.steps.length) % flow.steps.length;
      const step = flow.steps[index];
      el.querySelector("[data-count]").textContent = `Passo ${index + 1} de ${flow.steps.length}`;
      el.querySelector(".flow-copy").innerHTML = `<h3>${esc(step.title)}</h3>${step.html}`;
      el.querySelector("[data-board]").innerHTML = renderBoard(step.state);
      rail.querySelectorAll("button").forEach((btn) => {
        btn.classList.toggle("active", Number(btn.dataset.step) === index);
      });
      highlightIn(el.querySelector(".flow-copy"));
    }
    rail.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-step]");
      if (btn) show(Number(btn.dataset.step));
    });
    el.querySelector("[data-prev]").addEventListener("click", () => show(index - 1));
    el.querySelector("[data-next]").addEventListener("click", () => show(index + 1));
    show(0);
  }

  function mountArch(el) {
    const cols = ["mem", "disk", "tg"].map((col) => {
      const title = { mem: "No processo", disk: "No disco", tg: "No Telegram" }[col];
      const nodes = docs.arch
        .filter((n) => n.col === col)
        .map((n) => `<button type="button" class="node" data-arch-id="${n.id}"><b>${esc(n.title)}</b><span>${esc(n.sub)}</span></button>`)
        .join("");
      return `<div class="arch-col ${col}"><h3>${title}</h3>${nodes}</div>`;
    }).join("");
    el.innerHTML = `<div class="arch">${cols}</div><div class="arch-detail" data-arch-detail></div>`;
    function select(id) {
      const node = docs.arch.find((n) => n.id === id) || docs.arch[0];
      el.querySelectorAll(".node").forEach((btn) => btn.classList.toggle("active", btn.dataset.archId === node.id));
      el.querySelector("[data-arch-detail]").innerHTML = `<span class="pill">${esc(node.kicker)}</span><h3>${esc(node.title)}</h3>${node.html}`;
    }
    el.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-arch-id]");
      if (btn) select(btn.dataset.archId);
    });
    select(docs.arch[0].id);
  }

  function mountTree(el) {
    function branch(node) {
      const kids = (node.children || []).map(branch).join("");
      return `<li><button type="button" data-tree-id="${node.id || ""}">${esc(node.name)}</button>${kids ? `<ul>${kids}</ul>` : ""}</li>`;
    }
    el.innerHTML = `<div class="tree"><ul>${branch(docs.tree)}</ul></div><div class="tree-detail"></div>`;
    function select(id) {
      el.querySelectorAll("button").forEach((btn) => btn.classList.toggle("active", btn.dataset.treeId === id));
      const fn = byId[id];
      const detail = el.querySelector(".tree-detail");
      if (!fn) {
        detail.innerHTML = `<p class="muted">Esse nó é uma chamada de biblioteca. O efeito dela está descrito no fluxo que a usa.</p>`;
        return;
      }
      const page = pageOfGroup[fn.group] || "funcoes";
      detail.innerHTML = `<article class="card"><span class="eyebrow">${esc(fn.where)}</span><strong>${esc(fn.name)}</strong><p>${fn.summary}</p><p><a href="#${page}/${fn.id}">Abrir a referência completa</a></p></article>`;
    }
    el.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-tree-id]");
      if (!btn) return;
      select(btn.dataset.treeId);
    });
    select("fn-main");
  }

  function mountRepl(el) {
    el.innerHTML = `<div class="repl">
      <p>O loop de <code>main</code> não interpreta um comando. Ele procura três substrings, em sequência, na linha inteira. Maiúsculas não entram. Uma linha pode disparar mais de um <code>if</code>.</p>
      <input data-repl-input value="user" aria-label="Linha digitada no stdin" />
      <div class="row-actions">
        <button type="button" data-sample="user">user</button>
        <button type="button" data-sample="games">games</button>
        <button type="button" data-sample="get">get</button>
        <button type="button" data-sample="user games">user games</button>
        <button type="button" data-sample="User">User</button>
        <button type="button" data-sample="images">images</button>
      </div>
      <div class="console" data-repl-out></div>
    </div>`;
    const input = el.querySelector("[data-repl-input]");
    const out = el.querySelector("[data-repl-out]");
    function run() {
      const buffer = input.value + "\n";
      const lines = [`<span class="dim">stdin →</span> ${esc(input.value)}`, esc(buffer).replace(/\n$/, "")];
      const notes = [];
      if (buffer.includes("user")) {
        lines.push("nome", "nome: Luiz", "idade: 10");
        notes.push("insert::<User> manda essa mensagem para o tópico User, respondendo o id do tópico.");
      }
      if (buffer.includes("games")) {
        lines.push("path", "path: ./re9", "price: 90");
        notes.push("insert::<Games> faz o mesmo no tópico Games. Os dois ifs são independentes.");
      }
      if (buffer.includes("get")) {
        lines.push("TOPIC: User", " ------- ", "MESSAGE: Não tem", "TOPIC: Images", " ------- ", "MESSAGE: Não tem", "TOPIC: Games", " ------- ", "MESSAGE: Não tem");
        notes.push("get não lê as linhas inseridas. Ele lista os tópicos. Mensagem de serviço cai no texto fixo \"Não tem\".");
      }
      if (!buffer.includes("user") && !buffer.includes("games") && !buffer.includes("get")) {
        notes.push("Nenhum if entrou. A tabela Images existe, mas não há ramo para ela. \"User\" com U maiúsculo também não entra.");
      }
      lines.push("", `<span class="dim">// em seguida std::thread::sleep de 5 segundos, dentro do runtime do Tokio</span>`);
      notes.forEach((n) => lines.push(`<span class="dim">// ${esc(n)}</span>`));
      out.innerHTML = lines.join("\n");
    }
    input.addEventListener("input", run);
    el.querySelectorAll("[data-sample]").forEach((btn) => {
      btn.addEventListener("click", () => {
        input.value = btn.dataset.sample;
        run();
      });
    });
    run();
  }

  function parseTable(line) {
    const parts = line.split("|");
    if (parts.length < 3) {
      return { error: "Menos de 3 colunas. search_table indexa [0], [1] e [2] sem checar o tamanho, então essa linha derruba o processo." };
    }
    const name = parts[0];
    const peer = parts[2];
    const fields = parts[1].trim().split(",").filter((item) => item.length).map((item) => {
      const cut = item.indexOf(":");
      if (cut < 0) return { name: item, type: "(panic: split_once falha)" };
      return { name: item.slice(0, cut), type: item.slice(cut + 1) };
    });
    const peerNote = Number.isNaN(Number(peer)) ? "o parse::<i32> do peer entra em panic" : `topic id ${peer}`;
    return { name, fields, peerNote };
  }

  function mountSchema(el) {
    el.innerHTML = `<div class="lab">
      <p>O formato real escrito por <code>insert_table</code> é <code>nome|campo: tipo,campo: tipo|id</code>. O espaço depois dos dois-pontos faz parte do tipo quando a linha volta do disco.</p>
      <input data-schema value="User|nome: String,idade: u8|4821" aria-label="Linha de schema.table" />
      <div data-schema-out></div>
    </div>`;
    const input = el.querySelector("[data-schema]");
    const out = el.querySelector("[data-schema-out]");
    function draw() {
      const parsed = parseTable(input.value);
      if (parsed.error) {
        out.innerHTML = `<aside class="callout danger"><span class="bar"></span><div><strong>Panic</strong><div>${esc(parsed.error)}</div></div></aside>`;
        return;
      }
      const rows = parsed.fields
        .map((f) => `<tr><td><code>${esc(f.name)}</code></td><td><code>${esc(JSON.stringify(f.type))}</code></td></tr>`)
        .join("");
      out.innerHTML = `<table><thead><tr><th>Campo</th><th>Tipo como a memória guarda</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">Tabela <code>${esc(parsed.name)}</code> · ${esc(parsed.peerNote)}. As aspas mostram o espaço à esquerda do tipo.</p>`;
    }
    input.addEventListener("input", draw);
    draw();
  }

  function highlightIn(root) {
    root.querySelectorAll("pre.rust code").forEach((code) => {
      if (code.dataset.ready === "1") return;
      const raw = code.textContent;
      code.dataset.raw = raw;
      code.innerHTML = highlight(raw);
      code.dataset.ready = "1";
    });
  }

  function mount(root) {
    root.querySelectorAll("[data-flow]").forEach(mountFlow);
    root.querySelectorAll("[data-fns]").forEach(mountFns);
    root.querySelectorAll("[data-arch]").forEach(mountArch);
    root.querySelectorAll("[data-tree]").forEach(mountTree);
    root.querySelectorAll("[data-repl]").forEach(mountRepl);
    root.querySelectorAll("[data-schema-lab]").forEach(mountSchema);
    highlightIn(root);
    root.querySelectorAll(".copy").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const code = btn.closest(".code").querySelector("code");
        const text = code.dataset.raw || code.textContent;
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = "Copiado";
        } catch (err) {
          btn.textContent = "Seleciona e copia";
        }
        setTimeout(() => { btn.textContent = "Copiar"; }, 1200);
      });
    });
  }

  let tocObserver = null;
  function renderToc(page) {
    if (tocObserver) tocObserver.disconnect();
    const heads = page.sections || [];
    if (!heads.length) {
      tocEl.innerHTML = `<div class="toc-label">Nesta página</div><p class="toc-empty">Sem seções.</p>`;
      return;
    }
    tocEl.innerHTML = `<div class="toc-label">Nesta página</div>${heads
      .map((s) => `<a class="toc-link" href="#${page.id}/${s.id}" data-toc="${s.id}">${s.title}</a>`)
      .join("")}`;
    const links = [...tocEl.querySelectorAll("[data-toc]")];
    tocObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = visible.target.id;
      links.forEach((link) => link.classList.toggle("active", link.dataset.toc === id));
    }, { root: contentEl, rootMargin: "-10% 0px -70% 0px", threshold: [0, 1] });
    heads.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) tocObserver.observe(el);
    });
  }

  function pager(id) {
    const index = flat.findIndex((item) => item.id === id);
    const prev = flat[index - 1];
    const next = flat[index + 1];
    return `<nav class="pager">
      ${prev ? `<a href="#${prev.id}"><span>Anterior</span><strong>${prev.title}</strong></a>` : "<span></span>"}
      ${next ? `<a class="next" href="#${next.id}"><span>Próxima</span><strong>${next.title}</strong></a>` : "<span></span>"}
    </nav>`;
  }

  function renderPage(pageId, anchor) {
    const page = docs.pages.find((p) => p.id === pageId) || docs.pages[0];
    renderNav(page.id);
    const sections = (page.sections || [])
      .map((s) => `<section class="section" id="${s.id}"><h2>${s.title}</h2>${s.html}</section>`)
      .join("");
    contentEl.innerHTML = `<article class="page">
      <p class="kicker">${page.kicker || ""}</p>
      <h1>${page.title}</h1>
      <p class="lead">${page.lead || ""}</p>
      ${sections}
      ${pager(page.id)}
    </article>`;
    mount(contentEl);
    renderToc(page);
    document.title = `${page.title} — StoreGram`;
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) {
        if (el.tagName === "DETAILS") el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    } else {
      contentEl.scrollTop = 0;
    }
    closeMenu();
  }

  function parseHash() {
    const raw = (location.hash || "#visao").replace(/^#/, "");
    const [page, anchor] = raw.split("/");
    return { page: page || "visao", anchor: anchor || "" };
  }

  function closeMenu() {
    sidebar.classList.remove("open");
    backdrop.hidden = true;
  }

  const searchItems = [];
  docs.pages.forEach((page) => {
    searchItems.push({ href: `#${page.id}`, title: page.title, text: page.lead || page.kicker });
    (page.sections || []).forEach((s) => {
      const text = s.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      searchItems.push({ href: `#${page.id}/${s.id}`, title: s.title, text: `${page.title} · ${text.slice(0, 140)}` });
    });
  });
  docs.functions.forEach((fn) => {
    const page = pageOfGroup[fn.group] || "funcoes";
    searchItems.push({ href: `#${page}/${fn.id}`, title: fn.name, text: `${fn.where} · ${fn.summary}` });
  });

  let searchIndex = 0;
  function renderSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      searchPop.hidden = true;
      searchPop.innerHTML = "";
      return;
    }
    const hits = searchItems.filter((item) => `${item.title} ${item.text}`.toLowerCase().includes(q)).slice(0, 8);
    searchIndex = 0;
    if (!hits.length) {
      searchPop.hidden = false;
      searchPop.innerHTML = `<a>Nada encontrado para “${esc(query)}”.</a>`;
      return;
    }
    searchPop.hidden = false;
    searchPop.innerHTML = hits
      .map((hit, i) => `<a href="${hit.href}" class="${i === 0 ? "active" : ""}"><strong>${esc(hit.title)}</strong><small>${esc(hit.text)}</small></a>`)
      .join("");
  }

  searchEl.addEventListener("input", () => renderSearch(searchEl.value));
  searchEl.addEventListener("keydown", (event) => {
    const links = [...searchPop.querySelectorAll("a[href]")];
    if (event.key === "Escape") {
      searchPop.hidden = true;
      return;
    }
    if (!links.length || searchPop.hidden) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      searchIndex = (searchIndex + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links.forEach((a, i) => a.classList.toggle("active", i === searchIndex));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      links[searchIndex].click();
      searchPop.hidden = true;
      searchEl.blur();
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-wrap")) searchPop.hidden = true;
  });
  function isTextField(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (isTextField(document.activeElement)) return;
    event.preventDefault();
    searchEl.focus();
  });

  menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    backdrop.hidden = !sidebar.classList.contains("open");
  });
  backdrop.addEventListener("click", closeMenu);

  window.addEventListener("hashchange", () => {
    searchPop.hidden = true;
    const { page, anchor } = parseHash();
    renderPage(page, anchor);
  });

  const initial = parseHash();
  renderPage(initial.page, initial.anchor);
})();
