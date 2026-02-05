// Types
interface Config {
  messageSelector: string;
  chatContainerSelector: string;
  userMessageSelector: string;
  assistantMessageSelector: string;
}

interface State {
  isAllCollapsed: boolean;
}

// Configuration - adjust selectors based on your OpenWebUI version
const CONFIG: Config = {
  messageSelector: '.message, [class*="message"], .prose',
  chatContainerSelector: '.chat-container, [class*="chat"], main',
  userMessageSelector: '[class*="user"], .user-message',
  assistantMessageSelector: '[class*="assistant"], .assistant-message, .prose',
};

// State management
const state: State = {
  isAllCollapsed: false,
};

// Debug helper
const debugLog = (message: string, data?: any): void => {
  console.log(
    `%c[Chat Collapser] ${message}`,
    "color: #4f46e5; font-weight: bold;",
    data || ""
  );
};

// Analyze page structure for debugging
const analyzePage = (): void => {
  debugLog("=== Page Analysis ===");
  debugLog("URL:", window.location.href);

  // Look for common chat patterns
  const patterns = [
    { name: 'Has "message" in class', selector: '[class*="message" i]' },
    { name: 'Has "chat" in class', selector: '[class*="chat" i]' },
    { name: 'Has "prose"', selector: ".prose" },
    { name: "Has role attribute", selector: "[role]" },
    { name: "Has data-message", selector: "[data-message]" },
    {
      name: "Has markdown content",
      selector: '.markdown, [class*="markdown" i]',
    },
  ];

  patterns.forEach((pattern) => {
    const elements = document.querySelectorAll(pattern.selector);
    if (elements.length > 0) {
      debugLog(`Found ${elements.length} elements matching: ${pattern.name}`);
      if (elements.length <= 5) {
        Array.from(elements).forEach((el, i) => {
          debugLog(`  Element ${i + 1}:`, {
            tag: el.tagName,
            classes: el.className,
            text: el.textContent?.substring(0, 100),
          });
        });
      }
    }
  });
};

// Create collapse/expand all button
const createCollapseAllButton = (): HTMLButtonElement => {
  const button = document.createElement("button");
  button.id = "collapse-all-btn";
  button.className = "collapse-all-button";

  button.innerHTML = `
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6L8 11L13 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>Collapse All</span>
  `;

  button.addEventListener("click", toggleAllMessages);
  debugLog("Collapse all button created");
  return button;
};

// Toggle all messages
const toggleAllMessages = (): void => {
  const button = document.getElementById("collapse-all-btn");
  const allMessages =
    document.querySelectorAll<HTMLElement>(".message-wrapper");

  debugLog("Toggle all clicked. Found wrappers:", allMessages.length);

  state.isAllCollapsed = !state.isAllCollapsed;

  allMessages.forEach((wrapper) => {
    const content = wrapper.querySelector<HTMLElement>(".message-content");
    const toggle = wrapper.querySelector<HTMLElement>(".collapse-toggle");

    if (content && toggle) {
      if (state.isAllCollapsed) {
        content.classList.add("collapsed");
        toggle.classList.add("collapsed");
        toggle.setAttribute("aria-expanded", "false");
      } else {
        content.classList.remove("collapsed");
        toggle.classList.remove("collapsed");
        toggle.setAttribute("aria-expanded", "true");
      }
    }
  });

  // Update button text and icon
  if (button) {
    const span = button.querySelector<HTMLSpanElement>("span");
    const svg = button.querySelector<SVGElement>("svg");

    if (span) {
      span.textContent = state.isAllCollapsed ? "Expand All" : "Collapse All";
    }

    if (svg) {
      svg.style.transform = state.isAllCollapsed
        ? "rotate(-90deg)"
        : "rotate(0deg)";
    }
  }
};

