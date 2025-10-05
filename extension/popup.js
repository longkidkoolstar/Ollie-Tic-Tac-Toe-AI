// ===== VERSION CHECK SYSTEM CONSTANTS =====
const LOCAL_SCRIPT_VERSION = "1.0.4";
const API_BASE = "https://api.jsonstorage.net/v1/json/";
const API_PATH = "d206ce58-9543-48db-a5e4-997cfc745ef3/7e7adc93-d373-4050-b5c1-c8b7115fbdb3";
const API_KEY = "796c9bbf-df23-4228-afef-c3357694c29b";
const VERSION_CHECK_API_URL = `${API_BASE}${API_PATH}?apiKey=${API_KEY}`;
const VERSION_CHECK_INTERVAL = 1800000; // 30 minutes in milliseconds
const RETRY_DELAY = 1000; // 1 second retry delay
const UPDATE_ALERT_INTERVAL = 1000; // 1 second between update alerts

let scriptDisabled = false;
let updateAlertActive = false;
let versionCheckTimer = null;
// ===== END VERSION CHECK CONSTANTS =====

// Check if username is stored in Chrome storage
chrome.storage.sync.get(['username'], function(result) {
    if (!result.username) {
        // Alert the user
        alert('Username is not stored in storage.');

        // Prompt the user to enter the username
        let username = prompt('Please enter your Papergames username (case-sensitive):');

        // Save the username to Chrome storage
        chrome.storage.sync.set({ username: username });
    }
});

// Initialize the script enabled state
let isScriptEnabled = false; // Default to off

// Get stored script enabled state from Chrome storage
chrome.storage.sync.get(['isScriptEnabled'], function(result) {
    isScriptEnabled = result.isScriptEnabled || false; // Default to false if not set
    updateToggleButton(); // Update button text and state
});

// Toggle the script enabled state
document.getElementById('toggleScriptButton').addEventListener('click', function() {
    isScriptEnabled = !isScriptEnabled;
    chrome.storage.sync.set({ isScriptEnabled: isScriptEnabled });
    updateToggleButton();
});

// Function to update the toggle button text and power icon based on the state
function updateToggleButton() {
    const button = document.getElementById('toggleScriptButton');
    
    if (isScriptDisabled()) {
        button.textContent = 'Script Disabled (Payment/Version)';
        button.style.backgroundColor = '#8B0000'; // Dark red
        button.disabled = true;
    } else {
        button.textContent = isScriptEnabled ? 'Script On' : 'Script Off';
        button.style.backgroundColor = isScriptEnabled ? 'green' : 'red';
        button.disabled = false;
    }

    const powerIcon = document.getElementById('powerIcon');
    if (powerIcon) {
        powerIcon.className = (isScriptEnabled && !isScriptDisabled()) ? 'on' : 'off'; // Update the icon class
    }
}

// Function to handle the game's functionality
function gameFunctionality() {
    if (!isScriptEnabled || isScriptDisabled()) {
        if (isScriptDisabled()) {
            console.log("Script is disabled due to payment/version issues. Stopping functionality.");
        } else {
            console.log("Script is disabled. Stopping functionality.");
        }
        return; // Exit if the script is disabled
    }

    // Placeholder for the game's actual functionality
    console.log("Game functionality is running...");
    // Here you would include the actual logic you want to run when the script is enabled.
}

// Example of continuously checking game functionality
setInterval(gameFunctionality, 1000); // Check every second (replace with your actual game loop logic)

// Logout function
function logout() {
    chrome.storage.sync.remove(['username']);
    location.reload();
}

document.getElementById('logoutButton').addEventListener('click', logout);

// Toggle dropdown content visibility
document.getElementById('toggleButton').addEventListener('click', function() {
    const dropdownContent = document.getElementById('dropdownContent');
    dropdownContent.style.display = dropdownContent.style.display === 'none' ? 'block' : 'none';
});

// Auto Play Toggle
let isAutoPlayOn = false; // Track the state

chrome.storage.sync.get(['isAutoPlayEnabled'], function(result) {
    if (result.isAutoPlayEnabled) {
        isAutoPlayOn = true;
        document.getElementById('autoPlayToggleButton').textContent = 'Auto Play On';
        document.getElementById('autoPlayToggleButton').style.backgroundColor = 'green';
    }
});

