export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    console.info('[Night mode] Engine spike installed.');
  });
});
