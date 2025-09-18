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

// End of Download Generation

// Beginning of Guided Tour with Shepherd.js
function initializeTour() {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    exitOnEsc: true,
    keyboardNavigation: true,
    defaultStepOptions: {
      classes: 'shadow-md bg-purple-dark',
      scrollTo: true,
      cancelIcon: {
        enabled: true
      }
    }
  });

  // Step 1: Welcome
  tour.addStep({
    title: 'Welcome to Eggstatic Editor',
    text: `
      <p>Welcome to the Eggstatic Editor! This is your website editor that runs entirely in your browser.</p>
      <p>We'll skip the complicated setup and get you started making your site right away.</p>
    `,
    buttons: [
      {
        text: 'Get Started',
        action: tour.next,
        classes: 'shepherd-button-primary'
      }
    ]
  });

  // Step 2: File Explorer
  tour.addStep({
    title: 'File Explorer',
    text: `
      <p>This is your file explorer where you can see all the files that make up your website.</p>
      <p>You can browse folders, create new files, and click on any file to edit it.</p>
    `,
    attachTo: {
      element: '.sidebar',
      on: 'right'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        classes: 'shepherd-button-secondary'
      },
      {
        text: 'Continue',
        action: tour.next,
        classes: 'shepherd-button-primary'
      }
    ]
  });

  // Step 3: Code Editor
  tour.addStep({
    title: 'Code Editor',
    text: `
      <p>This is where you'll write and edit your content.</p>
      <p>Click on any file in the sidebar to open it here. You get syntax highlighting and all the editing features you need.</p>
    `,
    attachTo: {
      element: '#editor',
      on: 'left'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        classes: 'shepherd-button-secondary'
      },
      {
        text: 'Continue',
        action: tour.next,
        classes: 'shepherd-button-primary'
      }
    ]
  });

  // Step 4: Open the content folder
  tour.addStep({
    id: 'open-content-folder',
    title: 'Open the Content Folder',
    text: `
      <p>First, click on the "content" folder to expand it and see the content files inside.</p>
      <p>The content folder contains the text and pages for your website.</p>
    `,
    attachTo: {
      element: '.sidebar',
      on: 'right'
    },
    beforeShowPromise: function() {
      return new Promise(function(resolve) {
        // Find and highlight the content folder header
        const folderHeaders = document.querySelectorAll('.folder-header');
        let contentFolder = null;

        folderHeaders.forEach(header => {
          const text = header.textContent.trim();
          if (text === '▶📁content' || text === '▼📂content') {
            contentFolder = header;
          }
        });

        if (contentFolder) {
          contentFolder.style.background = 'var(--pico-primary-background)';
          contentFolder.style.color = 'var(--pico-primary-inverse)';
          setTimeout(() => {
            contentFolder.style.background = '';
            contentFolder.style.color = '';
          }, 3000);
        }
        resolve();
      });
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        classes: 'shepherd-button-secondary'
      },
      {
        text: 'Skip',
        action: tour.next,
        classes: 'shepherd-button-primary'
      }
    ]
  });

  // Step 5: Open a content file
  tour.addStep({
    id: 'open-hello-file',
    title: 'Open a Content File',
    text: `
      <p>Now click on "about.md" inside the content folder to open your first content file.</p>
      <p>This file contains sample content that you can edit.</p>
    `,
    attachTo: {
      element: '.sidebar',
      on: 'right'
    },
    beforeShowPromise: function() {
      return new Promise(function(resolve) {
        // Highlight the about.md file if it exists
        const helloFile = document.querySelector('[data-filename="content/about.md"]');
        if (helloFile) {
          helloFile.style.background = 'var(--pico-primary-background)';
          helloFile.style.color = 'var(--pico-primary-inverse)';
          setTimeout(() => {
            helloFile.style.background = '';
            helloFile.style.color = '';
          }, 3000);
        }
        resolve();
      });
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        classes: 'shepherd-button-secondary'
      },
      {
        text: 'Skip',
        action: tour.next,
        classes: 'shepherd-button-primary'
      }
    ]
  });

  // Step 6: Edit content
  tour.addStep({
    id: 'edit-content',
    title: 'Edit Content',
    text: `<p>Try editing the content!</p>`,
    attachTo: {
      element: '#editor',
      on: 'bottom-end'
    },
    buttons: [
      {
        text: 'Skip',
        action: tour.next,
        classes: 'shepherd-button-primary'
      }
    ]
  });

  // Step 7: Show red dot indicator
  tour.addStep({
    id: 'show-red-dot',
    title: 'Unsaved Changes',
    text: `<p>See the red dot? That shows you have unsaved changes!</p>`,
    attachTo: {
      element: '.sidebar',
      on: 'right'
    },
    beforeShowPromise: function() {
      return new Promise(function(resolve) {
        // Highlight the file with the red dot
        const dirtyFile = document.querySelector('.file-link.dirty');
        if (dirtyFile) {
          dirtyFile.style.background = 'var(--pico-primary-background)';
          dirtyFile.style.color = 'var(--pico-primary-inverse)';
          setTimeout(() => {
            dirtyFile.style.background = '';
            dirtyFile.style.color = '';
          }, 3000);
        }
        resolve();
      });
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        classes: 'shepherd-button-secondary'
      },
      {
        text: 'Continue',
        action: tour.next,
        classes: 'shepherd-button-primary'
      }
    ]
  });

  // Step 8: Save your work
  tour.addStep({
    title: 'Save Your Work',
    text: `
      <p>Don't forget to save your changes! Click the "Save File" button to save your edits.</p>
      <p>You'll see the button change to "Saved!" and the red dot will disappear.</p>
    `,
    attachTo: {
      element: '#save',
      on: 'top'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        classes: 'shepherd-button-secondary'
      },
      {
        text: 'Continue',
        action: tour.next,
        classes: 'shepherd-button-primary'
      }
    ]
  });

  // Step 9: Preview your site
  tour.addStep({
    title: 'Preview Your Site',
    text: `
      <p>Want to see how your site looks? Click "Preview" to open your site in a new tab.</p>
      <p>This generates a live version of your site that you can view and test.</p>
    `,
    attachTo: {
      element: '#preview',
      on: 'top'
    },
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        classes: 'shepherd-button-secondary'
      },
      {
        text: 'Continue',
        action: tour.next,
        classes: 'shepherd-button-primary'
      }
    ]
  });

  // Step 10: Publishing options
  tour.addStep({
    title: 'Publishing Your Site',
    text: `
      <p><strong>Congratulations!</strong> You've successfully created and edited your website!</p>
      <p>When you're ready to publish, you can:</p>
      <ul>
        <li><strong>Download</strong> your site as a ZIP file</li>
        <li><strong>Upload</strong> it to free hosting services like Neocities</li>
        <li><strong>Publish directly</strong> with drifting.ink - a quick, free host</li>
        <li><strong>Continue editing</strong> to add more content</li>
      </ul>
      <p>Your website will be completely yours - no subscription fees or vendor lock-in!</p>
    `,
    buttons: [
      {
        text: 'Back',
        action: tour.back,
        classes: 'shepherd-button-secondary'
      },
      {
        text: 'Finish Tour',
        action: tour.complete,
        classes: 'shepherd-button-primary'
      }
    ]
  });

  return tour;
}

