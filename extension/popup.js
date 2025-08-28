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
    button.textContent = isScriptEnabled ? 'Script On' : 'Script Off';
    button.style.backgroundColor = isScriptEnabled ? 'green' : 'red';

    const powerIcon = document.getElementById('powerIcon');
    powerIcon.className = isScriptEnabled ? 'on' : 'off'; // Update the icon class
}

// Function to handle the game's functionality
function gameFunctionality() {
    if (!isScriptEnabled) {
        console.log("Script is disabled. Stopping functionality.");
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
                alert('Failed to test leaderboard functionality.');
            }
        });
    });
});
