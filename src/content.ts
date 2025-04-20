import { ErrorMessage, Message, SuccessMessage } from "./types/message.js";

console.log(`✨ CONTENT SCRIPT LOADED`);

let tooltip: HTMLDivElement | null = null;

const handleLoading = () => {
  tooltip = document.createElement("div");
  tooltip.className = "fact-check-tooltip loading";
  tooltip.innerHTML = `
    <div class="fact-check-header">
      <h3 class="fact-check-title">Fact Checker</h3>
    </div>
    <div class="fact-check-content">
      <p class="shimmer-text">Verifying claim...</p>
    </div>
  `;

  // Position tooltip
  positionTooltip();

  // Add to page
  document.body.appendChild(tooltip);
};

const handleError = (message: ErrorMessage) => {
  // Create tooltip
  tooltip = document.createElement("div");
  tooltip.className = "fact-check-tooltip error";
  tooltip.innerHTML = `
    <div class="fact-check-header">
      <h3 class="fact-check-title">Error</h3>
      <button class="fact-check-close">&times;</button>
    </div>
    <div class="fact-check-content">
      <p>${message.error}</p>
    </div>
  `;

  // Position tooltip
  positionTooltip();

  // Add to page
  document.body.appendChild(tooltip);

  // Add close button listener
  addCloseButtonListener();
};

const handleSuccess = (message: SuccessMessage) => {
  const verdictMatch = message.answer.match(
    /^(TRUE|FALSE|UNCERTAIN)(\s*:|:)?/i
  );
  let verdict = "";
  let answerText = message.answer;

  if (verdictMatch) {
    verdict = verdictMatch[1].toUpperCase();
    answerText = message.answer.substring(verdictMatch[0].length).trim();
  }

  let verdictClass = "uncertain";
  if (verdict === "TRUE") verdictClass = "true";
  if (verdict === "FALSE") verdictClass = "false";

  let processedAnswerText = answerText;

  if (message.citations && message.citations.length > 0) {
    const citationRegex = /\[(\d+)\]/g;
    processedAnswerText = answerText.replace(
      citationRegex,
      (match, numberStr) => {
        const citationIndex = parseInt(numberStr, 10) - 1;
        if (citationIndex >= 0 && citationIndex < message.citations.length) {
          const citationUrl = message.citations[citationIndex];
          return `<a href="${citationUrl}" target="_blank" class="inline-citation">${numberStr}</a>`;
        }
        return match;
      }
    );
  }

  // Create tooltip
  tooltip = document.createElement("div");
  tooltip.className = `fact-check-tooltip verdict-${verdictClass}`;
  tooltip.innerHTML = `
    <div class="fact-check-header">
      <h3 class="fact-check-title">Fact Checker</h3>
      <button class="fact-check-close">&times;</button>
    </div>
    <div class="fact-check-content">
      <blockquote class="fact-check-claim">${message.selectedText}</blockquote>
      ${
        verdict
          ? `<div class="fact-check-verdict ${verdictClass}"><span>${verdict}</span></div>`
          : ""
      }
      <p class="fact-check-explanation">${processedAnswerText}</p>
    </div>
  `;

  // Position tooltip
  positionTooltip();

  // Add to page
  document.body.appendChild(tooltip);

  // Add close button listener
  addCloseButtonListener();
};

// Helper function to position the tooltip near the selected text
const positionTooltip = () => {
  if (!tooltip) return;

  const selection = window.getSelection();
  if (selection && selection.rangeCount) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Set initial position
    tooltip.style.position = "absolute";
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;

    // Check if tooltip would go off-screen and adjust if needed
    setTimeout(() => {
      if (!tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      const windowWidth = window.innerWidth;

      // If tooltip would go off the right edge
      if (tooltipRect.right > windowWidth - 20) {
        tooltip.style.left = `${
          Math.max(20, windowWidth - tooltipRect.width - 20) + window.scrollX
        }px`;
      }
    }, 0);
  }
};

// Helper function to add event listener to close button
const addCloseButtonListener = () => {
  if (!tooltip) return;

  const closeButton = tooltip.querySelector(".fact-check-close");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    });
  }
};

// Set up message listener
chrome.runtime.onMessage.addListener((message: Message) => {
  console.log("Content script received message:", message);

  try {
    // Remove existing tooltip if present
    if (tooltip) tooltip.remove();

    // Handle different message types
    switch (message.type) {
      case "FACT_CHECK_LOADING":
        console.log(`✨ DID RECEIVE LOADING`);
        handleLoading();
        break;
      case "FACT_CHECK_ERROR":
        console.log(`✨ DID RECEIVE ERROR`);
        handleError(message);
        break;
      case "FACT_CHECK_SUCCESS":
        console.log(`✨ DID RECEIVE SUCCESS`);
        handleSuccess(message);
        break;
    }
  } catch (err) {
    console.error("Error handling message:", err);
  }

  return true; // Keep message channel open
});
