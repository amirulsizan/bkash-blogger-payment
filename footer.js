(function() {
  const year = new Date().getFullYear();
  const footerTextEl = document.getElementById('footerText');
  if (footerTextEl) {
    footerTextEl.innerHTML = '© ' + year + ' bKash Blogger Payment | Brainchild of <a href="https://sizan.me" target="_blank" rel="noopener noreferrer">Amirul Sizan</a>';
  }
})();
