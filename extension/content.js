(function() {
    'use strict';

    var depth;


    // Function to check if the element is visible
    function isElementVisible(element) {
        return element && element.style.display !== 'none';
    }

    // Function to check for the element and click it when it becomes visible
    function waitForElementAndClick(targetElementSelector, triggerElementSelector, pollingInterval) {
        var xMark = document.querySelector(targetElementSelector);
        var countDown = document.querySelector(triggerElementSelector);

        var intervalId = setInterval(function() {
            // Check if the countDown element is now visible
            if (isElementVisible(countDown)) {
                console.log("Element is visible. Clicking.");
                xMark.click();
                clearInterval(intervalId); // Stop polling
            }
        }, pollingInterval);
    }

    // Start polling every 1 second (adjust the interval as needed)
    waitForElementAndClick('svg.fa-xmark', 'app-count-down span', 1000);

    function getBoardState() {
        var boardState = [];
        var gridItems = document.querySelectorAll('.grid.s-3x3 .grid-item');
    
        for (var i = 0; i < 3; i++) {
            var row = [];
            for (var j = 0; j < 3; j++) {
                var cell = gridItems[i * 3 + j];
                var svg = cell.querySelector('svg');
                if (svg) {
                    var label = svg.getAttribute('aria-label');
                    if (label.toLowerCase().includes('x')) {
                        row.push('x');
                    } else if (label.toLowerCase().includes('o') || label.toLowerCase().includes('circle')) {
                        row.push('o');
                    } else {
                        row.push('_');
                    }
                } else {
                    row.push('_'); // An empty cell
                }
            }
            boardState.push(row);
        }
        return boardState;
    }
    let isAutoQueueOn = false; // Track the state of the auto-queue
    let previousNumber = null; // Track the previous number for the countdown
    let checkIntervalId = null; // Store the interval ID for button checking
    let trackIntervalId = null; // Store the interval ID for countdown tracking
   

    // Function to simulate clicking on a grid cell
    function simulateCellClick(row, col) {
        const gridItems = document.querySelectorAll('.grid.s-3x3 .grid-item');
        const cell = gridItems[row * 3 + col];
        if (cell) {
          console.log(`Clicked cell element:`, cell);
          const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
          });
          cell.dispatchEvent(event);
          // Optional: Remove the highlight after a short delay
          setTimeout(() => cell.classList.remove('highlight'), 1000);
        }
      }


    // Function to receive settings from popup.js
    async function receiveSettings() {
        chrome.storage.sync.get(['depth', 'isToggled'], function(result) {
            const depth = result.depth !== undefined ? result.depth : '100'; // Default to '100'
            isAutoQueueOn = result.isToggled || false; // Set auto-queue state
    
            console.log('Depth:', depth);
            console.log('Auto Queue On:', isAutoQueueOn);
    
            // Start or stop the auto queue based on the current state
            if (isAutoQueueOn) {
                startAutoQueue();
            } else {
                stopAutoQueue();
            }
        });
    }
    
    // Function to toggle auto queue
    function toggleAutoQueue() {
        isAutoQueueOn = !isAutoQueueOn;
        chrome.storage.sync.set({ isToggled: isAutoQueueOn });
    
        // Update UI or other elements if necessary
        console.log('Auto Queue Toggled:', isAutoQueueOn);
    
        // Start or stop the auto queue based on the new state
        if (isAutoQueueOn) {
            startAutoQueue();
        } else {
            stopAutoQueue();
        }
    }
    
    // Function to click the leave room button
    function clickLeaveRoomButton() {
        const leaveRoomButton = document.querySelector("button.btn-light.ng-tns-c189-7");
        if (leaveRoomButton) {
            leaveRoomButton.click();
        }
    }
    
    // Function to click the play online button
