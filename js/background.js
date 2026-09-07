/**
 * FillJoy - Background Service Worker
 *
 * chrome.storage.session is locked to "trusted contexts" (extension pages,
 * the service worker) by default. Content scripts run in the context of the
 * web page itself, so they're denied access unless a trusted context grants
 * it via setAccessLevel(). This has to be called every time the extension
 * starts up - it does not persist across browser restarts - so we call it
 * from both onInstalled (covers install/update/reload during dev) and
 * onStartup (covers normal browser launches).
 */

function grantSessionStorageAccess() {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
}

chrome.runtime.onInstalled.addListener(grantSessionStorageAccess);
chrome.runtime.onStartup.addListener(grantSessionStorageAccess);