document.getElementById('autoPlayToggleButton').addEventListener('click', toggleAutoPlay);

function toggleAutoPlay() {
    isAutoPlayOn = !isAutoPlayOn;
    chrome.storage.sync.set({ isAutoPlayEnabled: isAutoPlayOn });

    const button = document.getElementById('autoPlayToggleButton');
    button.textContent = isAutoPlayOn ? 'Auto Play On' : 'Auto Play Off';
    button.style.backgroundColor = isAutoPlayOn ? 'green' : 'red';
    
    // Send message to content script to update auto play setting
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleAutoPlay',
            enabled: isAutoPlayOn
        });
    });
}

// Depth Slider
const depthSlider = document.getElementById('depthSlider');

// Get stored depth value from Chrome storage
chrome.storage.sync.get(['depth'], function(result) {
    depthSlider.value = result.depth !== undefined ? result.depth : '100';
});

depthSlider.addEventListener('input', function(event) {
    const depth = Math.round(depthSlider.value);
    chrome.storage.sync.set({ depth: depth.toString() });

    // Show the popup with the current depth value
    const popup = document.getElementById('depthValue');
    popup.innerText = 'Depth: ' + depth;
    popup.style.display = 'block';

    // Position the popup above the slider
    const sliderRect = depthSlider.getBoundingClientRect();
    popup.style.left = `${sliderRect.left + window.scrollX + (depthSlider.offsetWidth / 2) - (popup.offsetWidth / 2)}px`;
    popup.style.top = `${sliderRect.top + window.scrollY - popup.offsetHeight - 10}px`;

    // Start a timer to hide the popup after a certain duration (e.g., 2 seconds)
    setTimeout(function() {
        popup.style.display = 'none';
    }, 2000);
});

// First Move Strategy Toggle
let isFirstMoveStrategyEnabled = false;

chrome.storage.sync.get(['isFirstMoveStrategyEnabled'], function(result) {
    isFirstMoveStrategyEnabled = result.isFirstMoveStrategyEnabled || false;
    updateFirstMoveStrategyButton();
});

function updateFirstMoveStrategyButton() {
    const button = document.getElementById('firstMoveStrategyToggle');
    button.textContent = isFirstMoveStrategyEnabled ? 'First Move Strategy: On' : 'First Move Strategy: Off';
    button.style.backgroundColor = isFirstMoveStrategyEnabled ? 'green' : 'red';
}

document.getElementById('firstMoveStrategyToggle').addEventListener('click', function() {
    isFirstMoveStrategyEnabled = !isFirstMoveStrategyEnabled;
    chrome.storage.sync.set({ isFirstMoveStrategyEnabled: isFirstMoveStrategyEnabled });
    updateFirstMoveStrategyButton();
    
    // Send message to content script to update first move strategy setting
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleFirstMoveStrategy',
            enabled: isFirstMoveStrategyEnabled
        });
    });
});

// Bot Detection Settings
let botDetectionSettings = {
    maxBotGames: 7,
    maxHumanGames: 1,
    enableBotDetectionAlert: true,
    enableBotDetectionGUI: true,
    enableConsoleLogging: true
};

// Leaderboard Settings
let leaderboardSettings = {
    enableLeaderboardCheck: false,
    leaderboardStopPosition: 16000,
    username: ''
};

// Load bot detection settings
chrome.storage.sync.get(['botDetectionSettings'], function(result) {
    if (result.botDetectionSettings) {
        botDetectionSettings = Object.assign(botDetectionSettings, result.botDetectionSettings);
    }
    updateBotDetectionUI();
});

// Load leaderboard settings
chrome.storage.sync.get(['leaderboardSettings'], function(result) {
    if (result.leaderboardSettings) {
        leaderboardSettings = Object.assign(leaderboardSettings, result.leaderboardSettings);
    }
    updateLeaderboardUI();
});

