(function() {
  // Wait for the DOM to be ready
  const initChatbot = () => {
    // Prevent multiple initializations
    if (document.getElementById('oogway-chatbot-iframe')) return;

    // Find the script tag that loaded this script to extract dataset attributes
    let currentScript = document.currentScript;
    if (!currentScript) {
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.includes('embed.js')) {
          currentScript = scripts[i];
          break;
        }
      }
    }

    if (!currentScript) {
      console.error("Oogway Chatbot: Could not find embed.js script tag.");
      return;
    }

    console.log("Oogway Chatbot: Initializing embed script...");

    const workspaceId = currentScript.getAttribute('data-workspace-id') || '';
    const brandColor = currentScript.getAttribute('data-brand-color') || '#B2EA4D';

    const iframe = document.createElement('iframe');
    iframe.id = 'oogway-chatbot-iframe';
    
    // Determine the host from the script URL
    const scriptUrl = new URL(currentScript.src);
    const host = scriptUrl.origin;

    iframe.src = `${host}/embed?workspaceId=${workspaceId}&brandColor=${encodeURIComponent(brandColor)}`;
    
    // Default styling for the iframe container (closed state)
    iframe.style.setProperty('position', 'fixed', 'important');
    iframe.style.setProperty('bottom', '0', 'important');
    iframe.style.setProperty('right', '0', 'important');
    iframe.style.setProperty('width', '120px', 'important');
    iframe.style.setProperty('height', '120px', 'important');
    iframe.style.setProperty('border', 'none', 'important');
    iframe.style.setProperty('z-index', '2147483647', 'important'); // Max z-index to stay on top
    iframe.style.setProperty('background-color', 'transparent', 'important');
    iframe.style.setProperty('color-scheme', 'light', 'important');
    // Add transition for smooth opening/closing
    iframe.style.setProperty('transition', 'width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), height 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 'important');
    iframe.allow = 'microphone';

    document.body.appendChild(iframe);

    // Listen for resize events from the chatbot
    window.addEventListener('message', (event) => {
      // Validate origin to match the script's origin
      if (event.origin !== host) return;

      if (event.data && event.data.type === 'OOGWAY_CHATBOT_STATE') {
        const isOpen = event.data.isOpen;
        if (isOpen) {
          // Check if device is mobile width
          if (window.innerWidth < 640) {
            iframe.style.setProperty('width', '100vw', 'important');
            iframe.style.setProperty('height', '100vh', 'important');
          } else {
            // Desktop dimensions (enough for 384px width + margin, 520px height + margin)
            iframe.style.setProperty('width', '420px', 'important');
            iframe.style.setProperty('height', '600px', 'important');
          }
        } else {
          // Closed state (just enough for the floating action button)
          iframe.style.setProperty('width', '120px', 'important');
          iframe.style.setProperty('height', '120px', 'important');
        }
      }
    });

    // Also listen for parent window resize to adjust iframe if it's currently open
    window.addEventListener('resize', () => {
      if (iframe.style.width !== '120px') { // meaning it is open
        if (window.innerWidth < 640) {
          iframe.style.setProperty('width', '100vw', 'important');
          iframe.style.setProperty('height', '100vh', 'important');
        } else {
          iframe.style.setProperty('width', '420px', 'important');
          iframe.style.setProperty('height', '600px', 'important');
        }
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
})();
