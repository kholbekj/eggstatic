// Editing should be done in dark mode
document.querySelector('html').setAttribute('data-theme', 'dark');
// Beginning of Editor
var editor = ace.edit("editor");
editor.setTheme("ace/theme/dracula");

loadFiles();

// Load the zip file, open index.html in the editor
async function loadFiles() {
  var blob;
  if (localStorage.getItem("rawtastic-main") !== null) {
    if (confirm("A previous session was found. Do you want to load it?")) {
      const base64 = localStorage.getItem("rawtastic-main");
      const response = await fetch(base64);
      blob = await response.blob();
    } else {
      const response = await fetch("/rawtastic-main.zip");
      blob = await response.blob();
    }
  } else {
    const response = await fetch("/rawtastic-main.zip");
    blob = await response.blob();
  }
  const zip = new JSZip();
  await zip.loadAsync(blob);
  const files = zip.files;
  const fileNames = Object.keys(files);
  filemap = new Map();
  for (const fileName of fileNames) {
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || fileName.endsWith('.gif')) {
      filemap.set(fileName, await files[fileName].async('blob'));
    } else {
      filemap.set(fileName, await files[fileName].async('text'));
    }
  };

  window.files = filemap;

  // If the query param q is set, we want to swap the word "cyan" in index.html with the value
  // in the map
  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get('q');
  if (q) {
    const indexHtml = filemap.get('index.html');
    const newHtml = indexHtml.replace('cyan', q);
    filemap.set('index.html', newHtml);
  }

  // Load index.html
  document.getElementById('editor').dataset.currentFile = 'index.html';
  const indexHtml = filemap.get('index.html');
  editor.setValue(indexHtml);
  editor.session.setMode("ace/mode/html");
  updateEditorHeader('index.html');

  const fileExplorer = document.getElementById('fileExplorer');
  const fileList = document.createElement('ul');
  fileList.className = 'file-list';
  fileExplorer.appendChild(fileList);

  // Function to get file icon based on extension
  function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
      'html': '🌐',
      'css': '🎨',
      'js': '⚡',
      'md': '📝',
      'json': '📋',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️'
    };
    return icons[ext] || '📄';
  }

  // Function to update editor header with current file
  function updateEditorHeader(fileName) {
    document.getElementById('editorHeader').textContent = fileName || 'No file selected';
  }

  // Function to set active file in the tree
  function setActiveFile(fileName) {
    document.querySelectorAll('.file-link').forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`[data-filename="${fileName}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  for (const fileName of fileNames.filter(fileName => fileName.endsWith('.html') || fileName.endsWith('.css') || fileName.endsWith('.js') || fileName.endsWith('.md'))) {
    const languageModes = {
      'html': 'html',
      'css': 'css',
      'js': 'javascript',
      'md': 'markdown'
    };
    const languageMode = languageModes[fileName.split('.').pop()];

    const listItem = document.createElement('li');
    listItem.className = 'file-item';

    const link = document.createElement('a');
    link.className = 'file-link';
    link.href = '#';
    link.setAttribute('data-filename', fileName);

    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = getFileIcon(fileName);

    const name = document.createElement('span');
    name.textContent = fileName;

    link.appendChild(icon);
    link.appendChild(name);

    link.onclick = async (e) => {
      e.preventDefault();
      const text = window.files.get(fileName);
      editor.setValue(text);
      editor.session.setMode("ace/mode/" + languageMode);
      document.getElementById('editor').dataset.currentFile = fileName;
      updateEditorHeader(fileName);
      setActiveFile(fileName);
    }

    listItem.appendChild(link);
    fileList.appendChild(listItem);
  }

  // Set initial active file
  setActiveFile('index.html');

  // Add a 'new file' button
  const newFileButton = document.createElement('button');
  newFileButton.className = 'new-file-btn';
  newFileButton.textContent = '+ New File';
  newFileButton.onclick = () => {
    const fileName = prompt('Enter the name of the new file');
    if (fileName) {
      window.files.set(fileName, '');

      const languageModes = {
        'html': 'html',
        'css': 'css',
        'js': 'javascript',
        'md': 'markdown'
      };
      const languageMode = languageModes[fileName.split('.').pop()];

      const listItem = document.createElement('li');
      listItem.className = 'file-item';

      const link = document.createElement('a');
      link.className = 'file-link';
      link.href = '#';
      link.setAttribute('data-filename', fileName);

      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.textContent = getFileIcon(fileName);

      const name = document.createElement('span');
      name.textContent = fileName;

      link.appendChild(icon);
      link.appendChild(name);

      link.onclick = async (e) => {
        e.preventDefault();
        const text = window.files.get(fileName);
        editor.setValue(text);
        editor.session.setMode("ace/mode/" + languageMode);
        document.getElementById('editor').dataset.currentFile = fileName;
        updateEditorHeader(fileName);
        setActiveFile(fileName);
      }

      listItem.appendChild(link);
      fileList.appendChild(listItem);

      // Click the new file to open it
      link.click();
    }
  }
  fileExplorer.appendChild(newFileButton);

  return files;
}

// Save file on press save
document.getElementById('save').addEventListener('click', function() {
  const fileName = document.getElementById('editor').dataset.currentFile;
  const saveBtn = document.getElementById('save');
  const originalText = saveBtn.textContent;

  if (!fileName) {
    saveBtn.textContent = 'No file selected';
    setTimeout(() => saveBtn.textContent = originalText, 2000);
    return;
  }

  console.log(fileName);
  content = editor.getValue();
  window.files.set(fileName, content);
  storeInLocalStorage(window.files);

  // Visual feedback
  saveBtn.textContent = 'Saved!';
  saveBtn.style.background = 'var(--pico-primary-background)';
  saveBtn.style.color = 'var(--pico-primary-inverse)';

  setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.style.background = '';
    saveBtn.style.color = '';
  }, 1500);
});

// Zip and the files, then store them in local storage
function storeInLocalStorage(files) {
  const zip = new JSZip();
  for (const [fileName, content] of files) {
    zip.file(fileName, content);
  }
  zip.generateAsync({ type: "blob" }).then(function(content) {
    const reader = new FileReader();
    reader.onload = function() {
      localStorage.setItem('rawtastic-main', reader.result);
    }
    reader.readAsDataURL(content);
  });
}

// End of Editor

// Begining of Preview Generation

// This generates blobs for all files, then stores them in a map
async function generateSiteMapFromList(files) {
  siteMap = new Map();

  fileNames = [...files.keys()];
  nonDirs = fileNames.filter(fileName => !fileName.endsWith('/'));

  // Ignore html for now
  for (var fileName of nonDirs.filter(name => !name.endsWith('.html'))) {
    type = fileName.split('.').pop();
    address = `/${fileName}`;

    if (type === 'css' || type === 'js') {
      siteMap.set(address, URL.createObjectURL(new Blob([files.get(fileName)], { type: "text/" + type })));
    } else if (type === 'md') {
      siteMap.set(address, URL.createObjectURL(new Blob([files.get(fileName)], { type: "text/markdown" })));
    } else if (type === 'png' || type === 'jpg' || type === 'jpeg' || type === 'gif') {
      siteMap.set(address, URL.createObjectURL(new Blob([files.get(fileName)], { type: "image/" + type })));
    } else {
      console.error('Unknown file type: ' + type);
    }
  }

  // Then do html, but replacing static links
  for (var fileName of nonDirs.filter(name => name.endsWith('.html'))) {
    const html = files.get(fileName);
    doc = new DOMParser().parseFromString(html, 'text/html');
    replaceStaticLinks(doc, siteMap);
    siteMap.set(`/${fileName}`, URL.createObjectURL(new Blob([doc.documentElement.outerHTML], { type: "text/html" })));
  }

  return siteMap;
}

function replaceStaticLinks(doc, siteMap) {
  const elements = doc.querySelectorAll('link[href], script[src]', 'img[src]');
  for (const element of elements) {
    const attr = element.href ? 'href' : 'src';
    var url = element.getAttribute(attr);
    if (url && !url.startsWith('http')) {
      url = url.startsWith('/') ? url : '/' + url;
      const newUrl = siteMap.get(url);
      if (newUrl) {
        element.setAttribute(attr, newUrl);
      }
    }
  }
}

document.getElementById('preview').addEventListener('click', function() {
  generateSiteMapFromList(window.files).then(() => {
    localStorage.setItem('siteMap', JSON.stringify(Array.from(siteMap.entries())));
    var url = siteMap.get('/index.html');
    window.open(url, '_blank').focus();
  });
});

// End of Preview Generation


// Begining of Download Generation
document.getElementById('download').addEventListener('click', function() {
  const zip = new JSZip();
  for (const [fileName, content] of window.files) {
    zip.file(fileName, content);
  }
  zip.generateAsync({ type: "blob" }).then(function(content) {
    var link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "rawtastic-main.zip";
    link.click();
  });
});