// Update bot detection UI elements
function updateBotDetectionUI() {
    document.getElementById('maxBotGamesSlider').value = botDetectionSettings.maxBotGames;
    document.getElementById('maxBotGamesValue').textContent = botDetectionSettings.maxBotGames;
    document.getElementById('maxHumanGamesSlider').value = botDetectionSettings.maxHumanGames;
    document.getElementById('maxHumanGamesValue').textContent = botDetectionSettings.maxHumanGames;
    
    const alertButton = document.getElementById('botDetectionAlertToggle');
    alertButton.textContent = 'Bot Alert: ' + (botDetectionSettings.enableBotDetectionAlert ? 'On' : 'Off');
    alertButton.style.backgroundColor = botDetectionSettings.enableBotDetectionAlert ? 'green' : 'red';
    
    const guiButton = document.getElementById('botDetectionGUIToggle');
    guiButton.textContent = 'Bot GUI: ' + (botDetectionSettings.enableBotDetectionGUI ? 'On' : 'Off');
    guiButton.style.backgroundColor = botDetectionSettings.enableBotDetectionGUI ? 'green' : 'red';
    
    const consoleButton = document.getElementById('consoleLoggingToggle');
    consoleButton.textContent = 'Console Log: ' + (botDetectionSettings.enableConsoleLogging ? 'On' : 'Off');
    consoleButton.style.backgroundColor = botDetectionSettings.enableConsoleLogging ? 'green' : 'red';
}

// Update leaderboard UI elements
function updateLeaderboardUI() {
    const checkToggle = document.getElementById('leaderboardCheckToggle');
    checkToggle.textContent = 'Leaderboard Check: ' + (leaderboardSettings.enableLeaderboardCheck ? 'On' : 'Off');
    checkToggle.style.backgroundColor = leaderboardSettings.enableLeaderboardCheck ? 'green' : 'red';
    
    document.getElementById('leaderboardStopInput').value = leaderboardSettings.leaderboardStopPosition;
    document.getElementById('leaderboardStopValue').textContent = leaderboardSettings.leaderboardStopPosition;
    document.getElementById('usernameInput').value = leaderboardSettings.username;
}

// Save bot detection settings
function saveBotDetectionSettings() {
    chrome.storage.sync.set({ botDetectionSettings: botDetectionSettings });
    // Send settings to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { botDetectionSettings: botDetectionSettings });
    });
}

// Save leaderboard settings
function saveLeaderboardSettings() {
    chrome.storage.sync.set({ leaderboardSettings: leaderboardSettings });
    // Send settings to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'updateLeaderboardSettings',
            leaderboardSettings: leaderboardSettings 
        });
    });
}

// Max Bot Games Slider
document.getElementById('maxBotGamesSlider').addEventListener('input', function(event) {
    botDetectionSettings.maxBotGames = parseInt(event.target.value);
    document.getElementById('maxBotGamesValue').textContent = botDetectionSettings.maxBotGames;
    saveBotDetectionSettings();
});

// Max Human Games Slider
document.getElementById('maxHumanGamesSlider').addEventListener('input', function(event) {
    botDetectionSettings.maxHumanGames = parseInt(event.target.value);
    document.getElementById('maxHumanGamesValue').textContent = botDetectionSettings.maxHumanGames;
    saveBotDetectionSettings();
});

// Bot Detection Alert Toggle
document.getElementById('botDetectionAlertToggle').addEventListener('click', function() {
    botDetectionSettings.enableBotDetectionAlert = !botDetectionSettings.enableBotDetectionAlert;
    updateBotDetectionUI();
    saveBotDetectionSettings();
});

// Bot Detection GUI Toggle
document.getElementById('botDetectionGUIToggle').addEventListener('click', function() {
    botDetectionSettings.enableBotDetectionGUI = !botDetectionSettings.enableBotDetectionGUI;
    updateBotDetectionUI();
    saveBotDetectionSettings();
});

// Console Logging Toggle
document.getElementById('consoleLoggingToggle').addEventListener('click', function() {
    botDetectionSettings.enableConsoleLogging = !botDetectionSettings.enableConsoleLogging;
    updateBotDetectionUI();
    saveBotDetectionSettings();
});

// Reset Counters Button
document.getElementById('resetCountersButton').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'resetCounters' });
    });
});

// Leaderboard Check Toggle
document.getElementById('leaderboardCheckToggle').addEventListener('click', function() {
    leaderboardSettings.enableLeaderboardCheck = !leaderboardSettings.enableLeaderboardCheck;
    updateLeaderboardUI();
    saveLeaderboardSettings();
});

