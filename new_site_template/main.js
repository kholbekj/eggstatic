document.addEventListener('DOMContentLoaded', init);

function init() {
  const darkModeElement = document.getElementById('dark-mode');
  const storedTheme = localStorage.getItem('theme');
  const browserDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (storedTheme) {
    if (storedTheme == 'dark') {
      darkModeElement.checked = true;
      document.querySelector('html').setAttribute('data-theme', 'dark');
    } else {
      darkModeElement.checked = false;
      document.querySelector('html').setAttribute('data-theme', 'light');
    }
  } else if (browserDarkMode) {
    darkModeElement.checked = true;
    document.querySelector('html').setAttribute('data-theme', 'dark');
  }
  darkModeElement.addEventListener('click', function () {
    toggleDarkMode();
  });

  const urlParams = new URLSearchParams(window.location.search);
  const path = urlParams.get('path');

  if (path) {
    replaceContent(path, false);
  } else {
    loadIndexContent();
  }

  // If the user navigates back or forward, we want to replace the content
  window.onpopstate = function (event) {
    window.location.reload();
  };

};

function loadIndexContent() {
  // Handle blob URLs the same way as replaceContent()
  if (window.location.href.startsWith('blob:') && localStorage.getItem('siteMap') !== null) {
    var siteMap = new Map(JSON.parse(localStorage.getItem('siteMap')));
    var fileName = 'index.md';
    var rootUrl = fileName.startsWith('/') ? fileName : '/' + fileName;
    var url = siteMap.get(rootUrl);
  } else {
    var url = 'index.md';
  }

  fetch(url)
    .then((response) => response.text())
    .then((text) => {
      const main = document.querySelector('main');
      const content = marked.parse(text);
      main.innerHTML = content;

      evalScripts(main);
      replaceLinks();
    })
    .catch((error) => {
      console.error('Error loading index.md:', error);
      // Fallback content if index.md is not found
      const main = document.querySelector('main');
      main.innerHTML = '<h1>Welcome!</h1><p>Create an index.md file to customize this page.</p>';
      replaceLinks();
    });
}

function replaceLinks() {
  document.querySelectorAll('a').forEach(function (link) {
    // We look first for the data-original-url attribute, if it's not present we look for the href attribute
    // This is because the editor uses blob urls which do not have file endings
    if (link.getAttribute('href').endsWith('.md')) {
      link.addEventListener('click', function (event) {
        event.preventDefault();

        // adding a timestamp helps prevent caching. This is not needed with the editor, but when using a server
        //const url = this.getAttribute('href') // + '?t=' + new Date().getTime();
        if (window.location.href.startsWith('blob:') && localStorage.getItem('siteMap') !== null) {
          var siteMap = new Map(JSON.parse(localStorage.getItem('siteMap')));
          var fileName = this.getAttribute('href')
          var rootUrl = fileName.startsWith('/') ? fileName : '/' + fileName;
          var url = siteMap.get(rootUrl);
        } else {
          var url = this.getAttribute('href');
        }
        replaceContent(url);
      });
    }
  });
}
function replaceContent(url, updatePath = true) {
  fetch(url)
    .then((response) => response.text())
    .then((text) => {
      main = document.querySelector('main');

      var content = marked.parse(text);
      // If we are currently in a blob url, we need to carry the index url to use for back link
      if (url.startsWith('blob:')) {
        // check if there's already an index url in the html tag
        const indexUrl = document.querySelector('html').getAttribute('data-index-url');
        if (localStorage.getItem('siteMap') !== null) {
          var siteMap = new Map(JSON.parse(localStorage.getItem('siteMap')));
          var doc = new DOMParser().parseFromString(content, 'text/html');
          replaceStaticLinks(doc, siteMap);
          // We need the scripts from the new head to be included in the main body
          content = doc.head.innerHTML + doc.body.innerHTML;
        }
        if (indexUrl) {
          main.innerHTML = "<a href='" + indexUrl + "'>Back</a><br><br>" + content;
        } else {
          currentUrl = window.location.href;
          document.querySelector('html').setAttribute('data-index-url', currentUrl);
          main.innerHTML = "<a href='" + currentUrl + "'>Back</a><br><br>" + content;
        }
      } else {
        main.innerHTML = "<a href='/index.html'>Back</a><br><br>" + content;
      }

      evalScripts(main);

      window.scrollTo(0, 0);

      if (updatePath && !window.location.href.startsWith('blob:')) {
        history.pushState({}, '', parametrizeUrl(new URL(url, window.location)));
      }
      replaceLinks();
    });
}
function toggleDarkMode() {
  const html = document.querySelector('html');
  const currentTheme = html.getAttribute('data-theme')
  const newTheme = currentTheme == 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Replace /xxx/*.md with /index.html?path=/xxx/*.md
function parametrizeUrl(url) {
  const path = url.pathname;
  if (path.endsWith('.md')) {
    return '/index.html?path=' + path;
  }
  return url;
}

//recursively eval script tags in element
function evalScripts(element) {
  if (element.tagName == 'SCRIPT') {
    // handle remote scripts
    if (element.src) {
      const script = document.createElement('script');
      script.src = element.src;
      document.head.appendChild(script);
    } else {
      eval(element.innerHTML);
    }
  } else {
    element.childNodes.forEach(evalScripts);
  }
}

function replaceStaticLinks(doc, siteMap) {
  doc.querySelectorAll('img[src], link[href], script[src]').forEach(function (element) {
    // Relative links need to be replaced
    attribute = element.src ? 'src' : 'href';
    if (element.getAttribute(attribute).startsWith('http')) {
      return;
    }

    var value = element.getAttribute(attribute);
    value = value.startsWith('/') ? value : '/' + value;
    if (siteMap.has(value)) {
      element.setAttribute(attribute, siteMap.get(value));
    }
  });
}

// Currently unused, for clickable TOC to work we'd need to use github flavored markdown header id plugin on marked
// https://www.npmjs.com/package/marked-gfm-heading-id
// It's also unclear where to put this in the minimalist picocss grid.
function createToc(mdText) {
  const stack = [document.createElement('ul')];
  marked.lexer(mdText).filter(x => x.type === 'heading').forEach(function (heading) {
    if (heading.depth < stack.length) {
      stack.length = heading.depth;
    } else {
      while (heading.depth > stack.length) {
        const ul = document.createElement('ul');
        stack.at(-1).append(ul);
        stack.push(ul);
      }
    }
    const prefix = marked.getDefaults().headerPrefix || '';
    const anchor = prefix + heading.text.replaceAll('.', '').replaceAll(' ', '-');
    stack.at(-1).insertAdjacentHTML('beforeend', `<li><a href="#${anchor}">${heading.text}</a></li>`);
  });
  return stack[0].outerHTML;
}
