(function () {
  class CSSSearch {
    constructor() {
      this.win = window.top;
      this.doc = this.win.document;
      this.targetPath = [
        "/config/pages/custom-css",
        "/config/pages/custom-css-popup",
      ];
      this.cssUrl = "https://cdn.jsdelivr.net/gh/willmyerscode/css-search@0/css-search.min.css";
      this.pollIntervalMs = 400;
      this.locationPollHandle = null;
      this.lastPathname = null;
      this.inserted = false;
      this.sizerEl = null;
      this.codeRootEl = null;
      this.inputEl = null;
      this.prevBtn = null;
      this.nextBtn = null;
      this.countEl = null;
      this.creditEl = null;
      this.currentMatches = [];
      this.currentIndex = -1;
      this.cmRootEl = null;
      this.cm = null;
      this.cmScrollEl = null;
      this.cmMarks = [];
      this.textareaEl = null;
      this.toggleBtn = null;
      this.closeBtn = null;
      this.wrapperEl = null;
      this.keydownHandler = null;
    }

    init() {
      try {
        this.startWatchingParentLocation();
        this.handleLocationChange(this.win.location.pathname);
      } catch (error) {
        console.warn("CSSSearch init failed:", error);
      }
    }

    startWatchingParentLocation() {
      if (this.locationPollHandle) return;
      this.lastPathname = this.win.location.pathname;
      this.locationPollHandle = this.win.setInterval(() => {
        const currentPathname = this.win.location.pathname;
        if (currentPathname !== this.lastPathname) {
          this.lastPathname = currentPathname;
          this.handleLocationChange(currentPathname);
        }
      }, this.pollIntervalMs);
    }

    async handleLocationChange(pathname) {
      if (this.targetPath.includes(pathname)) {
        await this.ensureSearchBoxInserted();
      } else if (this.inserted) {
        this.removeSearchBox();
      }
    }

    async ensureSearchBoxInserted() {
      if (this.inserted) return;
      const existing = this.doc.getElementById("css-search-container");
      if (existing) {
        this.inserted = true;
        return;
      }

      // Ensure external stylesheet is loaded before rendering UI
      await this.ensureExternalStylesInjected();

      const container = this.doc.createElement("div");
      container.id = "css-search-container";

      // Toggle button (visible in hidden state)
      const toggle = this.doc.createElement("button");
      toggle.type = "button";
      toggle.className = "css-search-toggle icon-container";
      toggle.setAttribute("aria-label", "Open search");
      toggle.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search-icon lucide-search"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>';
      this.toggleBtn = toggle;

      // Absolute-positioned wrapper for the full UI so it doesn't affect layout
      const wrapper = this.doc.createElement("div");
      wrapper.className = "css-search-wrapper";
      this.wrapperEl = wrapper;

      const bar = this.doc.createElement("div");
      bar.className = "css-search-bar";

      const inputContainer = this.doc.createElement("div");
      inputContainer.classList.add("css-search-input-container");
      const input = this.doc.createElement("input");
      input.type = "search";
      input.id = "css-search-input";
      input.placeholder = "Search CSS…";
      this.inputEl = input;
      inputContainer.appendChild(input);
      bar.appendChild(inputContainer);

      const nav = this.doc.createElement("div");
      nav.className = "css-search-nav";

      const prev = this.doc.createElement("button");
      prev.type = "button";
      prev.className = "css-search-arrow icon-container";
      prev.setAttribute("aria-label", "Previous result");
      prev.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-up-icon lucide-chevron-up"><path d="m18 15-6-6-6 6"/></svg>';

      this.prevBtn = prev;

      const count = this.doc.createElement("span");
      count.id = "css-search-count";
      count.textContent = "0/0";
      this.countEl = count;

      const next = this.doc.createElement("button");
      next.type = "button";
      next.className = "css-search-arrow icon-container";
      next.setAttribute("aria-label", "Next result");
      next.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down-icon lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>';
      this.nextBtn = next;

      const close = this.doc.createElement("button");
      close.type = "button";
      close.className = "css-search-close icon-container";
      close.setAttribute("aria-label", "Close search");
      close.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      this.closeBtn = close;

      nav.appendChild(prev);
      inputContainer.appendChild(count);
      nav.appendChild(next);
      nav.appendChild(close);
      bar.appendChild(nav);

      const credit = this.doc.createElement("p");
      credit.className = "css-search-credit";
      credit.innerHTML = `
        <span class="css-search-credit-text">built by will-myers.com</span>
        <span class="css-search-credit-text"><a href="https://Will-Myers.com" target="_blank" rel="noopener noreferrer">see more tools</a></span>`;

      this.creditEl = credit;

      wrapper.appendChild(bar);
      wrapper.appendChild(credit);
      container.appendChild(toggle);
      container.appendChild(wrapper);

      // Place inside the closest CodeMirror sizer
      this.sizerEl = this.doc.querySelector(".CodeMirror-wrap");
      if (!this.sizerEl) {
        // Fallback to body if sizer is not found
        console.log("No CodeMirror-sizer found, inserting into body");
        return;
        // this.doc.body.prepend(container);
      } else {
        this.sizerEl.prepend(container);
      }
      this.codeRootEl = this.sizerEl
        ? this.sizerEl.querySelector(".CodeMirror-code")
        : null;
      this.cmRootEl = this.sizerEl ? this.sizerEl.closest(".CodeMirror") : null;
      this.cm =
        this.cmRootEl && this.cmRootEl.CodeMirror
          ? this.cmRootEl.CodeMirror
          : null;
      this.cmScrollEl = this.cmRootEl
        ? this.cmRootEl.querySelector(".CodeMirror-scroll")
        : null;
      this.textareaEl =
        this.cm && typeof this.cm.getValue === "function"
          ? typeof this.cm.getTextArea === "function"
            ? this.cm.getTextArea()
            : null
          : this.doc.querySelector(".u-field-wrapper textarea") || null;

      // Bind search
      input.addEventListener("input", e => {
        const term =
          e.target && e.target.value ? String(e.target.value).trim() : "";
        if (!this.codeRootEl && !this.cm) return;
        if (!term) {
          this.removeHighlights();
          return;
        }
        this.highlightTerm(term);
      });
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.goToNext();
        }
      });
      prev.addEventListener("click", () => this.goToPrev());
      next.addEventListener("click", () => this.goToNext());
      toggle.addEventListener("click", () => this.setOpen(true));
      close.addEventListener("click", () => this.setOpen(false));
      this.addGlobalKeydownHandler();
      this.inserted = true;
      this.setOpen(false);
    }

    ensureExternalStylesInjected() {
      return new Promise((resolve, reject) => {
        const head = this.doc.head || this.doc.getElementsByTagName("head")[0];
        if (!head) {
          resolve();
          return;
        }
        const existingLink = this.doc.getElementById("css-search-stylesheet");
        if (existingLink) {
          resolve();
          return;
        }
        const link = this.doc.createElement("link");
        link.id = "css-search-stylesheet";
        link.rel = "stylesheet";
        link.href = this.cssUrl;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        head.appendChild(link);
      });
    }

    removeSearchBox() {
      const existing = this.doc.getElementById("css-search-container");
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
      // Also clear any remaining highlights
      this.removeHighlights();
      this.removeGlobalKeydownHandler();
      this.inserted = false;
    }

    addGlobalKeydownHandler() {
      if (this.keydownHandler) return;
      this.keydownHandler = event => {
        try {
          const key = (event.key || "").toLowerCase();
          const isFindShortcut =
            key === "f" && (event.metaKey || event.ctrlKey);
          if (!isFindShortcut) return;

          // Ignore if focus is within our own search UI
          const container = this.doc.getElementById("css-search-container");
          const activeEl = this.doc.activeElement;
          if (container && activeEl && container.contains(activeEl)) return;

          // Only handle when focus is within the CodeMirror area/sizer
          const isInCodeArea =
            (this.sizerEl && activeEl && this.sizerEl.contains(activeEl)) ||
            (this.cmRootEl && activeEl && this.cmRootEl.contains(activeEl));
          if (!isInCodeArea) return;

          event.preventDefault();
          try {
            event.stopImmediatePropagation();
          } catch (_e) {}
          try {
            event.stopPropagation();
          } catch (_e) {}
          const isShown =
            container && container.classList.contains("css-search--shown");
          this.setOpen(!isShown);
        } catch (_e) {}
      };
      this.win.addEventListener("keydown", this.keydownHandler, true);
    }

    removeGlobalKeydownHandler() {
      if (!this.keydownHandler) return;
      try {
        this.win.removeEventListener("keydown", this.keydownHandler, true);
      } catch (_e) {}
      this.keydownHandler = null;
    }

    highlightTerm(term) {
      if (this.cm) {
        this.highlightUsingCodeMirror(term);
        return;
      }
      if (!this.codeRootEl) return;
      this.removeHighlights();
      const safeTerm = this.escapeRegExp(term);
      if (!safeTerm) return;
      const regex = new RegExp(safeTerm, "gi");
      const walker = this.doc.createTreeWalker(
        this.codeRootEl,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: node => {
            if (!node.nodeValue || !node.nodeValue.trim())
              return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );
      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }
      let firstHit = null;
      const allMarks = [];
      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes[i];
        const created = this.wrapMatchesInTextNode(node, regex);
        if (created && created.length > 0) {
          allMarks.push(...created);
        }
        if (!firstHit && created && created.length > 0) {
          firstHit = created[0];
        }
      }
      this.currentMatches = allMarks;
      if (this.currentMatches.length > 0) {
        this.currentIndex = 0;
        this.setActiveHit(this.currentIndex, true);
      } else {
        this.currentIndex = -1;
        this.updateCounter();
      }
    }

    removeHighlights() {
      if (!this.codeRootEl) return;
      const marks = this.codeRootEl.querySelectorAll(".css-search-hit");
      if (!marks || marks.length === 0) return;
      marks.forEach(mark => {
        const parent = mark.parentNode;
        if (!parent) return;
        const textNode = this.doc.createTextNode(mark.textContent || "");
        parent.replaceChild(textNode, mark);
        parent.normalize();
      });
      this.currentMatches = [];
      this.currentIndex = -1;
      this.updateCounter();
    }

    wrapMatchesInTextNode(textNode, regex) {
      const originalText = textNode.nodeValue;
      if (!originalText) return [];
      if (!regex.test(originalText)) return [];
      regex.lastIndex = 0;
      const fragment = this.doc.createDocumentFragment();
      let lastIndex = 0;
      const createdMarks = [];
      let match;
      while ((match = regex.exec(originalText)) !== null) {
        const matchStartIndex = match.index;
        const matchText = match[0];
        if (matchStartIndex > lastIndex) {
          fragment.appendChild(
            this.doc.createTextNode(
              originalText.slice(lastIndex, matchStartIndex)
            )
          );
        }
        const mark = this.doc.createElement("mark");
        mark.className = "css-search-hit";
        mark.textContent = matchText;
        fragment.appendChild(mark);
        createdMarks.push(mark);
        lastIndex = matchStartIndex + matchText.length;
      }
      if (lastIndex < originalText.length) {
        fragment.appendChild(
          this.doc.createTextNode(originalText.slice(lastIndex))
        );
      }
      const parent = textNode.parentNode;
      if (parent) {
        parent.replaceChild(fragment, textNode);
      }
      return createdMarks;
    }

    escapeRegExp(input) {
      return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    destroy() {
      this.removeSearchBox();
      this.win.clearInterval(this.locationPollHandle);
      this.locationPollHandle = null;
    }

    setOpen(isShown) {
      const container = this.doc.getElementById("css-search-container");
      if (!container) return;
      container.classList.toggle("css-search--shown", !!isShown);
      container.classList.toggle("css-search--hidden", !isShown);
      if (isShown && this.inputEl) {
        try {
          this.inputEl.focus({preventScroll: true});
          this.inputEl.select && this.inputEl.select();
        } catch (_e) {}
        try {
          this.win.requestAnimationFrame(() => {
            try {
              this.inputEl && this.inputEl.focus({preventScroll: true});
              this.inputEl && this.inputEl.select && this.inputEl.select();
            } catch (_ee) {}
          });
        } catch (_e) {}
      } else {
        this.removeHighlights();
      }
    }

    // ===== CodeMirror-backed search/highlight =====
    highlightUsingCodeMirror(term) {
      if (!this.cm) return;
      this.clearCmMarks();
      const text =
        typeof this.cm.getValue === "function"
          ? this.cm.getValue()
          : this.textareaEl
          ? this.textareaEl.value
          : "";
      const safeTerm = this.escapeRegExp(term);
      if (!safeTerm) return;
      const regex = new RegExp(safeTerm, "gi");
      const ranges = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;
        const from = this.cm.posFromIndex(startIndex);
        const to = this.cm.posFromIndex(endIndex);
        const marker = this.cm.markText(from, to, {
          className: "css-search-hit",
        });
        this.cmMarks.push(marker);
        ranges.push({from: from, to: to});
      }
      this.currentMatches = ranges;
      if (this.currentMatches.length > 0) {
        this.currentIndex = 0;
        this.setActiveHit(this.currentIndex, true);
      } else {
        this.currentIndex = -1;
        this.updateCounter();
      }
    }

    clearCmMarks() {
      if (this.cmMarks && this.cmMarks.length) {
        for (let i = 0; i < this.cmMarks.length; i++) {
          try {
            this.cmMarks[i].clear();
          } catch (_e) {}
        }
      }
      this.cmMarks = [];
      if (this.cm && typeof this.cm.setSelection === "function") {
        try {
          this.cm.setSelection({line: 0, ch: 0}, {line: 0, ch: 0});
        } catch (_e) {}
      }
    }

    updateCounter() {
      if (!this.countEl) return;
      const total = this.currentMatches.length;
      const indexDisplay =
        total > 0 && this.currentIndex >= 0 ? this.currentIndex + 1 : 0;
      this.countEl.textContent = indexDisplay + "/" + total;
    }

    setActiveHit(index, shouldScroll) {
      if (!this.currentMatches || this.currentMatches.length === 0) return;
      const clamped = Math.max(
        0,
        Math.min(index, this.currentMatches.length - 1)
      );
      this.currentIndex = clamped;
      const active = this.currentMatches[this.currentIndex];

      if (this.cm) {
        try {
          if (typeof this.cm.setSelection === "function") {
            this.cm.setSelection(active.from, active.to);
          }
          if (shouldScroll && typeof this.cm.scrollIntoView === "function") {
            this.cm.scrollIntoView({from: active.from, to: active.to}, 80);
          }
        } catch (_e) {}
      } else {
        // DOM fallback
        this.currentMatches.forEach(
          el => el.classList && el.classList.remove("css-search-hit--active")
        );
        if (active && active.classList) {
          active.classList.add("css-search-hit--active");
          if (shouldScroll && typeof active.scrollIntoView === "function") {
            try {
              active.scrollIntoView({
                block: "center",
                inline: "nearest",
                behavior: "instant",
              });
            } catch (_ee) {
              active.scrollIntoView();
            }
          }
        }
      }
      this.updateCounter();
    }

    goToNext() {
      if (!this.currentMatches || this.currentMatches.length === 0) return;
      const nextIndex = (this.currentIndex + 1) % this.currentMatches.length;
      this.setActiveHit(nextIndex, true);
    }

    goToPrev() {
      if (!this.currentMatches || this.currentMatches.length === 0) return;
      const prevIndex =
        (this.currentIndex - 1 + this.currentMatches.length) %
        this.currentMatches.length;
      this.setActiveHit(prevIndex, true);
    }
  }

  const isBackend = window.top !== window.self;

  if (isBackend) {
    const cssSearch = new CSSSearch();
    cssSearch.init();
  }
})();