function clickPlayOnlineButton() {
        const playOnlineButton = document.querySelector("span.front.text.btn.btn-secondary.btn-lg.text-start.juicy-btn-inner");
    if (playOnlineButton) {
        playOnlineButton.click();
    }
}
    
    // Function to check and click buttons periodically
    function checkButtonsPeriodically() {
        if (isAutoQueueOn) {
            clickLeaveRoomButton();
            clickPlayOnlineButton();
        }
    }
    
    // Function to track countdown and click if it changes
    function trackAndClickIfDifferent() {
        const spanElement = document.querySelector('app-count-down span');
        if (spanElement) {
            const number = parseInt(spanElement.textContent, 10);
            if (!isNaN(number)) {
                if (previousNumber !== null && number !== previousNumber && isAutoQueueOn) {
                    spanElement.click();
                }
                previousNumber = number;
            }
        }
    }
    
    // Function to start the auto-queue process
    function startAutoQueue() {
        if (!checkIntervalId) { // Start only if it's not already running
            checkIntervalId = setInterval(checkButtonsPeriodically, 1000);
        }
        if (!trackIntervalId) { // Start only if it's not already running
            trackIntervalId = setInterval(trackAndClickIfDifferent, 1000);
        }
    }
    
    // Function to stop the auto-queue process
    function stopAutoQueue() {
        clearInterval(checkIntervalId);
        clearInterval(trackIntervalId);
        checkIntervalId = null;
        trackIntervalId = null;
    }
    
    // Function to monitor storage changes and update auto queue state dynamically
    function monitorSettings() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync' && changes.isToggled) {
                isAutoQueueOn = changes.isToggled.newValue; // Update the state
    
                // Start or stop auto queue based on the new value
                if (isAutoQueueOn) {
                    startAutoQueue();
                } else {
                    stopAutoQueue();
                }
            }
        });
    }
    
    // Add an event listener to receive messages from the popup
    window.addEventListener('message', function(event) {
        if (event.source !== window) return; // Only accept messages from the same window
        if (event.data.type && event.data.type === 'SETTINGS_UPDATE') {
            receiveSettings();
        }
    }, false);
    
    // Call receiveSettings on load to get initial values
    receiveSettings();
    
    // Start monitoring settings for changes
    monitorSettings();
    
    


    //------------------------------------------------

    var player = null; // Global player variable
    let prevElementValue = ''; // Moved outside function for persistence

