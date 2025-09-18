// Editing should be done in dark mode
document.querySelector('html').setAttribute('data-theme', 'dark');
// Beginning of Editor
var editor = ace.edit("editor");
editor.setTheme("ace/theme/dracula");

// Global variables for dirty state tracking
var dirtyFiles = new Set();
var originalFileContents = new Map();
var isLoadingFile = false;

// Global functions for dirty state management
function markFileDirty(fileName) {
  dirtyFiles.add(fileName);
  const fileLink = document.querySelector(`[data-filename="${fileName}"]`);
  if (fileLink) {
    fileLink.classList.add('dirty');
  }
}

function markFileClean(fileName) {
  dirtyFiles.delete(fileName);
  const fileLink = document.querySelector(`[data-filename="${fileName}"]`);
  if (fileLink) {
    fileLink.classList.remove('dirty');
  }
}

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

  // Variables are now global - defined at the top of the file

  // Load index.html
  document.getElementById('editor').dataset.currentFile = 'index.html';
  const indexHtml = filemap.get('index.html');
  isLoadingFile = true;
  editor.setValue(indexHtml);
  isLoadingFile = false;
  originalFileContents.set('index.html', indexHtml);
  editor.session.setMode("ace/mode/html");
  updateEditorHeader('index.html');

  // Track changes to mark files as dirty
  editor.session.on('change', function() {
    if (isLoadingFile) return; // Don't mark as dirty when loading file

    const currentFile = document.getElementById('editor').dataset.currentFile;
    if (currentFile) {
      const currentContent = editor.getValue();
      const originalContent = originalFileContents.get(currentFile) || '';

      if (currentContent !== originalContent) {
        markFileDirty(currentFile);
      } else {
        markFileClean(currentFile);
      }
    }
  });

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

  // Functions are now global - defined at the top of the file

  // Build proper nested folder structure
  function buildFolderStructure(fileNames) {
    const structure = { files: [], folders: new Map() };

    fileNames.filter(fileName => fileName.endsWith('.html') || fileName.endsWith('.css') || fileName.endsWith('.js') || fileName.endsWith('.md')).forEach(fileName => {
      const parts = fileName.split('/');

      if (parts.length === 1) {
        // Root file
        structure.files.push(fileName);
      } else {
        // File in folder(s)
        let current = structure;

        // Navigate/create folder structure
        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i];

          if (!current.folders.has(folderName)) {
            current.folders.set(folderName, { files: [], folders: new Map() });
          }

          current = current.folders.get(folderName);
        }

        // Add file to the final folder
        current.files.push(fileName);
      }
    });

    return structure;
  }

  const fileStructure = buildFolderStructure(fileNames);

  // Function to create file element
  function createFileElement(fileName, isInFolder = false) {
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
    link.className = isInFolder ? 'file-link in-folder' : 'file-link';
    link.href = '#';
    link.setAttribute('data-filename', fileName);

    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = getFileIcon(fileName);

    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = isInFolder ? fileName.split('/').pop() : fileName;

    const dirtyIndicator = document.createElement('span');
    dirtyIndicator.className = 'file-dirty-indicator';

    link.appendChild(icon);
    link.appendChild(name);
    link.appendChild(dirtyIndicator);

    link.onclick = async (e) => {
      e.preventDefault();
      const text = window.files.get(fileName);

      // Set loading flag to prevent marking as dirty
      isLoadingFile = true;
      editor.setValue(text);
      isLoadingFile = false;

      // Store original content for this file
      originalFileContents.set(fileName, text);

      editor.session.setMode("ace/mode/" + languageMode);
      document.getElementById('editor').dataset.currentFile = fileName;
      updateEditorHeader(fileName);
      setActiveFile(fileName);
    }

    listItem.appendChild(link);
    return listItem;
  }

  // Function to get current folder path from nested structure
  function getFolderPath(folderName, parentPath = '') {
    return parentPath ? `${parentPath}/${folderName}` : folderName;
  }

  // Function to create folder element with proper nesting
  function createFolderElement(folderName, folderData, parentElement, parentPath = '') {
    const currentPath = getFolderPath(folderName, parentPath);

    const folderItem = document.createElement('li');
    folderItem.className = 'folder-item';

    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-header';

    const toggle = document.createElement('span');
    toggle.className = 'folder-toggle';
    toggle.textContent = '▶';

    const icon = document.createElement('span');
    icon.className = 'folder-icon';
    icon.textContent = '📁';

    const name = document.createElement('span');
    name.textContent = folderName;

    folderHeader.appendChild(toggle);
    folderHeader.appendChild(icon);
    folderHeader.appendChild(name);

    // Create folder contents
    const folderContents = document.createElement('div');
    folderContents.className = 'folder-contents';
    folderContents.style.display = 'none';

    const filesList = document.createElement('ul');
    filesList.className = 'file-list';

    // Add "New File" button for this folder
    const newFileBtn = document.createElement('button');
    newFileBtn.className = 'folder-new-file-btn';
    newFileBtn.textContent = '+ New File';
    newFileBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent folder toggle
      const fileName = prompt(`Enter filename for ${currentPath}/`);
      if (fileName) {
        const fullPath = `${currentPath}/${fileName}`;
        window.files.set(fullPath, '');

        // Create and add the new file element
        const fileElement = createFileElement(fullPath, true);

        // Insert before the "New File" button
        filesList.insertBefore(fileElement, newFileBtn);

        // Open the new file
        const link = fileElement.querySelector('.file-link');
        link.click();
      }
    };

    filesList.appendChild(newFileBtn);

    // Add files in this folder
    folderData.files.forEach(fileName => {
      // Insert files before the "New File" button
      filesList.insertBefore(createFileElement(fileName, true), newFileBtn);
    });

    // Add subfolders recursively
    folderData.folders.forEach((subFolderData, subFolderName) => {
      // Insert subfolders before the "New File" button
      createFolderElement(subFolderName, subFolderData, filesList, currentPath);
    });

    folderContents.appendChild(filesList);

    // Toggle functionality
    folderHeader.onclick = () => {
      const isExpanded = folderContents.style.display === 'block';
      if (isExpanded) {
        folderContents.style.display = 'none';
        toggle.textContent = '▶';
        toggle.classList.remove('expanded');
        icon.textContent = '📁';
      } else {
        folderContents.style.display = 'block';
        toggle.textContent = '▼';
        toggle.classList.add('expanded');
        icon.textContent = '📂';
      }
    };

    folderItem.appendChild(folderHeader);
    folderItem.appendChild(folderContents);
    parentElement.appendChild(folderItem);
  }

  // Render the file structure
  function renderFileStructure(structure, parentElement) {
    // Add root files first
    structure.files.forEach(fileName => {
      parentElement.appendChild(createFileElement(fileName));
    });

    // Add folders
    structure.folders.forEach((folderData, folderName) => {
      createFolderElement(folderName, folderData, parentElement, '');
    });
  }

  renderFileStructure(fileStructure, fileList);

  // Set initial active file
  setActiveFile('index.html');

  // Add a 'new file' button
  const newFileButton = document.createElement('button');
  newFileButton.className = 'new-file-btn';
  newFileButton.textContent = '+ New File';
  newFileButton.onclick = () => {
    const fileName = prompt('Enter the name of the new file (use folder/subfolder/file.ext for nested folders)');
    if (fileName) {
      window.files.set(fileName, '');

      // For new files, just add to the end - user can refresh to see proper structure
      const fileElement = createFileElement(fileName, fileName.includes('/'));
      fileList.appendChild(fileElement);

      // Click the new file to open it
      const link = fileElement.querySelector('.file-link');
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

  // Update original content and mark file as clean
  originalFileContents.set(fileName, content);
  markFileClean(fileName);

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
