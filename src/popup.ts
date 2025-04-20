import { StorageData } from "./types/storage.js";

document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById(
    "apiKeyInput"
  ) as HTMLInputElement;
  const saveButton = document.getElementById("saveButton") as HTMLButtonElement;
  const feedback = document.getElementById("feedback") as HTMLParagraphElement;

  chrome.storage.sync.get(["apiKey"], (data: StorageData) => {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
      feedback.textContent = "API key loaded.";
      feedback.className = "feedback success";
    }
  });

  saveButton.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      feedback.textContent = "Please enter an API key.";
      feedback.className = "feedback error";
      return;
    }

    chrome.storage.sync.set({ apiKey }, () => {
      feedback.textContent = "API key saved successfully!";
      feedback.className = "feedback success";
      setTimeout(() => {
        feedback.textContent = "";
        feedback.className = "feedback";
      }, 3000);
    });
  });
});
