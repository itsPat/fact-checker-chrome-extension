import {
  ErrorMessage,
  LoadingMessage,
  SuccessMessage,
} from "./types/message.js";
import { SonarResponse } from "./types/sonar.js";
import { StorageData } from "./types/storage.js";

const MENU_ITEM_ID = "FACT_CHECK";

const SYSTEM_PROMPT = `
You are an expert fact checker. Your task is to evaluate claims and provide clear, evidence-based assessments.

# Rules:
- Begin with a verdict in ALL CAPS: "TRUE: " "FALSE: " or "UNCERTAIN: "
- Follow with a single concise sentence explaining your verdict.
- Include the most relevant source for your determination when possible.
- Avoid political bias - focus only on verifiable facts.

# Example:
TRUE: Google LLC is indeed an American multinational corporation and technology company, as confirmed by sources such as Wikipedia and Britannica.[3][4]
`;

console.log(`✨ BACKGROUND SCRIPT LOADED`);
chrome.runtime.onInstalled.addListener(() => {
  console.log(`✨ BACKGROUND SCRIPT INSTALLED`);
  chrome.contextMenus.create({
    id: MENU_ITEM_ID,
    title: "Fact-Check with Perplexity",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(
  async (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    console.log(`✨ CONTEXT MENU CLICK`, info);
    if (!tab || !tab.id) return;
    if (info.menuItemId !== MENU_ITEM_ID) return;

    const tabId = tab.id;

    try {
      // Set loading
      console.log(`✨ DID SET LOADING`);
      chrome.tabs.sendMessage(tabId, {
        type: "FACT_CHECK_LOADING",
      } as LoadingMessage);

      // Get API Key
      const apiKey: string | undefined = await new Promise((res) =>
        chrome.storage.sync.get(["apiKey"], async (data: StorageData) =>
          res(data.apiKey)
        )
      );
      if (!apiKey) throw new Error("API Key is not set.");

      if (!info.selectionText) throw new Error("No text was selected.");

      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              {
                role: "system",
                content: SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: info.selectionText,
              },
            ],
          }),
        }
      );

      if (!response.ok)
        throw new Error(`API request failed: ${response.statusText}`);

      const data: SonarResponse = await response.json();

      const answer = data.choices?.[0]?.message.content;
      if (!answer) throw new Error("Unable to get answer from Perplexity.");

      const citations = data.citations ?? [];

      console.log(`✨ DID SET SUCCESS`);
      chrome.tabs.sendMessage(tabId, {
        type: "FACT_CHECK_SUCCESS",
        answer,
        citations,
        selectedText: info.selectionText,
      } as SuccessMessage);
    } catch (error) {
      console.error(error);
      console.log(`✨ DID SET ERROR`);
      chrome.tabs.sendMessage(tabId, {
        type: "FACT_CHECK_ERROR",
        error:
          error instanceof Error ? error.message : "Unknown error occurred.",
      } as ErrorMessage);
    }
  }
);