function updateBoard(squareId) {
    var row = parseInt(squareId[0]);
    var col = parseInt(squareId[1]);

    // Use Chrome Storage API to get the username
    chrome.storage.sync.get("username", function(result) {
        var username = result.username; // Retrieve the username from storage
        if (!username) {
            console.error("Username not found in storage");
            return;
        }

        var profileOpeners = document.querySelectorAll(".text-truncate.cursor-pointer");
        var profileOpener = null;

        profileOpeners.forEach(function(opener) {
            if (opener.textContent.trim() === username) {
                profileOpener = opener;
            }
        });

        if (!profileOpener) {
            console.error("Profile opener not found");
            return;
        }

        var chronometer = document.querySelector("app-chronometer");
        var numberElement = profileOpener.parentNode ? profileOpener.parentNode.querySelectorAll("span")[4] : null;
        var profileOpenerParent = profileOpener.parentNode ? profileOpener.parentNode.parentNode : null;

        var svgElement = profileOpenerParent.querySelector("circle[class*='circle-dark-stroked']");
        if (!svgElement) {
            svgElement = profileOpenerParent.querySelector("svg[class*='fa-xmark']");
        }

        if (svgElement && svgElement.closest("circle[class*='circle-dark-stroked']")) {
            player = 'o'; // Player is playing as "O"
        } else if (svgElement && svgElement.closest("svg[class*='fa-xmark']")) {
            player = 'x'; // Player is playing as "X"
        }

        var currentElement = chronometer || numberElement;

        // Check if the chronometer has changed, and if it's the player's turn
        if (currentElement.textContent !== prevElementValue && profileOpener) {
            prevElementValue = currentElement.textContent; // Update to current chronometer value
            simulateCellClick(row, col); // Trigger click
        } else {
            console.log("Waiting for AI's turn...");
        }
    });

    return player;
}


    function findBestMove(board, player) {
        console.log("Current player: " + player); // Debug statement to show the value of the player variable

        var bestVal = -1000;
        var bestMove = { row: -1, col: -1 };

        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                if (board[i][j] === '_') {
                    board[i][j] = player;
                    var moveVal = minimax(board, 0, false, depth);
                    board[i][j] = '_';

                    if (moveVal > bestVal) {
                        bestMove.row = i;
                        bestMove.col = j;
                        bestVal = moveVal;
                    }
                }
            }
        }

        console.log("The value of the best Move is: " + bestVal);
        return bestMove;
    }
    
    function logBoardState() {
        // Attempt to log various variables and elements for debugging
        try {
            // Log row and col based on a hardcoded squareId for debugging
            var squareId = "00"; // Change this as needed for different squares
            var row = parseInt(squareId[0]);
            var col = parseInt(squareId[1]);
    
            console.log("Row:", row, "Col:", col);
    
            // Use Chrome Storage API to get the username
            chrome.storage.sync.get("username", function(result) {
                var username = result.username; // Retrieve the username from storage
                console.log("Username from Chrome storage:", username);
    
                // Log profile openers
                var profileOpeners = document.querySelectorAll(".text-truncate.cursor-pointer");
                console.log("Profile Openers:", profileOpeners);
    
                var profileOpener = null;
    
                profileOpeners.forEach(function(opener) {
                    if (opener.textContent.trim() === username) {
                        profileOpener = opener;
                    }
                });
    
                console.log("Profile Opener:", profileOpener);
    
                // Log chronometer element
                var chronometer = document.querySelector("app-chronometer");
                console.log("Chronometer:", chronometer);
    
                // Log number element
                var numberElement = profileOpener ? profileOpener.parentNode.querySelectorAll("span")[4] : null;
                console.log("Number Element:", numberElement);
    
                // Log profile opener parent
                var profileOpenerParent = profileOpener ? profileOpener.parentNode.parentNode : null;
                console.log("Profile Opener Parent:", profileOpenerParent);
    
                // Log SVG element
                var svgElement = profileOpenerParent ? profileOpenerParent.querySelector("circle[class*='circle-dark-stroked']") : null;
                if (!svgElement && profileOpenerParent) {
                    svgElement = profileOpenerParent.querySelector("svg[class*='fa-xmark']");
                }
                console.log("SVG Element:", svgElement);
    
                // Determine and log the player
                var player = null;
                if (svgElement && svgElement.closest("circle[class*='circle-dark-stroked']")) {
                    player = 'o'; // Player is playing as "O"
                } else if (svgElement && svgElement.closest("svg[class*='fa-xmark']")) {
                    player = 'x'; // Player is playing as "X"
                }
                console.log("Player:", player);
    
                // Log current element
                var currentElement = chronometer || numberElement;
                console.log("Current Element:", currentElement);
    
                console.log("Logging complete for this iteration.\n");
            });
        } catch (error) {
            console.error("Error in logBoardState:", error);
        }
    }
    
    
    // Call logBoardState every 5 seconds
    setInterval(logBoardState, 5000);
    

    var player;

    function initGame() {
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.target.id === 'tic-tac-toe-board') {
                    initAITurn();
                }
            });
        });

        observer.observe(document.getElementById('tic-tac-toe-board'), { attributes: true, childList: true, subtree: true });
    }


    function initAITurn() {
        displayBoardAndPlayer();
        var boardState = getBoardState();
        var bestMove = findBestMove(boardState, player);
        updateBoard(bestMove.row.toString() + bestMove.col.toString());
    }


    function displayBoardAndPlayer() {
        var boardState = getBoardState();
        console.log("Board State:");
        boardState.forEach(function(row) {
            console.log(row.join(' | '));
        });
    }

    function getOpponent(player) {
        return player === 'x' ? 'o' : 'x';
    }

    function minimax(board, depth, isMaximizingPlayer, maxDepth) {
        var score = evaluateBoard(board);

        if (depth === maxDepth) {
            return evaluateBoard(board);
        }

        if (score === 10)
            return score - depth;

        if (score === -10)
            return score + depth;

        if (areMovesLeft(board) === false)
            return 0;

        if (isMaximizingPlayer) {
            var best = -1000;

            for (var i = 0; i < 3; i++) {
                for (var j = 0; j < 3; j++) {
                    if (board[i][j] === '_') {
                        board[i][j] = player;
                        best = Math.max(best, minimax(board, depth + 1, !isMaximizingPlayer));
                        board[i][j] = '_';
                    }
                }
            }
            return best;
        } else {
            var best = 1000;

            for (var i = 0; i < 3; i++) {
                for (var j = 0; j < 3; j++) {
                    if (board[i][j] === '_') {
                        board[i][j] = getOpponent(player);
                        best = Math.min(best, minimax(board, depth + 1, !isMaximizingPlayer));
                        board[i][j] = '_';
                    }
                }
            }
            return best;
        }
    }

    function evaluateBoard(board) {
        // Check rows for victory
        for (let row = 0; row < 3; row++) {
            if (board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
                if (board[row][0] === player) return +10;
                else if (board[row][0] !== '_') return -10;
            }
        }

        // Check columns for victory
        for (let col = 0; col < 3; col++) {
            if (board[0][col] === board[1][col] && board[1][col] === board[2][col]) {
                if (board[0][col] === player) return +10;
                else if (board[0][col] !== '_') return -10;
            }
        }

        // Check diagonals for victory
        if (board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
            if (board[0][0] === player) return +10;
            else if (board[0][0] !== '_') return -10;
        }

        if (board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
            if (board[0][2] === player) return +10;
            else if (board[0][2] !== '_') return -10;
        }

        // If no one has won, return 0
        return 0;
    }

    function areMovesLeft(board) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] === '_') return true;
            }
        }
        return false;
    }