// Leaderboard Stop Position Input
document.getElementById('leaderboardStopInput').addEventListener('input', function(event) {
    let newPosition = parseInt(event.target.value) || 16000;
    if (newPosition < 1) newPosition = 1;
    if (newPosition > 50000) newPosition = 50000;
    leaderboardSettings.leaderboardStopPosition = newPosition;
    document.getElementById('leaderboardStopValue').textContent = newPosition;
    event.target.value = newPosition;
    saveLeaderboardSettings();
});

// Username Input
document.getElementById('usernameInput').addEventListener('input', function(event) {
    leaderboardSettings.username = event.target.value.trim();
    saveLeaderboardSettings();
});

// Auto-Detect Username Button
document.getElementById('autoDetectUsernameButton').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'autoDetectUsername' }, function(response) {
            if (response && response.success && response.username) {
                leaderboardSettings.username = response.username;
                updateLeaderboardUI();
                saveLeaderboardSettings();
                alert('Username auto-detected: ' + response.username);
            } else {
                alert('Could not auto-detect username. Please enter it manually.');
            }
        });
    });
});

// Test Leaderboard Button
document.getElementById('testLeaderboardButton').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'testLeaderboard' }, function(response) {
            if (response && response.success) {
                alert('Leaderboard test completed. Check console for details.');
            } else {
                alert('Leaderboard test failed. Make sure you are on papergames.io.');
            }
        });
    });
});

// ===== VERSION CHECK SYSTEM FUNCTIONS =====

// Function to check if script is disabled
function isScriptDisabled() {
    return scriptDisabled;
}

// Version checking system
async function performVersionCheck() {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('[Version Check] Performing version check...');

            const response = await fetch(VERSION_CHECK_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[Version Check] Received data:', data);

            // Check payment status
            if (data.paid === false) {
                console.log('[Version Check] Payment required - disabling script');
                alert("Script access denied. Payment required.");
                scriptDisabled = true;
                chrome.storage.sync.set({ scriptDisabled: true });
                updateToggleButton(); // Update UI to reflect disabled state
                resolve({
                    status: 'error',
                    message: 'Payment required',
                    upToDate: false
                });
                return;
            } else {
                // Payment verified - enable script if it was previously disabled
                console.log('[Version Check] Payment verified - enabling script');
                scriptDisabled = false;
                chrome.storage.sync.set({ scriptDisabled: false });
                updateToggleButton(); // Update UI to reflect enabled state
            }

            // Check version mismatch
            if (data.scriptVersion !== LOCAL_SCRIPT_VERSION) {
                console.log(`[Version Check] Version mismatch: Local=${LOCAL_SCRIPT_VERSION}, Remote=${data.scriptVersion}`);
                console.log('[Version Check] Script outdated - disabling script');
                alert(`Script update required. Current: ${LOCAL_SCRIPT_VERSION}, Required: ${data.scriptVersion}`);
                startUpdateAlerts(data.scriptUpdateLinkExtension);
                scriptDisabled = true;
                chrome.storage.sync.set({ scriptDisabled: true });
                updateToggleButton(); // Update UI to reflect disabled state
                
                resolve({
                    status: 'outdated',
                    message: `Update required: Local=${LOCAL_SCRIPT_VERSION}, Remote=${data.scriptVersion}`,
                    upToDate: false,
                    remoteVersion: data.scriptVersion
                });
                return;
            }

            console.log('[Version Check] Version check passed - script is up to date');

            // Re-enable script if it was disabled due to version issues
            if (scriptDisabled) {
                console.log('[Version Check] Re-enabling script - version is current');
                scriptDisabled = false;
                chrome.storage.sync.set({ scriptDisabled: false });
                updateToggleButton(); // Update UI to reflect enabled state
            }

            // Update last check timestamp
            chrome.storage.sync.set({ lastVersionCheck: Date.now() });

            // Schedule next check
            if (versionCheckTimer) {
                clearTimeout(versionCheckTimer);
            }
            versionCheckTimer = setTimeout(performVersionCheck, VERSION_CHECK_INTERVAL);
            
            resolve({
                status: 'current',
                message: 'Script is up to date',
                upToDate: true
            });

        } catch (error) {
            console.log('[Version Check] Error during version check:', error.message);
            // Retry after delay for automatic checks, but reject for manual checks
            if (versionCheckTimer) {
                clearTimeout(versionCheckTimer);
            }
            versionCheckTimer = setTimeout(performVersionCheck, RETRY_DELAY);
            reject(error);
        }
    });
}

