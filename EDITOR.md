# Eggstatic Editor Documentation

## Overview

The Eggstatic Editor is a web-based code editor built for editing static site files. It features a modern VS Code-like interface with a sidebar file explorer, syntax highlighting, and professional styling.

## Architecture

### Core Files
- **`edit.html`** - Main editor interface with sidebar and editor layout
- **`edit.js`** - Editor functionality, file management, and dirty state tracking
- **`main.js`** - Site navigation and markdown rendering for the published site
- **`main.css`** - Currently empty, styles are embedded in edit.html

### Key Dependencies
- **Ace Editor** - Code editor with syntax highlighting and themes
- **JSZip** - File compression for project downloads and storage
- **Marked** - Markdown parsing for preview functionality
- **Pico CSS** - Base styling framework (cyan theme)
- **Shepherd.js** - Interactive guided tour system for new user onboarding

## Features

### 1. Professional Layout
- **Full-height flexbox layout** using viewport units
- **Sidebar file explorer** (280px wide) with proper borders
- **Main editor panel** with header showing current file
- **Bottom controls bar** with Save, Preview, Download buttons
- **Responsive design** that stacks vertically on mobile

### 2. File Management
- **Nested folder structure** with collapsible folders
- **File type icons** (🌐 HTML, 🎨 CSS, ⚡ JS, 📝 MD, etc.)
- **Root files** displayed first, then organized folders
- **Drag-free folder expansion** with ▶/▼ toggles and 📁/📂 icons
- **Smart indentation** (16px per folder level)

### 3. File Creation
- **Global "New File" button** in sidebar for root files
- **Per-folder "New File" buttons** for creating files in specific directories
- **Path-aware prompts** showing destination folder
- **Automatic file organization** by folder structure

### 4. Dirty State Tracking
- **Visual indicators** for unsaved changes:
  - Red dot indicator on the right side of file names
  - Italic text styling for dirty files
  - Smooth fade animations
- **Smart change detection** comparing current content vs. original
- **Proper save behavior** clearing dirty state when files are saved

### 5. Editor Features
- **Ace Editor** with Dracula theme (dark mode enforced)
- **Syntax highlighting** for HTML, CSS, JavaScript, Markdown
- **Automatic language mode** detection based on file extensions
- **Current file tracking** in editor header
- **Active file highlighting** in sidebar

### 6. Session Persistence
- **Local storage** for project state between sessions
- **Automatic save** of project as compressed blob
- **Session recovery** with user confirmation
- **Project download** as ZIP file

### 7. Interactive Guided Tour
- **First-time user onboarding** with Shepherd.js
- **10-step walkthrough** covering core editor functionality
- **Smart auto-advancement** based on user actions
- **Dismissible interface** with multiple exit options
- **Contextual highlighting** of relevant UI elements

## Styling System

### CSS Architecture
All styles are embedded in `edit.html` using CSS custom properties from Pico CSS:

```css
/* Key design tokens */
--pico-background-color
--pico-card-background-color
--pico-muted-border-color
--pico-primary-background
--pico-color
```

### Component Styles
- **`.editor-container`** - Full-height flex container
- **`.sidebar`** - File explorer with borders and overflow handling
- **`.file-link`** - Interactive file items with hover states
- **`.folder-header`** - Clickable folder toggles
- **`.controls-bar`** - Modern button styling with hover animations
- **`.file-dirty-indicator`** - Red dot for unsaved changes

### Button Hierarchy
- **Primary button** (Save) - Solid cyan background
- **Secondary buttons** (Preview, Download) - Outline style
- **Hover effects** - Subtle lift animation and shadows
- **Visual feedback** - Save button changes to "Saved!" temporarily

## JavaScript Architecture

### Global State Management
```javascript
// Core state variables
var dirtyFiles = new Set();           // Tracks files with unsaved changes
var originalFileContents = new Map(); // Original content for dirty comparison
var isLoadingFile = false;            // Prevents false dirty marking during file loads
var editor;                           // Ace editor instance
var filemap;                          // Map of all project files
```

### Key Functions

#### File Management
- **`loadFiles()`** - Loads ZIP project, initializes file structure
- **`buildFolderStructure()`** - Organizes files into nested folder tree
- **`createFileElement()`** - Creates file list items with proper styling
- **`createFolderElement()`** - Creates collapsible folder elements

#### Dirty State Tracking
- **`markFileDirty(fileName)`** - Adds dirty indicator to file
- **`markFileClean(fileName)`** - Removes dirty indicator from file
- **Change detection** - Compares current vs. original content automatically

#### File Operations
- **`updateEditorHeader()`** - Updates current file display
- **`setActiveFile()`** - Highlights current file in sidebar
- **`storeInLocalStorage()`** - Saves project state for persistence