// Function to check if the script is enabled
function checkIfScriptEnabled() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['isScriptEnabled'], function(result) {
            resolve(result.isScriptEnabled);
        });
    });
}



/**
 * Function to check if the game room is unavailable.
 * If the game room is unavailable, redirects to Tic Tac Toe.
 * If the button text is "Leave room", clicks the button.
 */
function WebsiteErrorHandler() {
    console.log("Checking for button click...");
    const button = document.querySelector('button.btn-outline-dark.ng-star-inserted');
    console.log("button", button);

    // Check if "Game room unavailable" message is displayed
    const gameRoomUnavailable = document.querySelector('.container.d-flex.justify-content-center.align-items-center.flex-column');
    const errorText = gameRoomUnavailable?.querySelector('h1.h3')?.textContent;
    console.log("gameRoomUnavailable", gameRoomUnavailable);

    if (errorText === "Game room unavailable") {
        // Click the tic-tac-toe link
        const ticTacToeLink = document.querySelector('a[href="/en/tic-tac-toe"]');
        if (ticTacToeLink) {
            console.log("Game room unavailable. Redirecting to Tic Tac Toe...");
            ticTacToeLink.click();
            return;
        }
    }

    if (button && button.textContent.includes("Leave room") && isAutoQueueOn) {
        console.log("Button text is 'Leave room', waiting 1 second before clicking...");
        setTimeout(() => {
            if (button.textContent.includes("Leave room")) {
                console.log("Button text still says 'Leave room', clicking the button...");
                button.click();
            } else {
                console.log("Button text changed, not clicking...");
            }
        }, 1000);
    }
}

// Run the function every second
setInterval(WebsiteErrorHandler, 1000);


  
  
  
  //   && !button.textContent.includes('Play vs robot')        -- removed for now due to debugging purposes
  

// Function to start checking the script's enabled state at regular intervals
async function startInterval() {


    setInterval(async function() {
        const isEnabled = await checkIfScriptEnabled();

        // Only run the functionality if the state has changed to enabled
        if (isEnabled) {
            console.log("Script enabled. Starting functionality...");
            initAITurn(); // Call the function when enabled
        } else if (!isEnabled) {
            console.log("Script disabled. Stopping functionality...");
            // Optionally handle stopping the functionality if needed
        }


    }, 1000); // Check every second
}

// Call the function to start the interval
startInterval();



    document.addEventListener('DOMContentLoaded', function() {
        initGame();
    });
})();