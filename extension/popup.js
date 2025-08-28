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

// Bot Detection Settings
let botDetectionSettings = {
    maxBotGames: 7,
    maxHumanGames: 1,
    enableBotDetectionAlert: true,
    enableBotDetectionGUI: true,
    enableConsoleLogging: true
};

// Load bot detection settings
chrome.storage.sync.get(['botDetectionSettings'], function(result) {
    if (result.botDetectionSettings) {
        botDetectionSettings = Object.assign(botDetectionSettings, result.botDetectionSettings);
    }
    updateBotDetectionUI();
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

// Save bot detection settings
function saveBotDetectionSettings() {
    chrome.storage.sync.set({ botDetectionSettings: botDetectionSettings });
    // Send settings to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { botDetectionSettings: botDetectionSettings });
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

// Reset Game Counters
document.getElementById('resetCountersButton').addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'resetCounters' });
    });
    alert('Game counters have been reset!');
})