// Initialize tour when page loads
document.addEventListener('DOMContentLoaded', function() {
  const tour = initializeTour();
  let tourInstance = null;

  // Auto-start tour for new users only
  if (!localStorage.getItem('eggstatic-tour-completed')) {
    // Wait a bit for the page to fully load
    setTimeout(() => {
      tourInstance = tour;
      tour.start();
    }, 1000);
  }

  // Mark tour as completed when it finishes or is cancelled
  tour.on('complete', function() {
    localStorage.setItem('eggstatic-tour-completed', 'true');
    tourInstance = null;
  });

  tour.on('cancel', function() {
    localStorage.setItem('eggstatic-tour-completed', 'true');
    tourInstance = null;
  });

  // Set up event listeners to automatically advance tour
  document.addEventListener('click', function(e) {
    if (!tourInstance) return;

    const currentStep = tourInstance.getCurrentStep();
    if (!currentStep) return;

    // Step 4: Detect content folder click
    if (currentStep.id === 'open-content-folder') {
      const target = e.target.closest('.folder-header');
      if (target && target.textContent.includes('content')) {
        setTimeout(() => tourInstance.next(), 500); // Small delay for folder to expand
      }
    }

    // Step 5: Detect hello.md file click
    if (currentStep.id === 'open-hello-file') {
      const target = e.target.closest('[data-filename="content/about.md"]');
      if (target) {
        setTimeout(() => tourInstance.next(), 500); // Small delay for file to load
      }
    }
  });

  // Set up editor change detection for tour
  let editorChangeTimeout;
  function setupEditorTourDetection() {
    if (typeof editor !== 'undefined' && editor.on) {
      editor.on('change', function() {
        if (!tourInstance) return;

        const currentStep = tourInstance.getCurrentStep();
        if (currentStep && currentStep.id === 'edit-content') {
          // Debounce the tour advancement
          clearTimeout(editorChangeTimeout);
          editorChangeTimeout = setTimeout(() => {
            tourInstance.next();
          }, 2000); // Advance after 2 seconds of editing
        }
      });
    }
  }

  // Wait for editor to be initialized, then setup detection
  setTimeout(setupEditorTourDetection, 2000);
});

// End of Guided Tour