// Create collapse column with toggle button and vertical line
const createCollapseColumn = (): HTMLDivElement => {
  const column = document.createElement("div");
  column.className = "collapse-column";

  // Create toggle button
  const toggle = document.createElement("button");
  toggle.className = "collapse-toggle";
  toggle.setAttribute("aria-expanded", "true");
  toggle.setAttribute("aria-label", "Toggle message");
  toggle.innerHTML = `
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6L8 11L13 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // Create vertical line
  const line = document.createElement("div");
  line.className = "collapse-line";

  // Add click handlers
  const handleToggle = (e: MouseEvent): void => {
    e.stopPropagation();
    const wrapper = column.closest<HTMLElement>(".message-wrapper");
    if (!wrapper) return;

    const content = wrapper.querySelector<HTMLElement>(".message-content");
    if (!content) return;

    const isCollapsed = content.classList.contains("collapsed");

    if (isCollapsed) {
      content.classList.remove("collapsed");
      toggle.classList.remove("collapsed");
      toggle.setAttribute("aria-expanded", "true");
    } else {
      content.classList.add("collapsed");
      toggle.classList.add("collapsed");
      toggle.setAttribute("aria-expanded", "false");
    }

    debugLog("Message toggled", { collapsed: !isCollapsed });
  };

  toggle.addEventListener("click", handleToggle);
  line.addEventListener("click", handleToggle);

  column.appendChild(toggle);
  column.appendChild(line);

  return column;
};

const addToggleToMessage = (messageElement: HTMLElement): void => {
  // Skip if already processed
  if (messageElement.closest(".message-wrapper")) {
    return;
  }

  const textLength = messageElement.textContent?.trim().length ?? 0;
  if (textLength < 20) return;

  debugLog("Adding toggle to message:", {
    text: messageElement.textContent?.substring(0, 50),
    classes: messageElement.className,
  });

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper";

  // Get message role (user/assistant) if available
  const isUser =
    messageElement.classList.contains("user") ||
    messageElement.closest('[class*="user"]') !== null;
  const isAssistant =
    messageElement.classList.contains("assistant") ||
    messageElement.closest('[class*="assistant"]') !== null;

  if (isUser) {
    wrapper.classList.add("user-message");
  }
  if (isAssistant) {
    wrapper.classList.add("assistant-message");
  }

  // Insert wrapper before the message
  const parent = messageElement.parentNode;
  if (!parent) return;

  parent.insertBefore(wrapper, messageElement);

  // Create collapse column (toggle + vertical line)
  const collapseColumn = createCollapseColumn();
  wrapper.appendChild(collapseColumn);

  // Create content container
  const contentContainer = document.createElement("div");
  contentContainer.className = "message-content-container";

  // Create preview
  const preview = document.createElement("div");
  preview.className = "message-preview";

  // Make preview clickable
  preview.addEventListener("click", () => {
    const toggle = wrapper.querySelector<HTMLElement>(".collapse-toggle");
    if (toggle) toggle.click();
  });

  // Create content wrapper that will contain the ORIGINAL message element
  const contentWrapper = document.createElement("div");
  contentWrapper.className = "message-content";

  // Move the entire original message element into content wrapper
  contentWrapper.appendChild(messageElement);

  // Assemble structure
  contentContainer.appendChild(preview);
  contentContainer.appendChild(contentWrapper);
  wrapper.appendChild(contentContainer);

  const textContent = isUser
    ? messageElement.textContent?.trim() || ""
    : contentContainer
        .querySelector("#response-content-container")
        ?.textContent?.trim() || "";

  preview.textContent =
    textContent.substring(0, 150) + (textContent.length > 150 ? "..." : "");

  debugLog("Toggle added successfully");
};

// Process all messages in the chat
const processMessages = (): void => {
  debugLog("Processing messages...");

  // Try multiple selector strategies
  const selectors = [
    ".prose",
    '[class*="Message"]',
    ".message",
    ".chat-message",
    'div[class*="message-"]',
    '[role="article"]',
    '[role="row"]',
    'div[class*="whitespace-pre-wrap"]',
    'div[class*="markdown"]',
  ];

  const foundMessages = new Set<HTMLElement>();

  selectors.forEach((selector) => {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    elements.forEach((el) => foundMessages.add(el));
  });

  debugLog(`Found ${foundMessages.size} potential message elements`);

  let processed = 0;
  foundMessages.forEach((msg) => {
    // Skip if already processed
    if (msg.closest(".message-wrapper")) return;

    // Skip tiny elements
    const textLength = msg.textContent?.trim().length ?? 0;
    if (textLength < 20) return;

    // Must have text content structure
    const hasTextContent = msg.querySelector(
      "p, pre, code, ul, ol, h1, h2, h3, span"
    );
    if (hasTextContent || textLength > 50) {
      addToggleToMessage(msg);
      processed++;
    }
  });

  debugLog(`Processed ${processed} messages`);
};

// Insert collapse all button
const insertCollapseAllButton = (): void => {
  if (document.getElementById("collapse-all-btn")) {
    debugLog("Button already exists");
    return;
  }

  const possibleContainers: (HTMLElement | null)[] = [
    document.querySelector("header"),
    document.querySelector('[class*="header"]'),
    document.querySelector("nav"),
    document.querySelector("main"),
    document.body,
  ];

  const container = possibleContainers.find((el) => el !== null);

  if (container) {
    const button = createCollapseAllButton();

    if (container.tagName === "HEADER" || container.tagName === "NAV") {
      container.appendChild(button);
    } else {
      container.insertBefore(button, container.firstChild);
    }
    debugLog("Button inserted into:", container.tagName);
  } else {
    debugLog("ERROR: Could not find container for button");
  }
};

// Initialize extension
const init = (): void => {
  debugLog("=== Initializing Extension ===");
  debugLog("Document ready state:", document.readyState);

  // Run page analysis
  analyzePage();

  // Initialize UI
  setTimeout(() => {
    insertCollapseAllButton();
    processMessages();
  }, 500);

  // Watch for new messages
  const observer = new MutationObserver((mutations: MutationRecord[]) => {
    let shouldProcess = false;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          shouldProcess = true;
        }
      });
    });

    if (shouldProcess) {
      setTimeout(() => {
        processMessages();
        if (!document.getElementById("collapse-all-btn")) {
          insertCollapseAllButton();
        }
      }, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  debugLog("=== Extension Ready ===");
};

// Start when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
