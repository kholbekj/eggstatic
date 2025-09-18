// Drifting.ink Publisher for Browser-based Static Site Editor
// Add this script to your web editor to publish directly to drifting.ink

class DriftingPublisher {
  constructor(serverUrl = 'https://drifting.ink') {
    this.serverUrl = serverUrl;
    this.token = null;
  }

  // Generate session ID and open auth window
  async authenticate() {
    const sessionId = this.generateSessionId();
    const authUrl = `${this.serverUrl}/cli/auth/${sessionId}`;

    console.log('🔐 Opening authentication window...');
    console.log('💡 New to drifting.ink? Take your time to register - we\'ll wait up to 15 minutes!');

    // Open auth window
    const authWindow = window.open(authUrl, 'drifting-auth', 'width=500,height=600');

    // Poll for token - much longer timeout for new user registration
    console.log('⏳ Waiting for authentication...');

    for (let i = 0; i < 180; i++) { // 15 minutes max (180 × 5 seconds)
      await this.sleep(5000);

      try {
        const response = await fetch(`${this.serverUrl}/api/cli/session/${sessionId}`);

        if (response.status === 200) {
          const data = await response.json();
          if (data.status === 'completed') {
            console.log('✅ Authentication successful!');
            authWindow.close();
            this.token = data.cli_token;
            return this.token;
          }
        } else if (response.status === 404) {
          // Session not found yet - normal for new users who need to register
          // Only throw error after a reasonable amount of time (10+ minutes)
          if (i > 120) { // After 10 minutes, start warning about 404s
            console.log(`⚠️ Session not found after ${Math.floor(i/12)} minutes. User may need to complete registration.`);
          }
          // Continue polling - don't throw error immediately
        } else if (response.status === 410) {
          throw new Error('Authentication session expired');
        }

        // Show progress every minute to reassure user we're still waiting
        if (i > 0 && i % 12 === 0) {
          const minutesWaited = Math.floor(i / 12);
          const minutesLeft = 15 - minutesWaited;
          console.log(`⏳ Still waiting... (${minutesWaited} min elapsed, ${minutesLeft} min remaining)`);
        }
      } catch (error) {
        if (error.message.includes('expired')) throw error;
        // Network error or other issue, continue polling
        console.log('.');
      }
    }

    authWindow.close();
    throw new Error('Authentication timed out after 15 minutes. Please try again.');
  }

  // Fetch user's existing sites
  async getSites() {
    if (!this.token) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const response = await fetch(`${this.serverUrl}/api/sites`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.sites;
    } else if (response.status === 401) {
      throw new Error('Invalid or expired token');
    } else {
      throw new Error(`Failed to fetch sites: ${response.status}`);
    }
  }

