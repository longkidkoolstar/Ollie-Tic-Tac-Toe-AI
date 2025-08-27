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

// Auto Queue Toggle
let isAutoQueueOn = false; // Track the state

chrome.storage.sync.get(['isToggled'], function(result) {
    if (result.isToggled) {
        isAutoQueueOn = true;
        document.getElementById('autoQueueToggleButton').textContent = 'Auto Queue On';
        document.getElementById('autoQueueToggleButton').style.backgroundColor = 'green';
    }
});

document.getElementById('autoQueueToggleButton').addEventListener('click', toggleAutoQueue);

function toggleAutoQueue() {
    isAutoQueueOn = !isAutoQueueOn;
    chrome.storage.sync.set({ isToggled: isAutoQueueOn });

    const button = document.getElementById('autoQueueToggleButton');
    button.textContent = isAutoQueueOn ? 'Auto Queue On' : 'Auto Queue Off';
    button.style.backgroundColor = isAutoQueueOn ? 'green' : 'red';
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
