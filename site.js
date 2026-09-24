// Shared behaviour for the documentation pages: theme, menu, code blocks,
// table of contents and footer. Loaded in <head> so the theme applies
// before the first paint.
(function () {
  'use strict';

  var root = document.documentElement;

  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  } catch (e) {
    // storage blocked; follow the system theme
  }

  function currentTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit) return explicit;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch (e) {
      // ignore
    }
  }

  // -------------------------------------------------------------------------
  // Syntax highlighting: a small tokenizer, good enough for the snippets here.

  var STRING = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/;
  var KEYWORD = /\b(?:var|let|const|function|return|if|else|new|true|false|null|typeof|async|await|export|default|document|window)\b/;
  var NUMBER = /\b\d+(?:\.\d+)?\b/;
  var RULES = {
    html: [
      ['comment', /<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*/],
      ['string', STRING],
      ['tag', /<\/?[A-Za-z][\w:-]*|\/?>/],
      ['attr', /\b[\w-]+(?==)/],
      ['keyword', KEYWORD],
      ['number', NUMBER],
    ],
    js: [
      ['comment', /\/\*[\s\S]*?\*\/|\/\/[^\n]*/],
      ['string', STRING],
      ['keyword', KEYWORD],
      ['number', NUMBER],
    ],
    css: [
      ['comment', /\/\*[\s\S]*?\*\//],
      ['string', STRING],
      ['tag', /[.#]?[A-Za-z][\w-]*(?=[^{}\n]*\{)/],
      ['attr', /[\w-]+(?=\s*:)/],
      ['number', /#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|s)?\b/],
    ],
    bash: [
      ['comment', /#[^\n]*/],
      ['string', STRING],
      ['keyword', /\b(?:npx|npm|git|cd|wrangler|curl)\b/],
    ],
    toml: [
      ['comment', /#[^\n]*/],
      ['tag', /^\[[^\]\n]+\]/],
      ['string', STRING],
      ['attr', /^[\w.]+(?=\s*=)/],
      ['number', NUMBER],
    ],
  };
  var LABELS = { html: 'HTML', js: 'JavaScript', css: 'CSS', bash: 'Terminal', toml: 'wrangler.toml' };
  var compiled = {};

  function escapeHtml(text) {
    return text.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function highlight(text, lang) {
    var rules = RULES[lang];
    if (!rules) return escapeHtml(text);
    var re = compiled[lang];
    if (!re) {
      re = compiled[lang] = new RegExp(
        rules.map(function (rule) {
          return '(' + rule[1].source + ')';
        }).join('|'),
        'gm'
      );
    }
    var out = '';
    var last = 0;
    var match;
    re.lastIndex = 0;
    while ((match = re.exec(text))) {
      if (!match[0]) {
        re.lastIndex++;
        continue;
      }
      var type = 'plain';
      for (var i = 1; i < match.length; i++) {
        if (match[i] !== undefined) {
          type = rules[i - 1][0];
          break;
        }
      }
      out += escapeHtml(text.slice(last, match.index));
      out += '<span class="tok-' + type + '">' + escapeHtml(match[0]) + '</span>';
      last = re.lastIndex;
    }
    return out + escapeHtml(text.slice(last));
  }

  var COPY_ICON =
    '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      area.remove();
      if (ok) resolve();
      else reject(new Error('copy failed'));
    });
  }

  // Wraps a <pre> in a titled frame with a copy button and highlights it.
  function renderCode(pre) {
    var code = pre.querySelector('code') || pre;
    var lang = pre.getAttribute('data-lang') || 'html';
    var text = code.textContent.replace(/^\n+|\s+$/g, '');
    code.innerHTML = highlight(text, lang);

    if (pre.parentNode.classList.contains('code')) return;
    var frame = document.createElement('div');
    frame.className = 'code';
    var head = document.createElement('div');
    head.className = 'code-head';
    var title = document.createElement('span');
    title.textContent = pre.getAttribute('data-title') || LABELS[lang] || 'Code';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-btn';
    button.innerHTML = COPY_ICON + '<span>Copy</span>';
    button.addEventListener('click', function () {
      copyText(code.textContent).then(
        function () {
          button.classList.add('is-copied');
          button.lastChild.textContent = 'Copied';
          setTimeout(function () {
            button.classList.remove('is-copied');
            button.lastChild.textContent = 'Copy';
          }, 1800);
        },
        function () {
          button.lastChild.textContent = 'Press Ctrl+C';
          var range = document.createRange();
          range.selectNodeContents(code);
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      );
    });
    head.appendChild(title);
    head.appendChild(button);
    pre.parentNode.insertBefore(frame, pre);
    frame.appendChild(head);
    frame.appendChild(pre);
  }

  // -------------------------------------------------------------------------
  // Table of contents with scroll spy

  function buildToc() {
    var toc = document.querySelector('[data-toc]');
    var headings = document.querySelectorAll('.prose h2[id]');
    headings.forEach(function (heading) {
      var anchor = document.createElement('a');
      anchor.className = 'anchor';
      anchor.href = '#' + heading.id;
      anchor.setAttribute('aria-label', 'Link to this section');
      anchor.textContent = '#';
      heading.appendChild(anchor);
    });
    if (!toc || !headings.length) return;

    var list = document.createElement('ol');
    var links = {};
    headings.forEach(function (heading) {
      var item = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.getAttribute('data-toc-label') || heading.firstChild.textContent.trim();
      links[heading.id] = link;
      item.appendChild(link);
      list.appendChild(item);
    });
    toc.appendChild(list);

    // Highlight the last section whose top has scrolled past the nav bar.
    var sections = Array.prototype.map.call(headings, function (heading) {
      return { id: heading.id, el: heading.closest('section') || heading };
    });
    var ticking = false;
    function update() {
      ticking = false;
      var current = sections[0].id;
      var line = 140;
      sections.forEach(function (section) {
        if (section.el.getBoundingClientRect().top <= line) current = section.id;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = sections[sections.length - 1].id;
      }
      Object.keys(links).forEach(function (id) {
        links[id].classList.toggle('is-active', id === current);
      });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  // -------------------------------------------------------------------------

  function setupNav() {
    var nav = document.getElementById('nav');
    var toggle = document.querySelector('.menu-toggle');
    if (nav && toggle) {
      var setOpen = function (open) {
        nav.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      };
      toggle.addEventListener('click', function () {
        setOpen(!nav.classList.contains('is-open'));
      });
      nav.addEventListener('click', function (event) {
        if (event.target.closest('.nav-links a')) setOpen(false);
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') setOpen(false);
      });
    }
    document.querySelectorAll('.theme-toggle').forEach(function (button) {
      button.addEventListener('click', toggleTheme);
    });
  }

  function setupFooter() {
    var footerText = document.getElementById('footerText');
    if (footerText) {
      footerText.innerHTML =
        '© ' + new Date().getFullYear() +
        ' bKash Blogger Payment · Brainchild of <a href="https://sizan.me" target="_blank" rel="noopener noreferrer">Amirul Sizan</a>';
    }
  }

  window.site = { renderCode: renderCode, highlight: highlight, copyText: copyText };

  document.addEventListener('DOMContentLoaded', function () {
    setupNav();
    document.querySelectorAll('pre').forEach(renderCode);
    buildToc();
    setupFooter();
  });
})();