function startUpdateAlerts(updateLink) {
    if (updateAlertActive) return;
    updateAlertActive = true;

    function showUpdateAlert() {
        if (scriptDisabled) return;

        alert("UPDATE THIS EXTENSION IN ORDER TO PROCEED!");

        // Open update link in new tab
        if (updateLink) {
            chrome.tabs.create({ url: updateLink });
        }

        // Continue showing alerts every 1000ms
        setTimeout(showUpdateAlert, UPDATE_ALERT_INTERVAL);
    }

    showUpdateAlert();
}

function shouldPerformVersionCheck() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['lastVersionCheck'], function(result) {
            if (!result.lastVersionCheck) {
                resolve(true);
                return;
            }

            const timeSinceLastCheck = Date.now() - result.lastVersionCheck;
            resolve(timeSinceLastCheck >= VERSION_CHECK_INTERVAL);
        });
    });
}

// Initialize version checking
function initializeVersionCheck() {
    shouldPerformVersionCheck().then((shouldCheck) => {
        if (shouldCheck) {
            performVersionCheck();
        } else {
            // Schedule next check based on when the last check was performed
            chrome.storage.sync.get(['lastVersionCheck'], function(result) {
                const lastCheck = result.lastVersionCheck;
                const timeUntilNextCheck = VERSION_CHECK_INTERVAL - (Date.now() - lastCheck);
                if (timeUntilNextCheck > 0) {
                    versionCheckTimer = setTimeout(performVersionCheck, timeUntilNextCheck);
                } else {
                    performVersionCheck();
                }
            });
        }
    });
}

// Initialize version status display
function initializeVersionDisplay() {
    const versionInfoDisplay = document.getElementById('versionInfoDisplay');
    versionInfoDisplay.innerHTML = 'Current Version: ' + LOCAL_SCRIPT_VERSION;
}

// Manual version check button event listener
document.getElementById('checkVersionButton').addEventListener('click', function() {
    const button = document.getElementById('checkVersionButton');
    const versionInfoDisplay = document.getElementById('versionInfoDisplay');
    
    button.textContent = 'Checking...';
    button.disabled = true;
    
    // Perform version check
    performVersionCheck().then(function(result) {
        button.textContent = 'Check for Updates';
        button.disabled = false;
        
        if (result.status === 'current') {
            versionInfoDisplay.innerHTML = 'Current Version: ' + LOCAL_SCRIPT_VERSION + 
                '<br>Status: <span style="color: #2ecc71">Up to date</span>' + 
                '<br>Last checked: ' + new Date().toLocaleTimeString();
        } else if (result.status === 'outdated') {
            versionInfoDisplay.innerHTML = 'Current Version: ' + LOCAL_SCRIPT_VERSION + 
                '<br>Remote Version: ' + result.remoteVersion + 
                '<br>Status: <span style="color: #e74c3c">Update required</span>' + 
                '<br>Last checked: ' + new Date().toLocaleTimeString();
        } else {
            versionInfoDisplay.innerHTML = 'Current Version: ' + LOCAL_SCRIPT_VERSION + 
                '<br>Status: <span style="color: #f39c12">' + result.message + '</span>' + 
                '<br>Last checked: ' + new Date().toLocaleTimeString();
        }
    }).catch(function(error) {
        button.textContent = 'Check for Updates';
        button.disabled = false;
        versionInfoDisplay.innerHTML = 'Current Version: ' + LOCAL_SCRIPT_VERSION + 
            '<br>Status: <span style="color: #e74c3c">Error checking</span>' + 
            '<br>Error: ' + error.message + 
            '<br>Last checked: ' + new Date().toLocaleTimeString();
    });
});

// Check for script disabled state on startup
chrome.storage.sync.get(['scriptDisabled'], function(result) {
    if (result.scriptDisabled) {
        scriptDisabled = true;
        updateToggleButton(); // Update UI to reflect disabled state
    }
});

// Start version checking system
console.log('[Version Check] Initializing remote version checking system...');
console.log('[Version Check] Local version:', LOCAL_SCRIPT_VERSION);
console.log('[Version Check] API URL:', VERSION_CHECK_API_URL);
initializeVersionDisplay();
initializeVersionCheck();

// ===== END VERSION CHECK SYSTEM =====