### Event Handling
- **Editor changes** - Automatic dirty state tracking
- **File clicks** - Load file content with proper mode detection
- **Folder toggles** - Expand/collapse with visual feedback
- **Save button** - Update content, clear dirty state, show feedback
- **New file buttons** - Create files in appropriate locations

## File Type Support

### Syntax Highlighting
- **HTML** - `ace/mode/html`
- **CSS** - `ace/mode/css`
- **JavaScript** - `ace/mode/javascript`
- **Markdown** - `ace/mode/markdown`

### File Icons
- 🌐 HTML files
- 🎨 CSS files
- ⚡ JavaScript files
- 📝 Markdown files
- 📋 JSON files
- 🖼️ Image files (PNG, JPG, GIF)
- 📄 Other files

## Workflow

### Typical User Flow
1. **Load Editor** - Opens `edit.html` with project files
2. **Browse Files** - Use sidebar to navigate folder structure
3. **Edit Files** - Click files to open in editor with syntax highlighting
4. **Track Changes** - Dirty indicators show unsaved modifications
5. **Save Work** - Save button updates files and clears dirty state
6. **Preview** - Generate live preview of the site
7. **Download** - Export complete project as ZIP

### Session Management
1. **Initial Load** - Checks for existing session in localStorage
2. **Auto-Save** - Continuously saves state as user works
3. **Recovery** - Offers to restore previous session on reload
4. **Download** - Packages all files for offline backup

## Technical Considerations

### Performance
- **Lazy loading** - Files only loaded when accessed
- **Efficient DOM updates** - Minimal re-rendering of file tree
- **Memory management** - Blob URLs cleaned up appropriately

### Browser Compatibility
- **Modern browsers** - Uses ES6+ features, flexbox, CSS custom properties
- **Local storage** - Required for session persistence
- **Blob URLs** - Used for file handling and previews

### Security
- **Client-side only** - No server-side dependencies
- **Local file access** - All operations happen in browser sandbox
- **No external data** - Projects stay on user's machine

## Future Enhancement Opportunities

### Potential Improvements
- **Search functionality** across files
- **Multiple editor tabs** for easier file switching
- **Git integration** for version control
- **Plugin system** for extending functionality
- **Collaborative editing** with real-time sync
- **Advanced refactoring** tools
- **Integrated terminal** for build commands

### Code Quality
- **TypeScript migration** for better type safety
- **Module system** to organize JavaScript better
- **Unit tests** for core functionality
- **Performance monitoring** and optimization

## Guided Tour System

### Implementation Details

The editor includes a comprehensive guided tour built with Shepherd.js that introduces new users to the core functionality. The tour is designed to be educational, non-intrusive, and dismissible.

### Tour Configuration
```javascript
const tour = new Shepherd.Tour({
  useModalOverlay: true,     // Gray out background for focus
  exitOnEsc: true,          // Allow ESC key to dismiss
  keyboardNavigation: true,  // Enable arrow key navigation
  defaultStepOptions: {
    cancelIcon: { enabled: true }  // Show X button on each step
  }
});
```

### Tour Steps Overview

1. **Welcome** - Introduction to Eggstatic Editor
2. **File Explorer** - Navigate the sidebar file browser
3. **Code Editor** - Understanding the main editing area
4. **Open Content Folder** - Expand the content directory
5. **Open Content File** - Select hello.md for editing
6. **Edit Content** - Try making changes to content
7. **Show Red Dot** - Explain unsaved changes indicator
8. **Save Your Work** - Use the Save File button
9. **Preview Your Site** - Generate live preview
10. **Publishing Options** - Final deployment choices

### Smart Auto-Advancement

The tour includes intelligent progression that responds to user actions:

- **Folder clicks** automatically advance from "Open Content Folder" step
- **File clicks** automatically advance from "Open Content File" step
- **Editor changes** automatically advance from "Edit Content" step (2-second debounce)

### User Experience Features

- **One-time appearance** - Tour only shows for first-time users
- **Persistent dismissal** - Once dismissed, never reappears
- **Multiple exit options** - ESC key, X button, or complete normally
- **Contextual highlighting** - UI elements are highlighted during relevant steps
- **Non-blocking tooltips** - Positioned to avoid interfering with functionality

### Session Management

```javascript
// Tour state is tracked in localStorage
localStorage.setItem('eggstatic-tour-completed', 'true');

// Auto-start only for new users
if (!localStorage.getItem('eggstatic-tour-completed')) {
  tour.start();
}
```

### Styling Integration

The tour uses custom CSS that integrates with the Pico CSS theme:

- **Shepherd tooltips** styled to match editor theme
- **Button styling** consistent with existing UI components
- **Modal overlay** uses Pico CSS color variables
- **Responsive positioning** adapts to different screen sizes

This guided tour system provides an effective onboarding experience that helps users understand the editor's capabilities without overwhelming them with information.

This editor provides a solid foundation for web-based code editing with room for significant expansion and enhancement.