  // Create a new site
  async createSite(subdomain, name = null, description = '') {
    if (!this.token) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const siteData = {
      subdomain: subdomain,
      name: name || subdomain,
      description: description,
      active: true
    };

    const response = await fetch(`${this.serverUrl}/api/sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(siteData)
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Site '${data.site.name}' created successfully!`);
      return data.site;
    } else {
      const errorText = await response.text();
      throw new Error(`Failed to create site: ${errorText}`);
    }
  }

  // Check if site exists
  async siteExists(subdomain) {
    if (!this.token) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const response = await fetch(`${this.serverUrl}/api/sites/${subdomain}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.exists;
    }
    return false;
  }

  // Convert files map to API format
  prepareFiles(filesMap) {
    const files = [];

    for (const [fileName, content] of filesMap) {
      if (fileName.endsWith('/')) continue; // Skip directories

      let base64Content;
      if (typeof content === 'string') {
        // Text content - encode to base64 safely
        try {
          // Use TextEncoder for proper UTF-8 encoding
          const encoder = new TextEncoder();
          const bytes = encoder.encode(content);
          const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
          base64Content = btoa(binaryString);
        } catch (error) {
          console.warn(`Failed to encode ${fileName}:`, error);
          continue;
        }
      } else if (content instanceof Blob) {
        // Binary content (Blob) - skip for now, would need async handling
        console.warn(`Skipping binary file: ${fileName}`);
        continue;
      } else {
        // Assume it's already base64 encoded or handle as string
        try {
          base64Content = btoa(content);
        } catch (error) {
          console.warn(`Failed to encode ${fileName}:`, error);
          continue;
        }
      }

      files.push({
        path: fileName,
        content: base64Content
      });
    }

    return files;
  }

  // Upload files to subdomain
  async uploadFiles(subdomain, filesMap) {
    if (!this.token) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const files = this.prepareFiles(filesMap);
    console.log(`📦 Uploading ${files.length} files...`);

    const response = await fetch(`${this.serverUrl}/api/upload/${subdomain}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ files })
    });

    if (!response.ok) {
      const errorText = await response.text();
      switch (response.status) {
        case 401:
          throw new Error('Invalid or expired token');
        case 404:
          throw new Error(`Site '${subdomain}' not found`);
        case 422:
          throw new Error(`Upload failed: ${errorText}`);
        default:
          throw new Error(`Unexpected error (${response.status}): ${errorText}`);
      }
    }

    console.log('✅ Files uploaded successfully!');
  }

  // Full publish workflow
  async publish(filesMap, subdomain = null) {
    try {
      // Authenticate if needed
      if (!this.token) {
        await this.authenticate();
      }

      // Get subdomain if not provided
      if (!subdomain) {
        const sites = await this.getSites();

        if (sites.length === 0) {
          subdomain = prompt('Enter subdomain for your new site:');
          if (!subdomain) throw new Error('Subdomain required');
        } else {
          // Show site selection dialog
          subdomain = await this.showSiteSelector(sites);
        }
      }

      // Check if site exists, create if needed
      const exists = await this.siteExists(subdomain);
      if (!exists) {
        const shouldCreate = confirm(`Site '${subdomain}' doesn't exist. Create it?`);
        if (shouldCreate) {
          await this.createSite(subdomain);
        } else {
          throw new Error('Site creation cancelled');
        }
      }

      // Upload files
      await this.uploadFiles(subdomain, filesMap);

      // Show success message with link
      const siteUrl = `https://${subdomain}.drifting.ink`;
      console.log(`🌐 Your site is now available at: ${siteUrl}`);

      // Optionally open the site
      if (confirm('Open published site?')) {
        window.open(siteUrl, '_blank');
      }

      return siteUrl;

    } catch (error) {
      console.error('❌ Publication failed:', error.message);
      throw error;
    }
  }

  // Show site selector dialog
  async showSiteSelector(sites) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white; padding: 20px; border-radius: 8px;
        min-width: 300px; max-width: 500px;
      `;

      dialog.innerHTML = `
        <h3>Select site to publish to:</h3>
        ${sites.map((site, i) => `
          <div style="margin: 10px 0;">
            <label style="cursor: pointer;">
              <input type="radio" name="site" value="${site.subdomain}" ${i === 0 ? 'checked' : ''}>
              ${site.name} (${site.subdomain})
            </label>
          </div>
        `).join('')}
        <div style="margin: 10px 0;">
          <label style="cursor: pointer;">
            <input type="radio" name="site" value="__new__">
            🆕 Create new site
          </label>
        </div>
        <div style="margin-top: 20px;">
          <button id="publish-ok">OK</button>
          <button id="publish-cancel" style="margin-left: 10px;">Cancel</button>
        </div>
      `;

      modal.appendChild(dialog);
      document.body.appendChild(modal);

      dialog.querySelector('#publish-ok').onclick = () => {
        const selected = dialog.querySelector('input[name="site"]:checked');
        document.body.removeChild(modal);

        if (selected.value === '__new__') {
          const subdomain = prompt('Enter subdomain for new site:');
          resolve(subdomain);
        } else {
          resolve(selected.value);
        }
      };

      dialog.querySelector('#publish-cancel').onclick = () => {
        document.body.removeChild(modal);
        resolve(null);
      };
    });
  }

  // Utility functions
  generateSessionId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage example for scrappy_tech editor:
// Add this to your editor's publish button

async function publishToDrifting() {
  const publisher = new DriftingPublisher();

  try {
    // Use the existing files map from the editor
    const siteUrl = await publisher.publish(window.files);
    alert(`🎉 Site published successfully!\n\nURL: ${siteUrl}`);
  } catch (error) {
    alert(`❌ Publication failed: ${error.message}`);
  }
}

// Add publish button to existing editor interface
if (typeof window !== 'undefined' && document.getElementById('controls')) {
  const publishButton = document.createElement('button');
  publishButton.id = 'publish-drifting';
  publishButton.className = 'outline';
  publishButton.innerText = 'Publish to drifting.ink';
  publishButton.onclick = publishToDrifting;

  // Add to controls
  document.getElementById('controls').appendChild(publishButton);
}