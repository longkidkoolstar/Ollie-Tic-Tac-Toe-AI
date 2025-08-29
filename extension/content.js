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
    let isAutoPlayOn = false; // Track the state of the auto-play system
    let previousNumber = null; // Track the previous number for the countdown
    let checkIntervalId = null; // Store the interval ID for button checking
    let trackIntervalId = null; // Store the interval ID for countdown tracking
    let isFirstMoveStrategyEnabled = false; // Track the First Move Strategy state
    
    // Leaderboard settings
    let leaderboardSettings = {
        enableLeaderboardCheck: false,
        leaderboardStopPosition: 16000,
        username: ''
    };
   

    // Function to simulate clicking on a grid cell
    function simulateCellClick(row, col) {
        const gridItems = document.querySelectorAll('.grid.s-3x3 .grid-item');
        const cell = gridItems[row * 3 + col];
        if (cell) {
          //console.log(`Clicked cell element:`, cell);
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
        chrome.storage.sync.get(['depth', 'isAutoPlayEnabled', 'isFirstMoveStrategyEnabled'], function(result) {
            const depth = result.depth !== undefined ? result.depth : '100'; // Default to '100'
            isAutoPlayOn = result.isAutoPlayEnabled || false; // Set auto-play state
            isFirstMoveStrategyEnabled = result.isFirstMoveStrategyEnabled || false; // Set first move strategy state
    
            console.log('Depth:', depth);
            console.log('Auto Play On:', isAutoPlayOn);
            console.log('First Move Strategy Enabled:', isFirstMoveStrategyEnabled);
    
            // Start or stop the auto play based on the current state
            if (isAutoPlayOn) {
                startAutoPlay();
            } else {
                stopAutoPlay();
            }
        });
    }
    
    // Function to toggle auto play
    function toggleAutoPlay() {
        isAutoPlayOn = !isAutoPlayOn;
        chrome.storage.sync.set({ isAutoPlayEnabled: isAutoPlayOn });

        // Update UI or other elements if necessary
        console.log('Auto Play Toggled:', isAutoPlayOn);

        // Start or stop the auto play based on the new state
        if (isAutoPlayOn) {
            startAutoPlay();
        } else {
            stopAutoPlay();
        }
    }
    
    // Wait for rematch buttons to appear after game ends
    function waitForRematchButtons(callback, isPlayAgain) {
        var attempts = 0;
        var maxAttempts = 20; // 10 seconds max
        var actionType = isPlayAgain ? 'play again' : 'leave';

        BotManager.log('Game ended - Waiting for ' + actionType + ' button to appear');

        var checkButtons = setInterval(function() {
            attempts++;

            // Check for new app-juicy-button structure
            var juicyButtons = document.querySelectorAll('app-juicy-button');
            var legacyButtons = document.querySelectorAll("body > app-root > app-navigation > div > div.d-flex.flex-column.h-100.w-100 > main > app-room > div > div > div.col-md-9.col-lg-8.bg-gray-000.h-100.position-relative.overflow-hidden.ng-tns-c1645232060-14 > div > div > div > app-re-match > div > button");

            var buttonsFound = juicyButtons.length > 0 || legacyButtons.length > 0;

            if (buttonsFound) {
                clearInterval(checkButtons);
                BotManager.log('Rematch buttons appeared after ' + (attempts * 0.5) + ' seconds');
                BotManager.log('Found ' + juicyButtons.length + ' app-juicy-button components and ' + legacyButtons.length + ' legacy buttons');
                callback();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkButtons);
                BotManager.log('Rematch buttons did not appear after 10 seconds', 'WARN');

                // Debug: Log what we can see
                BotManager.log('=== DEBUG: What we can see after timeout ===');
                var allJuicy = document.querySelectorAll('app-juicy-button');
                var allButtons = document.querySelectorAll('button');
                BotManager.log('Total app-juicy-button components: ' + allJuicy.length);
                BotManager.log('Total button elements: ' + allButtons.length);

                // Fallback: leave and find new opponent
                setTimeout(function() {
                    console.log("wait for rematch button activating");
                    clickLeaveRoomButton();
                    setTimeout(function() {
                        clickPlayOnlineButton();
                    }, 1000);
                }, 1000);
            }
        }, 500);
    }

    // Smart Play Again Button Logic
    function clickPlayAgainButton() {
        BotManager.log('Searching for play again button...');

        // New selectors for app-juicy-button structure
        var juicyButtonSelectors = [
            'app-juicy-button button',  // Any button inside app-juicy-button
            'app-juicy-button.mt-3 button',  // Button with mt-3 class
            'app-juicy-button button.btn.btn-secondary',  // Specific button class
            'button .front.text span',  // The span containing the text
            'span.front.text.btn.btn-secondary',  // Direct span selector for new structure
            '.front.text.btn.btn-secondary'  // Class-based selector for new structure
        ];

        // Try the new app-juicy-button selectors first
        for (var i = 0; i < juicyButtonSelectors.length; i++) {
            var buttons = document.querySelectorAll(juicyButtonSelectors[i]);
            BotManager.log('Juicy button selector "' + juicyButtonSelectors[i] + '" found ' + buttons.length + ' buttons');

            for (var j = 0; j < buttons.length; j++) {
                var button = buttons[j];
                var buttonText = button.textContent.toLowerCase().trim();
                BotManager.log('Juicy button text: "' + buttonText + '"');

                if (buttonText.includes('play') && buttonText.includes('again')) {
                    // For app-juicy-button, we need to click the actual button element or clickable span
                    var actualButton = button.tagName === 'BUTTON' ? button : button.closest('button');
                    if (actualButton) {
                        actualButton.click();
                        BotManager.log('Clicked play again button using juicy selector: "' + buttonText + '"');
                        return true;
                    } else if (button.tagName === 'SPAN' && button.classList.contains('btn')) {
                        // Handle clickable span elements that act as buttons
                        button.click();
                        BotManager.log('Clicked play again span button using juicy selector: "' + buttonText + '"');
                        return true;
                    }
                }
            }
        }

        // Check for app-juicy-button components specifically
        var juicyButtons = document.querySelectorAll('app-juicy-button');
        BotManager.log('Found ' + juicyButtons.length + ' app-juicy-button components');

        for (var k = 0; k < juicyButtons.length; k++) {
            var juicyButton = juicyButtons[k];
            var buttonText = juicyButton.textContent.toLowerCase().trim();
            BotManager.log('App-juicy-button ' + k + ' text: "' + buttonText + '"');

            if (buttonText.includes('play') && buttonText.includes('again')) {
                // Find the actual button element inside
                var innerButton = juicyButton.querySelector('button');
                if (innerButton) {
                    innerButton.click();
                    BotManager.log('Clicked play again app-juicy-button: "' + buttonText + '"');
                    return true;
                }
            }
        }

        // Legacy selectors for backwards compatibility
        var legacySelectors = [
            'button.btn.btn-secondary.mt-2.ng-star-inserted',
            'app-re-match button',
            'app-re-match div button',
            'button[class*="btn-secondary"]',
            'button[class*="ng-star-inserted"]'
        ];

        for (var l = 0; l < legacySelectors.length; l++) {
            var buttons = document.querySelectorAll(legacySelectors[l]);
            BotManager.log('Legacy selector "' + legacySelectors[l] + '" found ' + buttons.length + ' buttons');

            for (var m = 0; m < buttons.length; m++) {
                var button = buttons[m];
                var buttonText = button.textContent.toLowerCase().trim();

                if (buttonText.includes('play') && buttonText.includes('again')) {
                    button.click();
                    BotManager.log('Clicked play again button using legacy selector: "' + buttonText + '"');
                    return true;
                }
            }
        }

        // Final fallback - search all buttons
        var allButtons = document.querySelectorAll('button');
        BotManager.log('Final fallback: searching all ' + allButtons.length + ' buttons on page');

        for (var n = 0; n < allButtons.length; n++) {
            var button = allButtons[n];
            var text = button.textContent.toLowerCase().trim();

            if (text.includes('play') && text.includes('again')) {
                button.click();
                BotManager.log('Clicked play again button found by text search: "' + text + '"');
                return true;
            }
        }

        BotManager.log('Play again button not found with any method', 'WARN');
        return false;
    }

    // Smart Leave Room Button Logic
    function clickLeaveRoomButton() {
        BotManager.log('Searching for leave room button...');

        // New selectors for app-juicy-button structure
        var juicyButtonSelectors = [
            'app-juicy-button button',  // Any button inside app-juicy-button
            'app-juicy-button.mt-3 button',  // Button with mt-3 class
            'app-juicy-button button.btn.btn-light',  // Specific button class
            'button .front.text span'  // The span containing the text
        ];

        // Try the new app-juicy-button selectors first
        for (var i = 0; i < juicyButtonSelectors.length; i++) {
            var buttons = document.querySelectorAll(juicyButtonSelectors[i]);
            BotManager.log('Juicy button selector "' + juicyButtonSelectors[i] + '" found ' + buttons.length + ' buttons');

            for (var j = 0; j < buttons.length; j++) {
                var button = buttons[j];
                var buttonText = button.textContent.toLowerCase().trim();
                BotManager.log('Juicy button text: "' + buttonText + '"');

                if (buttonText.includes('leave')) {
                    // For app-juicy-button, we need to click the actual button element
                    var actualButton = button.tagName === 'BUTTON' ? button : button.closest('button');
                    if (actualButton) {
                        actualButton.click();
                        BotManager.log('Clicked leave button using juicy selector: "' + buttonText + '"');
                        return true;
                    }
                }
            }
        }

        // Check for app-juicy-button components specifically
        var juicyButtons = document.querySelectorAll('app-juicy-button');
        BotManager.log('Found ' + juicyButtons.length + ' app-juicy-button components');

        for (var k = 0; k < juicyButtons.length; k++) {
            var juicyButton = juicyButtons[k];
            var buttonText = juicyButton.textContent.toLowerCase().trim();
            BotManager.log('App-juicy-button ' + k + ' text: "' + buttonText + '"');

            if (buttonText.includes('leave')) {
                // Find the actual button element inside
                var innerButton = juicyButton.querySelector('button');
                if (innerButton) {
                    innerButton.click();
                    BotManager.log('Clicked leave app-juicy-button: "' + buttonText + '"');
                    return true;
                }
            }
        }

        // Legacy selectors for backwards compatibility
        var legacySelectors = [
            'button.btn-light.ng-tns-c189-7',
            'app-re-match button',
            'app-re-match div button',
            'button[class*="btn-light"]',
            'button[class*="ng-star-inserted"]'
        ];

        for (var l = 0; l < legacySelectors.length; l++) {
            var buttons = document.querySelectorAll(legacySelectors[l]);
            BotManager.log('Legacy selector "' + legacySelectors[l] + '" found ' + buttons.length + ' buttons');

            for (var m = 0; m < buttons.length; m++) {
                var button = buttons[m];
                var buttonText = button.textContent.toLowerCase().trim();

                if (buttonText.includes('leave')) {
                    button.click();
                    BotManager.log('Clicked leave button using legacy selector: "' + buttonText + '"');
                    return true;
                }
            }
        }

        // Final fallback - search all buttons
        var allButtons = document.querySelectorAll('button');
        BotManager.log('Final fallback: searching all ' + allButtons.length + ' buttons on page');

        for (var n = 0; n < allButtons.length; n++) {
            var button = allButtons[n];
            var text = button.textContent.toLowerCase().trim();

            if (text.includes('leave')) {
                button.click();
                BotManager.log('Clicked leave button found by text search: "' + text + '"');
                return true;
            }
        }

        BotManager.log('Leave button not found with any method', 'WARN');
        return false;
    }
    
    // Function to click the play online button
    function clickPlayOnlineButton() {
        BotManager.log('Searching for play online button...');
        
        var selectors = [
            "span.front.text.btn.btn-secondary.btn-lg.text-start.juicy-btn-inner",
            "button.btn.btn-secondary.btn-lg",
            "[class*='juicy-btn-inner']",
            "button[class*='btn-secondary']"
        ];
        
        for (var i = 0; i < selectors.length; i++) {
            var playOnlineButton = document.querySelector(selectors[i]);
            if (playOnlineButton) {
                playOnlineButton.click();
                BotManager.log('Clicked play online button using selector: ' + selectors[i]);
                return true;
            }
        }
        
        BotManager.log('Play online button not found', 'WARN');
        return false;
    }
    
    // Game end decision logic - determines whether to play again or leave
    function handleGameEnd() {
        BotManager.log('=== GAME ENDED - Making decision ===');
        BotManager.log('Current opponent: ' + (BotManager.currentOpponent || 'Unknown'));
        
        var currentOpponent = BotManager.currentOpponent;
        if (!currentOpponent) {
            BotManager.log('No current opponent detected, leaving to find new opponent', 'WARN');
            setTimeout(function() {
                console.log("handlegameend button activating");
                clickLeaveRoomButton();
                setTimeout(function() {
                    clickPlayOnlineButton();
                }, 1000);
            }, 1000);
            return;
        }
        
        // Initialize opponent game count if not exists
        if (!BotManager.opponentGameCounts[currentOpponent]) {
            BotManager.opponentGameCounts[currentOpponent] = 0;
        }
        
        // Increment games with this specific opponent
        BotManager.opponentGameCounts[currentOpponent]++;
        
        var gamesWithThisOpponent = BotManager.opponentGameCounts[currentOpponent];
        BotManager.log('Games with ' + currentOpponent + ': ' + gamesWithThisOpponent);
        BotManager.log('Total bot games: ' + BotManager.botGamesPlayed);
        BotManager.log('Total human games: ' + BotManager.humanGamesPlayed);
        
        var isCurrentOpponentBot = BotManager.isKnownBot(currentOpponent);
        BotManager.log('Is current opponent a bot: ' + isCurrentOpponentBot);
        
        var shouldPlayAgain = false;
        var reason = '';
        var maxGamesWithCurrentOpponent = isCurrentOpponentBot ? BotManager.settings.maxBotGames : BotManager.settings.maxHumanGames;
        
        // Also increment total counters for statistics
        if (isCurrentOpponentBot) {
            BotManager.botGamesPlayed++;
        } else {
            BotManager.humanGamesPlayed++;
        }
        
        // Decision based on games with this specific opponent
        if (gamesWithThisOpponent < maxGamesWithCurrentOpponent) {
            shouldPlayAgain = true;
            reason = 'Continue with ' + (isCurrentOpponentBot ? 'bot' : 'human') + ' "' + currentOpponent + '" (' + gamesWithThisOpponent + '/' + maxGamesWithCurrentOpponent + ')';
        } else {
            shouldPlayAgain = false;
            reason = (isCurrentOpponentBot ? 'Bot' : 'Human') + ' "' + currentOpponent + '" game limit reached (' + maxGamesWithCurrentOpponent + '), looking for new opponent';
            // Note: We keep the game count for this opponent for future reference
        }
        
        BotManager.log('Decision: ' + (shouldPlayAgain ? 'PLAY AGAIN' : 'LEAVE') + ' - ' + reason);
        BotManager.setThinking(
            shouldPlayAgain ? 'Playing Again' : 'Finding New Opponent',
            reason
        );
        BotManager.saveSettings();
        
        // Wait for buttons to appear, then execute decision
        waitForRematchButtons(function() {
            if (shouldPlayAgain) {
                BotManager.log('Executing: Play Again');
                var success = clickPlayAgainButton();
                if (!success) {
                    BotManager.log('Play again failed, falling back to leave and find new opponent');
                    setTimeout(function() {
                        clickLeaveRoomButton();
                        setTimeout(function() {
                            clickPlayOnlineButton();
                        }, 1000);
                    }, 1000);
                }
            } else {
                BotManager.log('Executing: Leave and find new opponent');
                setTimeout(function() {
                    console.log("second wait for rematch button part2 activating");
                    clickLeaveRoomButton();
                    setTimeout(function() {
                        clickPlayOnlineButton();
                    }, 1000);
                }, 1000);
            }
        }, shouldPlayAgain);
    }
    
    // Function to check and click buttons periodically
    function checkButtonsPeriodically() {
        if (isAutoPlayOn) {
            // Check leaderboard position before continuing auto-play
            if (checkLeaderboardPosition()) {
                // Target position reached, auto-play stopped
                return;
            }
            
            // Check if we're in matchmaking
            if (isInMatchmaking()) {
                BotManager.setThinking('Matchmaking Active', 'Finding a random player...');
            }
            
            // Check if rematch buttons are visible (actual game end)
            var juicyButtons = document.querySelectorAll('app-juicy-button');
            var legacyButtons = document.querySelectorAll("body > app-root > app-navigation > div > div.d-flex.flex-column.h-100.w-100 > main > app-room > div > div > div.col-md-9.col-lg-8.bg-gray-000.h-100.position-relative.overflow-hidden.ng-tns-c1645232060-14 > div > div > div > app-re-match > div > button");
            var rematchButtonsVisible = juicyButtons.length > 0 || legacyButtons.length > 0;
            
            if (rematchButtonsVisible && gameState.opponentDetected && !gameState.gameEndDetected) {
                // Game actually ended - UI shows rematch buttons
                BotManager.log('=== ACTUAL GAME END DETECTED (UI shows rematch buttons) ===');
                gameState.gameEndDetected = true;
                gameState.isGameActive = false;
                handleGameEnd();
            } else if (!rematchButtonsVisible && !gameState.isGameActive) {
                // Not in game and no rematch buttons, try to find and start a new game
                clickPlayOnlineButton();
            }
        }
    }
    
    // Function to start the auto-play process
    function startAutoPlay() {
        if (!checkIntervalId) { // Start only if it's not already running
            checkIntervalId = setInterval(checkButtonsPeriodically, 1000);
        }
    }

    // Function to stop the auto-play process
    function stopAutoPlay() {
        clearInterval(checkIntervalId);
        clearInterval(trackIntervalId);
        checkIntervalId = null;
        trackIntervalId = null;
    }
    
    // Function to monitor storage changes and update auto play state dynamically
    function monitorSettings() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync' && changes.isAutoPlayEnabled) {
                // Auto play changes are now handled through BotManager.updateAutoPlaySetting()
                // This listener is kept for potential future storage monitoring needs
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
    
    // Initialize GUI after a short delay to ensure page is loaded
    setTimeout(function() {
        BotManager.initializeGUI();
    }, 1000);
    
    


    // Helper function to check if we're in matchmaking
    function isInMatchmaking() {
        var matchmakingSelectors = [
            '.display-6.mb-4.text-center.animated.fast.fadeIn.ng-star-inserted',
            '.display-6.mb-4.text-center',
            '[class*="display-6"]'
        ];

        for (var i = 0; i < matchmakingSelectors.length; i++) {
            var element = document.querySelector(matchmakingSelectors[i]);
            if (element) {
                var text = element.textContent.toLowerCase();
                if (text.includes('finding a random player') ||
                    text.includes('looking for opponent') ||
                    text.includes('searching for player') ||
                    text.includes('matchmaking')) {
                    return true;
                }
            }
        }
        return false;
    }

    //------------------------------------------------
    // Bot Detection System
    var BotManager = {
        knownBots: [],
        detectionHistory: [],
        lastProfileDetectionName: null,
        currentOpponent: null,
        opponentGameCounts: {}, // Games played with each individual opponent
        botGamesPlayed: 0, // Total bot games (for statistics)
        humanGamesPlayed: 0, // Total human games (for statistics)
        settings: {
            maxBotGames: 7,
            maxHumanGames: 1,
            enableBotDetectionAlert: true,
            enableBotDetectionGUI: true,
            enableConsoleLogging: true,
            isAutoPlayEnabled: false
        },

        log: function(message, type) {
            var prefix = type === 'ERROR' ? '❌' : type === 'WARN' ? '⚠️' : type === 'SUCCESS' ? '✅' : 'ℹ️';
            console.log(prefix + ' [Bot Detection] ' + message);
        },

        // Set thinking status and update GUI
        setThinking: function(status, details) {
            this.currentThinking = {
                status: status || 'Idle',
                details: details || '',
                timestamp: new Date().toLocaleTimeString()
            };
            this.updateStatusBar();
            this.log('Status: ' + status + (details ? ' - ' + details : ''));
        },

        // Initialize and create the persistent status bar GUI
        initializeGUI: function() {
            if (document.getElementById('ttt-ai-status-bar')) return; // Already initialized
            
            var self = this;
            
            // Create main status bar container
            var statusBar = document.createElement('div');
            statusBar.id = 'ttt-ai-status-bar';
            
            // Load saved position or use default
            chrome.storage.sync.get(['guiPosition'], function(result) {
                var position = result.guiPosition || { top: 10, right: 10 };
                
                statusBar.style.cssText = `
                    position: fixed;
                    top: ${position.top}px;
                    right: ${position.right}px;
                    background: linear-gradient(135deg, #2c3e50, #34495e);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    font-size: 13px;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    min-width: 280px;
                    max-width: 400px;
                    border: 1px solid #34495e;
                    cursor: move;
                    user-select: none;
                `;
                
                // Continue with the rest of the GUI setup after positioning is set
                self.continueGUISetup(statusBar);
            });
        },
        
        // Continue GUI setup after position is loaded
        continueGUISetup: function(statusBar) {
            
            // Status content container
            var statusContent = document.createElement('div');
            statusContent.id = 'ttt-status-content';
            statusContent.style.cssText = `
                margin-bottom: 8px;
                line-height: 1.4;
            `;
            
            // Bot thinking display
            var thinkingDisplay = document.createElement('div');
            thinkingDisplay.id = 'ttt-thinking-display';
            thinkingDisplay.style.cssText = `
                background: rgba(52, 73, 94, 0.7);
                padding: 8px 10px;
                border-radius: 4px;
                margin-bottom: 8px;
                font-size: 12px;
                border-left: 3px solid #3498db;
            `;
            
            // Quick controls container
            var quickControls = document.createElement('div');
            quickControls.id = 'ttt-quick-controls';
            quickControls.style.cssText = `
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            `;
            
            // Auto-play toggle button
            var autoPlayBtn = document.createElement('button');
            autoPlayBtn.id = 'ttt-autoplay-toggle';
            autoPlayBtn.textContent = 'Auto-Play: OFF';
            autoPlayBtn.style.cssText = `
                background: #e74c3c;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: background 0.3s;
            `;
            autoPlayBtn.onclick = function() {
                BotManager.toggleAutoPlay();
            };
            
            // Reset counters button
            var resetBtn = document.createElement('button');
            resetBtn.textContent = 'Reset';
            resetBtn.style.cssText = `
                background: #f39c12;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: background 0.3s;
            `;
            resetBtn.onclick = function() {
                BotManager.resetCounters();
                BotManager.setThinking('Counters Reset', 'All game statistics cleared');
            };
            
            // Stats display button
            var statsBtn = document.createElement('button');
            statsBtn.textContent = 'Stats';
            statsBtn.style.cssText = `
                background: #9b59b6;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: background 0.3s;
            `;
            statsBtn.onclick = function() {
                BotManager.showStats();
            };
            
            // Assemble the status bar
            quickControls.appendChild(autoPlayBtn);
            quickControls.appendChild(resetBtn);
            quickControls.appendChild(statsBtn);
            
            statusBar.appendChild(statusContent);
            statusBar.appendChild(thinkingDisplay);
            statusBar.appendChild(quickControls);
            
            document.body.appendChild(statusBar);
            
            // Add drag functionality
            this.makeDraggable(statusBar);
            
            // Initialize with default status
            this.setThinking('Extension Loaded', 'Tic Tac Toe AI Ready');
        },

        // Make an element draggable
        makeDraggable: function(element) {
            var isDragging = false;
            var currentX;
            var currentY;
            var initialX;
            var initialY;
            var xOffset = 0;
            var yOffset = 0;
            var hasBeenDragged = false;

            element.addEventListener('mousedown', function(e) {
                if (e.target === element || e.target.parentNode === element) {
                    // If this is the first drag, calculate offset from current position
                    if (!hasBeenDragged) {
                        var rect = element.getBoundingClientRect();
                        xOffset = rect.left;
                        yOffset = rect.top;
                        hasBeenDragged = true;
                        
                        // Switch to transform-based positioning
                        element.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
                        element.style.right = 'auto';
                        element.style.left = '0px';
                        element.style.top = '0px';
                    }
                    
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                    isDragging = true;
                }
            });

            document.addEventListener('mousemove', function(e) {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    xOffset = currentX;
                    yOffset = currentY;
                    
                    // Keep element within viewport bounds
                    var rect = element.getBoundingClientRect();
                    var maxX = window.innerWidth - rect.width;
                    var maxY = window.innerHeight - rect.height;
                    
                    currentX = Math.max(0, Math.min(currentX, maxX));
                    currentY = Math.max(0, Math.min(currentY, maxY));
                    
                    element.style.transform = `translate(${currentX}px, ${currentY}px)`;
                    element.style.right = 'auto';
                    element.style.left = '0px';
                    element.style.top = '0px';
                }
            });

            document.addEventListener('mouseup', function() {
                if (isDragging) {
                    isDragging = false;
                    
                    // Save the new position to chrome storage
                    var rect = element.getBoundingClientRect();
                    var position = {
                        top: rect.top,
                        right: window.innerWidth - rect.right
                    };
                    chrome.storage.sync.set({ guiPosition: position });
                }
            });
        },

        // Update the status bar with current information
        updateStatusBar: function() {
            var statusContent = document.getElementById('ttt-status-content');
            var thinkingDisplay = document.getElementById('ttt-thinking-display');
            var autoPlayBtn = document.getElementById('ttt-autoplay-toggle');
            
            if (!statusContent || !thinkingDisplay) return;
            
            // Update main status content
            var statusHTML = `
                <div style="font-weight: bold; color: #3498db;">🎯 Tic Tac Toe AI</div>
                <div style="font-size: 11px; margin-top: 2px;">
                    Bot Games: ${this.botGamesPlayed} | Human Games: ${this.humanGamesPlayed}
                </div>
            `;
            
            if (this.currentOpponent) {
                var opponentGames = this.opponentGameCounts[this.currentOpponent] || 0;
                var isBot = this.isKnownBot(this.currentOpponent);
                statusHTML += `
                    <div style="font-size: 11px; margin-top: 2px;">
                        vs ${isBot ? '🤖' : '👤'} ${this.currentOpponent}: ${opponentGames} games
                    </div>
                `;
            }
            
            statusContent.innerHTML = statusHTML;
            
            // Update thinking display
            if (this.currentThinking) {
                thinkingDisplay.innerHTML = `
                    <div style="font-weight: bold;">💭 ${this.currentThinking.status}</div>
                    ${this.currentThinking.details ? `<div style="margin-top: 2px; opacity: 0.9;">${this.currentThinking.details}</div>` : ''}
                    <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">${this.currentThinking.timestamp}</div>
                `;
            }
            
            // Update auto-play button
            if (autoPlayBtn) {
                var isAutoPlayOn = this.settings.isAutoPlayEnabled;
                autoPlayBtn.textContent = 'Auto-Play: ' + (isAutoPlayOn ? 'ON' : 'OFF');
                autoPlayBtn.style.background = isAutoPlayOn ? '#27ae60' : '#e74c3c';
            }
        },

        // Toggle auto-play functionality
        toggleAutoPlay: function() {
            this.updateAutoPlaySetting(!this.settings.isAutoPlayEnabled);
            this.setThinking(
                this.settings.isAutoPlayEnabled ? 'Auto-Play Enabled' : 'Auto-Play Disabled',
                this.settings.isAutoPlayEnabled ? 'Bot will automatically play games' : 'Manual control active'
            );
        },

        // Show statistics in a modal GUI
        showStats: function() {
            // Remove existing modal if present
            var existingModal = document.getElementById('ttt-stats-modal');
            if (existingModal) {
                existingModal.remove();
                return;
            }
            
            var totalGames = this.botGamesPlayed + this.humanGamesPlayed;
            var botPercentage = totalGames > 0 ? ((this.botGamesPlayed / totalGames) * 100).toFixed(1) : 0;
            
            // Create modal overlay
            var modalOverlay = document.createElement('div');
            modalOverlay.id = 'ttt-stats-modal';
            modalOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 20000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;
            
            // Create modal content
            var modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: linear-gradient(135deg, #2c3e50, #34495e);
                color: white;
                padding: 24px;
                border-radius: 12px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                border: 1px solid #34495e;
                position: relative;
            `;
            
            // Create close button
            var closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                position: absolute;
                top: 8px;
                right: 12px;
                background: none;
                border: none;
                color: #bdc3c7;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s;
            `;
            closeBtn.onmouseover = function() {
                this.style.background = 'rgba(231, 76, 60, 0.8)';
                this.style.color = 'white';
            };
            closeBtn.onmouseout = function() {
                this.style.background = 'none';
                this.style.color = '#bdc3c7';
            };
            closeBtn.onclick = function() {
                modalOverlay.remove();
            };
            
            // Create stats content
            var statsHTML = `
                <h2 style="margin: 0 0 20px 0; color: #3498db; font-size: 20px;">📊 Game Statistics</h2>
                <div style="line-height: 1.6; font-size: 14px;">
                    <div style="background: rgba(52, 73, 94, 0.7); padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                        <div><strong>Total Games:</strong> ${totalGames}</div>
                        <div><strong>Bot Games:</strong> ${this.botGamesPlayed} (${botPercentage}%)</div>
                        <div><strong>Human Games:</strong> ${this.humanGamesPlayed}</div>
                    </div>
                    <div style="background: rgba(52, 73, 94, 0.7); padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                        <div><strong>Known Bots:</strong> ${this.knownBots.length}</div>
                        <div><strong>Detection History:</strong> ${this.detectionHistory.length} entries</div>
                    </div>
            `;
            
            if (Object.keys(this.opponentGameCounts).length > 0) {
                statsHTML += `
                    <div style="background: rgba(52, 73, 94, 0.7); padding: 12px; border-radius: 6px;">
                        <div style="font-weight: bold; margin-bottom: 8px; color: #3498db;">Opponent Breakdown:</div>
                `;
                for (var opponent in this.opponentGameCounts) {
                    var games = this.opponentGameCounts[opponent];
                    var type = this.isKnownBot(opponent) ? '🤖' : '👤';
                    statsHTML += `<div style="margin: 4px 0;">${type} <strong>${opponent}:</strong> ${games} games</div>`;
                }
                statsHTML += '</div>';
            }
            
            statsHTML += '</div>';
            
            modalContent.innerHTML = statsHTML;
            modalContent.appendChild(closeBtn);
            modalOverlay.appendChild(modalContent);
            
            // Close modal when clicking overlay
            modalOverlay.onclick = function(e) {
                if (e.target === modalOverlay) {
                    modalOverlay.remove();
                }
            };
            
            // Add to page
            document.body.appendChild(modalOverlay);
            
            // Make modal draggable
            this.makeDraggable(modalContent);
        },

        // Profile name detection for bot identification
        performProfileNameDetection: function(displayName, callback) {
            var self = this;

            // Prevent duplicate detection for the same opponent
            if (this.lastProfileDetectionName === displayName) {
                self.log('Profile detection already performed for: ' + displayName + ', skipping duplicate');
                
                // Look up the previous detection result from history
                var previousResult = null;
                for (var i = this.detectionHistory.length - 1; i >= 0; i--) {
                    var detection = this.detectionHistory[i];
                    if (detection.opponent.toLowerCase() === displayName.toLowerCase()) {
                        previousResult = detection;
                        break;
                    }
                }
                
                if (previousResult) {
                    var isBot = previousResult.type === 'bot';
                    self.log('Using previous detection result: ' + (isBot ? 'BOT' : 'HUMAN'));
                    callback(isBot, null);
                } else {
                    self.log('No previous detection found, assuming human', 'WARN');
                    callback(false, null);
                }
                return;
            }

            this.lastProfileDetectionName = displayName;

            try {
                // Step 1: Find the opponent's clickable name in the game room
                var opponentNameElement = this.findOpponentNameElement(displayName);

                if (!opponentNameElement) {
                    self.log('Could not find opponent name element for profile detection', 'WARN');
                    callback(false, null);
                    return;
                }

                self.log('Found opponent name element, attempting profile detection for: ' + displayName);

                // Step 2: Click on the opponent's name to open profile sidebar
                opponentNameElement.click();
                self.log('Clicked opponent name to open profile sidebar');

                // Step 3: Wait for profile sidebar to load and get the profile name
                setTimeout(function() {
                    var profileName = self.getProfileNameFromSidebar();

                    if (profileName) {
                        self.log('Retrieved profile name: "' + profileName + '"');

                        // Step 4: Compare display name with profile name
                        var isBot = displayName.toLowerCase() !== profileName.toLowerCase();

                        if (isBot) {
                            self.log('BOT DETECTED: Display name "' + displayName + '" != Profile name "' + profileName + '"', 'SUCCESS');
                            // Show bot detection notification
                            self.showBotDetectionNotification(displayName, profileName);

                            // Add both display name and profile name to known bots
                            self.addKnownBot(displayName);
                            if (profileName && profileName !== displayName) {
                                self.addKnownBot(profileName);
                            }

                            // Record in detection history
                            self.detectionHistory.push({
                                opponent: displayName,
                                type: 'bot',
                                confidence: 1.0,
                                factors: ['Profile name mismatch: display="' + displayName + '", profile="' + profileName + '"'],
                                timestamp: Date.now()
                            });

                            // Keep only last 20 detections
                            if (self.detectionHistory.length > 20) {
                                self.detectionHistory.shift();
                            }
                        } else {
                            self.log('Names match - likely human player: "' + displayName + '" == "' + profileName + '"');
                            
                            // Show human detection notification
                            self.showHumanDetectionNotification(displayName, profileName);

                            // Record in detection history
                            self.detectionHistory.push({
                                opponent: displayName,
                                type: 'human',
                                confidence: 1.0,
                                factors: ['Profile name matches display name'],
                                timestamp: Date.now()
                            });

                            // Keep only last 20 detections
                            if (self.detectionHistory.length > 20) {
                                self.detectionHistory.shift();
                            }
                        }

                        // Step 5: Close the profile sidebar
                        self.closeProfileSidebar();

                        callback(isBot, profileName);
                    } else {
                        self.log('Could not retrieve profile name from sidebar', 'WARN');
                        self.closeProfileSidebar();
                        callback(false, null);
                    }
                }, 1500); // Wait 1.5 seconds for sidebar to load

            } catch (error) {
                self.log('Error in profile name detection: ' + error.message, 'ERROR');
                self.closeProfileSidebar(); // Ensure sidebar is closed on error
                callback(false, null);
            }
        },

        // Find the opponent's clickable name element in the game room
        findOpponentNameElement: function(displayName) {
            try {
                this.log('=== SEARCHING FOR OPPONENT NAME ELEMENT ===');

                // Look for the app-room-players container
                var roomPlayersContainer = document.querySelector('app-room-players');

                if (!roomPlayersContainer) {
                    this.log('app-room-players container not found', 'WARN');
                    return null;
                }

                this.log('Found app-room-players container');

                // Find all player containers within app-room-players
                var playerContainers = roomPlayersContainer.querySelectorAll('div.col-6.d-flex.align-items-center.gap-1.gap-md-2.flex-row-reverse.ng-star-inserted');

                this.log('Found ' + playerContainers.length + ' player containers with exact selector');

                // If exact selector doesn't work, try broader selectors
                if (playerContainers.length === 0) {
                    playerContainers = roomPlayersContainer.querySelectorAll('div.col-6');
                    this.log('Fallback: Found ' + playerContainers.length + ' containers with .col-6');
                }

                if (playerContainers.length === 0) {
                    playerContainers = roomPlayersContainer.querySelectorAll('div[class*="col-6"]');
                    this.log('Fallback: Found ' + playerContainers.length + ' containers with col-6 in class');
                }

                // Try to find opponent in available containers
                if (playerContainers.length >= 1) {
                    // Check each container to find the one with the opponent
                    for (var containerIndex = 0; containerIndex < playerContainers.length; containerIndex++) {
                        var container = playerContainers[containerIndex];
                        this.log('Checking container ' + containerIndex + ': ' + container.className);

                        // Look for the clickable name element with appprofileopener attribute
                        var nameElement = container.querySelector('[appprofileopener].text-truncate.cursor-pointer');

                        if (nameElement) {
                            var nameText = nameElement.textContent.trim();
                            this.log('Found name element in container ' + containerIndex + ': "' + nameText + '"');
                            this.log('Name element classes: ' + nameElement.className);

                            // Check if this matches the expected opponent name
                            if (displayName && nameText.toLowerCase() === displayName.toLowerCase()) {
                                this.log('Found matching opponent name element: "' + nameText + '"');
                                return nameElement;
                            } else if (displayName) {
                                this.log('Name element "' + nameText + '" does not match expected opponent "' + displayName + '"');
                            } else {
                                // If no displayName provided, return first found (fallback behavior)
                                this.log('No displayName provided, using first found name element');
                                return nameElement;
                            }
                        } else {
                            this.log('No appprofileopener element in container ' + containerIndex);

                            // Debug: Try alternative selectors in this container
                            var altSelectors = [
                                '[appprofileopener]',
                                '.text-truncate.cursor-pointer',
                                '.cursor-pointer',
                                '[class*="cursor-pointer"]',
                                '.text-truncate'
                            ];

                            for (var k = 0; k < altSelectors.length; k++) {
                                var altElement = container.querySelector(altSelectors[k]);
                                if (altElement) {
                                    var altText = altElement.textContent.trim();
                                    this.log('Alternative element found in container ' + containerIndex + ' with selector "' + altSelectors[k] + '": "' + altText + '"');

                                    // Check if this element matches the opponent name we're looking for
                                    if (displayName && altText.toLowerCase() === displayName.toLowerCase()) {
                                        this.log('Using alternative element as it matches opponent name: ' + displayName);
                                        return altElement;
                                    } else if (!displayName && altText.length > 3) {
                                        this.log('Using alternative element as it seems to contain a name');
                                        return altElement;
                                    } else if (displayName) {
                                        this.log('Alternative element "' + altText + '" does not match expected opponent "' + displayName + '"');
                                    }
                                }
                            }
                        }
                    }

                    this.log('No suitable name element found in any container', 'WARN');
                } else {
                    this.log('No player containers found', 'WARN');
                }

                // Final fallback: Search the entire page for clickable elements containing the opponent name
                if (displayName) {
                    this.log('Final fallback: Searching entire page for clickable elements containing: ' + displayName);

                    var allClickableElements = document.querySelectorAll('[appprofileopener], .cursor-pointer, [class*="cursor-pointer"], [onclick], button');
                    this.log('Found ' + allClickableElements.length + ' clickable elements on page');

                    for (var m = 0; m < allClickableElements.length; m++) {
                        var element = allClickableElements[m];
                        var elementText = element.textContent.trim();

                        if (elementText.toLowerCase() === displayName.toLowerCase()) {
                            this.log('Found clickable element matching opponent name: "' + elementText + '"');
                            this.log('Element tag: ' + element.tagName + ', classes: ' + element.className);
                            return element;
                        }
                    }
                }

                this.log('=== END OPPONENT NAME ELEMENT SEARCH ===');
                return null;
            } catch (error) {
                this.log('Error finding opponent name element: ' + error.message, 'ERROR');
                return null;
            }
        },

        // Get the profile name from the opened sidebar
        getProfileNameFromSidebar: function() {
            try {
                var profileNameElement = document.querySelector('body > app-root > app-navigation > app-profile-sidenav > div > header > h1');

                if (profileNameElement) {
                    var profileName = profileNameElement.textContent.trim();
                    this.log('Profile name found in sidebar: "' + profileName + '"');
                    return profileName;
                } else {
                    this.log('Profile name element not found in sidebar', 'WARN');
                    return null;
                }
            } catch (error) {
                this.log('Error getting profile name from sidebar: ' + error.message, 'ERROR');
                return null;
            }
        },

        // Close the profile sidebar
        closeProfileSidebar: function() {
            try {
                // Look for common close button selectors in sidebars
                var closeSelectors = [
                    'app-profile-sidenav .btn-close',
                    'app-profile-sidenav button[aria-label="Close"]',
                    'app-profile-sidenav .close',
                    'app-profile-sidenav [class*="close"]'
                ];

                for (var i = 0; i < closeSelectors.length; i++) {
                    var closeButton = document.querySelector(closeSelectors[i]);
                    if (closeButton) {
                        closeButton.click();
                        this.log('Closed profile sidebar using selector: ' + closeSelectors[i]);
                        return true;
                    }
                }
                
                // Try to find buttons that are NOT friend buttons
                var buttons = document.querySelectorAll('app-profile-sidenav button');
                for (var j = 0; j < buttons.length; j++) {
                    var button = buttons[j];
                    var buttonText = button.textContent.toLowerCase().trim();
                    // Skip friend-related buttons
                    if (buttonText.includes('friend') || buttonText.includes('add') || 
                        button.classList.contains('btn-secondary')) {
                        continue;
                    }
                    // Click non-friend buttons (likely close buttons)
                    button.click();
                    this.log('Closed profile sidebar using non-friend button');
                    return true;
                }

                // Alternative: Click outside the sidebar to close it
                var sidebar = document.querySelector('app-profile-sidenav');
                if (sidebar) {
                    // Click on the backdrop/overlay to close
                    var backdrop = document.querySelector('.modal-backdrop, .sidebar-backdrop, [class*="backdrop"]');
                    if (backdrop) {
                        backdrop.click();
                        this.log('Closed profile sidebar by clicking backdrop');
                        return true;
                    }

                    // Try pressing Escape key
                    var escapeEvent = new KeyboardEvent('keydown', {
                        key: 'Escape',
                        code: 'Escape',
                        keyCode: 27,
                        bubbles: true
                    });
                    document.dispatchEvent(escapeEvent);
                    this.log('Attempted to close profile sidebar with Escape key');
                    return true;
                }

                this.log('Could not find a way to close profile sidebar', 'WARN');
                return false;
            } catch (error) {
                this.log('Error closing profile sidebar: ' + error.message, 'ERROR');
                return false;
            }
        },

        // Show bot detection notification
        showBotDetectionNotification: function(displayName, profileName) {
            // Console notification (if enabled)
            if (this.settings.enableConsoleLogging) {
                console.log('%c🤖 BOT DETECTED! 🤖', 'color: red; font-size: 16px; font-weight: bold;');
                console.log('%cDisplay Name: ' + displayName, 'color: orange; font-weight: bold;');
                console.log('%cProfile Name: ' + profileName, 'color: orange; font-weight: bold;');
            }

            // Browser alert (if enabled)
            if (this.settings.enableBotDetectionAlert) {
                alert('🤖 BOT DETECTED!\n\nDisplay Name: ' + displayName + '\nProfile Name: ' + profileName + '\n\nThe opponent appears to be a bot because their display name doesn\'t match their profile name.');
            }

            // On-screen overlay notification (if enabled)
            if (this.settings.enableBotDetectionGUI) {
                this.showGUINotification('🤖 BOT DETECTED!', 'Display: ' + displayName + '\nProfile: ' + profileName, 'bot');
            }

            this.log('Bot detection notification displayed (Alert: ' + this.settings.enableBotDetectionAlert + ', GUI: ' + this.settings.enableBotDetectionGUI + ')', 'SUCCESS');
        },
        
        // Show GUI notification overlay
        showGUINotification: function(title, message, type) {
            var notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.backgroundColor = type === 'bot' ? '#e74c3c' : '#27ae60';
            notification.style.color = 'white';
            notification.style.padding = '15px 20px';
            notification.style.borderRadius = '8px';
            notification.style.zIndex = '10003';
            notification.style.fontSize = '14px';
            notification.style.fontWeight = 'bold';
            notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            notification.style.maxWidth = '300px';
            notification.style.fontFamily = 'Arial, sans-serif';
            notification.style.lineHeight = '1.4';
            
            var icon = type === 'bot' ? '🤖' : '👤';
            notification.innerHTML = icon + ' <strong>' + title + '</strong><br><small>' + message.replace('\n', '</small><br><small>') + '</small>';

            document.body.appendChild(notification);

            // Auto-remove notification after 8 seconds
            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 8000);
        },
        
        // Show human detection notification
        showHumanDetectionNotification: function(displayName, profileName) {
            // Console notification (if enabled)
            if (this.settings.enableConsoleLogging) {
                console.log('%c👤 HUMAN DETECTED! 👤', 'color: green; font-size: 16px; font-weight: bold;');
                console.log('%cDisplay Name: ' + displayName, 'color: lightgreen; font-weight: bold;');
                console.log('%cProfile Name: ' + profileName, 'color: lightgreen; font-weight: bold;');
            }

            // On-screen overlay notification (if enabled)
            if (this.settings.enableBotDetectionGUI) {
                this.showGUINotification('👤 HUMAN DETECTED!', 'Display: ' + displayName + '\nProfile: ' + profileName, 'human');
            }

            this.log('Human detection notification displayed', 'SUCCESS');
        },

        // Add a known bot to the list
        addKnownBot: function(botName) {
            if (botName) {
                var lowerBotName = botName.toLowerCase();
                if (this.knownBots.indexOf(lowerBotName) === -1) {
                    this.knownBots.push(lowerBotName);
                    this.log('Added known bot: ' + botName);
                }
            }
        },

        // Reset opponent name
        resetOpponentName: function() {
            this.currentOpponentName = null;
            this.lastProfileDetectionName = null;
            this.log('Reset opponent name');
        },

        // Save settings to storage
        saveSettings: function() {
            chrome.storage.sync.set({
                knownBots: this.knownBots,
                detectionHistory: this.detectionHistory,
                opponentGameCounts: this.opponentGameCounts,
                botGamesPlayed: this.botGamesPlayed,
                humanGamesPlayed: this.humanGamesPlayed,
                botDetectionSettings: this.settings,
                isAutoPlayEnabled: this.settings.isAutoPlayEnabled
            });
            this.log('Settings saved to storage');
        },

        // Load settings from Chrome storage
        loadSettings: function() {
            var self = this;
            chrome.storage.sync.get([
                'knownBots', 'detectionHistory', 'opponentGameCounts',
                'botGamesPlayed', 'humanGamesPlayed', 'botDetectionSettings', 'isAutoPlayEnabled'
            ], function(result) {
                self.knownBots = result.knownBots || [];
                self.detectionHistory = result.detectionHistory || [];
                self.opponentGameCounts = result.opponentGameCounts || {};
                self.botGamesPlayed = result.botGamesPlayed || 0;
                self.humanGamesPlayed = result.humanGamesPlayed || 0;
                
                // Load settings with defaults
                if (result.botDetectionSettings) {
                    self.settings = Object.assign(self.settings, result.botDetectionSettings);
                }
                
                // Sync auto play setting with global variable
                if (result.isAutoPlayEnabled !== undefined) {
                    self.settings.isAutoPlayEnabled = result.isAutoPlayEnabled;
                    isAutoPlayOn = result.isAutoPlayEnabled;
                }
                
                self.log('Settings loaded from storage');
                self.log('Current opponent games: ' + self.currentOpponentGamesPlayed);
                self.log('Total bot games: ' + self.botGamesPlayed);
                self.log('Total human games: ' + self.humanGamesPlayed);
                self.log('Auto Play enabled: ' + self.settings.isAutoPlayEnabled);
                
                // Start auto play if enabled
                if (self.settings.isAutoPlayEnabled) {
                    startAutoPlay();
                }
            });
        },
        
        // Reset game counters
        resetCounters: function() {
            this.opponentGameCounts = {};
            this.botGamesPlayed = 0;
            this.humanGamesPlayed = 0;
            this.saveSettings();
            this.log('Game counters reset (including per-opponent counts)');
        },

        // Update auto play setting
        updateAutoPlaySetting: function(enabled) {
            this.settings.isAutoPlayEnabled = enabled;
            isAutoPlayOn = enabled;
            this.saveSettings();
            
            if (enabled) {
                startAutoPlay();
                this.log('Auto Play enabled');
                this.setThinking('Auto-Play Enabled', 'Starting matchmaking...');
                // Automatically click play online button when auto play is first enabled
                setTimeout(function() {
                    clickPlayOnlineButton();
                }, 500); // Small delay to ensure the page is ready
            } else {
                stopAutoPlay();
                this.log('Auto Play disabled');
                this.setThinking('Auto-Play Disabled', 'Manual control active');
            }
        },
        
        // Check if known bot - checks both knownBots array and detection history
        isKnownBot: function(opponentName) {
            if (!opponentName) return false;
            
            var lowerName = opponentName.toLowerCase();
            
            // First check the knownBots array
            if (this.knownBots.includes(lowerName)) {
                return true;
            }
            
            // Then check the detection history for recent classifications
            for (var i = this.detectionHistory.length - 1; i >= 0; i--) {
                var detection = this.detectionHistory[i];
                if (detection.opponent.toLowerCase() === lowerName) {
                    // Return true if classified as bot, false if classified as human
                    return detection.type === 'bot';
                }
            }
            
            // If not found in either, assume unknown (not a bot)
            return false;
        },
        
        // Get opponent classification with confidence level
        getOpponentClassification: function(opponentName) {
            if (!opponentName) return { type: 'unknown', confidence: 0, source: 'none' };
            
            var lowerName = opponentName.toLowerCase();
            
            // Check knownBots array first (highest confidence)
            if (this.knownBots.includes(lowerName)) {
                return { type: 'bot', confidence: 1.0, source: 'knownBots' };
            }
            
            // Check detection history (medium to high confidence)
            for (var i = this.detectionHistory.length - 1; i >= 0; i--) {
                var detection = this.detectionHistory[i];
                if (detection.opponent.toLowerCase() === lowerName) {
                    return { 
                        type: detection.type, 
                        confidence: detection.confidence || 0.8, 
                        source: 'detectionHistory',
                        timestamp: detection.timestamp
                    };
                }
            }
            
            // Unknown opponent
            return { type: 'unknown', confidence: 0, source: 'none' };
        }
    };

    // Initialize bot manager
    BotManager.loadSettings();
    
    // Leaderboard Functions
    function checkLeaderboardPosition() {
        if (!leaderboardSettings.enableLeaderboardCheck || !leaderboardSettings.username) {
            return;
        }
        
        try {
            // Find leaderboard container
            const leaderboardContainer = document.querySelector('.leaderboard-container, .leaderboard, [class*="leaderboard"], [id*="leaderboard"], [app-tournament-leaderboard-player]');
            if (!leaderboardContainer) {
                console.log('Leaderboard container not found');
                return;
            }
            
            // Find player rows in leaderboard - updated selectors based on actual HTML structure
            const playerRows = leaderboardContainer.querySelectorAll('tr[app-tournament-leaderboard-player], .player-row, .leaderboard-row, [class*="player"], [class*="row"]');
            if (playerRows.length === 0) {
                console.log('No player rows found in leaderboard');
                return;
            }
            
            // Search for user's position
            for (let i = 0; i < playerRows.length; i++) {
                const row = playerRows[i];
                const nameElement = row.querySelector('.player-name, .name, [class*="name"], span[title]');
                
                if (nameElement && nameElement.textContent.trim() === leaderboardSettings.username) {
                    const positionElement = row.querySelector('.position, .rank, [class*="position"], [class*="rank"], td:first-child');
                    const scoreElement = row.querySelector('.score, .points, [class*="score"], [class*="points"], td:last-child');
                    
                    const position = positionElement ? parseInt(positionElement.textContent) : i + 1;
                    const score = scoreElement ? parseInt(scoreElement.textContent.replace(/[^0-9]/g, '')) : 0;
                    
                    console.log(`Current leaderboard position: ${position}, Score: ${score}`);
                    
                    // Check if we should stop auto-play
                    if (score >= leaderboardSettings.leaderboardStopPosition) {
                        console.log(`Target score reached! Stopping auto-play at score: ${score}`);
                        stopAutoPlay();
                        showLeaderboardStopNotification(position, score);
                        return true;
                    }
                    
                    return false;
                }
            }
            
            console.log('Username not found in leaderboard');
        } catch (error) {
            console.error('Error checking leaderboard position:', error);
        }
        
        return false;
    }
    
    function showLeaderboardStopNotification(position, score) {
        // Remove any existing notification
        const existingNotification = document.getElementById('leaderboard-stop-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.id = 'leaderboard-stop-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
                max-width: 300px;
                border: 2px solid #2E7D32;
            ">
                <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">
                    🎯 Target Reached!
                </div>
                <div style="margin-bottom: 5px;">
                    Position: #${position}
                </div>
                <div style="margin-bottom: 10px;">
                    Score: ${score.toLocaleString()}
                </div>
                <div style="font-size: 12px; opacity: 0.9;">
                    Auto-play has been stopped.
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove notification after 10 seconds
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
    
    function autoDetectUsername() {
        try {
            // Try multiple selectors to find username
            const usernameSelectors = [
                '.username',
                '.player-name',
                '.user-name',
                '[class*="username"]',
                '[class*="player-name"]',
                '[class*="user-name"]',
                '.profile-name',
                '[data-username]',
                '.account-name'
            ];
            
            for (const selector of usernameSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const detectedUsername = element.textContent.trim();
                    leaderboardSettings.username = detectedUsername;
                    console.log('Username auto-detected:', detectedUsername);
                    return detectedUsername;
                }
            }
            
            // Try to get from URL or other sources
            const urlMatch = window.location.href.match(/user[=/]([^&/?]+)/i);
            if (urlMatch && urlMatch[1]) {
                const detectedUsername = decodeURIComponent(urlMatch[1]);
                leaderboardSettings.username = detectedUsername;
                console.log('Username detected from URL:', detectedUsername);
                return detectedUsername;
            }
            
            console.log('Could not auto-detect username');
            return null;
        } catch (error) {
            console.error('Error auto-detecting username:', error);
            return null;
        }
    }
    
    function testLeaderboard() {
        console.log('Testing leaderboard functionality...');
        console.log('Current settings:', leaderboardSettings);
        
        if (!leaderboardSettings.enableLeaderboardCheck) {
            console.log('Leaderboard check is disabled');
            return;
        }
        
        if (!leaderboardSettings.username) {
            console.log('No username set for leaderboard check');
            return;
        }
        
        checkLeaderboardPosition();
    }
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.botDetectionSettings) {
            // Update bot detection settings
            BotManager.settings = Object.assign(BotManager.settings, request.botDetectionSettings);
            BotManager.saveSettings();
            BotManager.log('Bot detection settings updated from popup');
            sendResponse({success: true});
        }
        
        if (request.leaderboardSettings) {
            // Update leaderboard settings
            leaderboardSettings = Object.assign(leaderboardSettings, request.leaderboardSettings);
            console.log('Leaderboard settings updated from popup:', leaderboardSettings);
            sendResponse({success: true});
        }
        
        if (request.action === 'resetCounters') {
            // Reset game counters
            BotManager.resetCounters();
            sendResponse({success: true});
        }
        
        if (request.action === 'toggleAutoPlay') {
            // Toggle auto play setting
            BotManager.updateAutoPlaySetting(request.enabled);
            sendResponse({success: true});
        }
        
        if (request.action === 'toggleFirstMoveStrategy') {
            // Toggle first move strategy setting
            isFirstMoveStrategyEnabled = request.enabled;
            console.log('First Move Strategy toggled:', isFirstMoveStrategyEnabled);
            sendResponse({success: true});
        }
        
        if (request.action === 'autoDetectUsername') {
            // Auto-detect username
            const detectedUsername = autoDetectUsername();
            sendResponse({success: true, username: detectedUsername});
        }
        
        if (request.action === 'testLeaderboard') {
            // Test leaderboard functionality
            testLeaderboard();
            sendResponse({success: true});
        }
        
        return true; // Keep message channel open for async response
     });

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
            //console.log("Waiting for AI's turn...");
        }
    });

    return player;
}


    // Special first-move strategy: start middle, then diagonal to opponent's corner
    function getFirstMoveStrategyMove(board, player) {
        if (!isFirstMoveStrategyEnabled) return null;
        
        // Count total moves on board
        var totalMoves = 0;
        var opponentMoves = [];

        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                if (board[i][j] !== '_') {
                    totalMoves++;
                    if (board[i][j] !== player) {
                        opponentMoves.push({row: i, col: j});
                    }
                }
            }
        }

        // First move: if board is empty, play center
        if (totalMoves === 0) {
            console.log('First move strategy: Playing center (1,1)');
            return { row: 1, col: 1 };
        }

        // Second move: if we played center and opponent played a corner, play diagonal corner
        if (totalMoves === 2 && board[1][1] === player && opponentMoves.length === 1) {
            var opponentMove = opponentMoves[0];

            // Check if opponent played a corner
            var corners = [
                {row: 0, col: 0}, {row: 0, col: 2},
                {row: 2, col: 0}, {row: 2, col: 2}
            ];

            var opponentCorner = null;
            for (var k = 0; k < corners.length; k++) {
                if (corners[k].row === opponentMove.row && corners[k].col === opponentMove.col) {
                    opponentCorner = corners[k];
                    break;
                }
            }

            if (opponentCorner) {
                // Play the diagonal opposite corner
                var diagonalCorner = getDiagonalCorner(opponentCorner);
                if (diagonalCorner && board[diagonalCorner.row][diagonalCorner.col] === '_') {
                    console.log('First move strategy: Playing diagonal corner (' + diagonalCorner.row + ',' + diagonalCorner.col + ') opposite to opponent corner (' + opponentCorner.row + ',' + opponentCorner.col + ')');
                    return diagonalCorner;
                }
            }
        }

        // Strategy doesn't apply, return null to use normal minimax
        return null;
    }

    // Get the diagonal opposite corner
    function getDiagonalCorner(corner) {
        if (corner.row === 0 && corner.col === 0) return { row: 2, col: 2 }; // top-left -> bottom-right
        if (corner.row === 0 && corner.col === 2) return { row: 2, col: 0 }; // top-right -> bottom-left
        if (corner.row === 2 && corner.col === 0) return { row: 0, col: 2 }; // bottom-left -> top-right
        if (corner.row === 2 && corner.col === 2) return { row: 0, col: 0 }; // bottom-right -> top-left
        return null;
    }

    function findBestMove(board, player) {
        //console.log("Current player: " + player); // Debug statement to show the value of the player variable

        // Check if special first-move strategy is enabled
        if (isFirstMoveStrategyEnabled) {
            var specialMove = getFirstMoveStrategyMove(board, player);
            if (specialMove) {
                console.log("Using first-move strategy: " + specialMove.row + "," + specialMove.col);
                return specialMove;
            }
        }

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

        //console.log("The value of the best Move is: " + bestVal);
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
    //setInterval(logBoardState, 5000);
    

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


    // Game state tracking
    var gameState = {
        isGameActive: false,
        gameEndDetected: false,
        opponentDetected: false,
        aiDetectedGameEnd: false,
        lastBoardState: null
    };

    function initAITurn() {
        //displayBoardAndPlayer();
        var boardState = getBoardState();
        
        // Check if this is a new game (board reset or first move)
        if (!gameState.isGameActive || isBoardReset(boardState)) {
            handleNewGame();
        }
        
        // Check if game has ended (but don't trigger handleGameEnd yet - wait for UI)
        if (isGameEnded(boardState)) {
            BotManager.log('AI detected game end, waiting for UI to show rematch buttons...');
            // Set a flag but don't call handleGameEndDetection yet
            gameState.aiDetectedGameEnd = true;
            return; // Don't make moves if game ended
        }
        
        // Make AI move
        var bestMove = findBestMove(boardState, player);
        updateBoard(bestMove.row.toString() + bestMove.col.toString());
        
        // Update game state
        gameState.lastBoardState = boardState;
    }
    
    // Check if board has been reset (new game started)
    function isBoardReset(currentBoard) {
        if (!gameState.lastBoardState) return true;
        
        var currentEmpty = 0;
        var lastEmpty = 0;
        
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                if (currentBoard[i][j] === '_') currentEmpty++;
                if (gameState.lastBoardState[i][j] === '_') lastEmpty++;
            }
        }
        
        // If current board has more empty cells than last, it's likely a reset
        return currentEmpty > lastEmpty;
    }
    
    // Check if game has ended (win, lose, or draw)
    function isGameEnded(boardState) {
        var score = evaluateBoard(boardState);
        var movesLeft = areMovesLeft(boardState);
        
        // Game ended if someone won or no moves left
        return score !== 0 || !movesLeft;
    }
    
    // Handle new game detection and bot detection
    function handleNewGame() {
        BotManager.log('=== NEW GAME DETECTED ===');
        gameState.isGameActive = true;
        gameState.gameEndDetected = false;
        gameState.opponentDetected = false;
        gameState.aiDetectedGameEnd = false;
        
        // Only run bot detection and opponent tracking when auto-play is enabled
        if (isAutoPlayOn) {
            BotManager.setThinking('New Game Started', 'Detecting opponent...');
            
            // Reset current opponent (but keep games counter until we know if it's the same opponent)
            var previousOpponent = BotManager.currentOpponent;
            BotManager.currentOpponent = null;
            
            // Detect opponent after a short delay to let UI load
            setTimeout(function() {
                detectCurrentOpponent(previousOpponent);
            }, 2000);
        } else {
            BotManager.setThinking('Manual Mode', 'Auto-play disabled - no bot detection');
        }
    }
    
    // Handle game end detection
    function handleGameEndDetection() {
        if (!gameState.gameEndDetected) {
            BotManager.log('=== GAME END DETECTED ===');
            BotManager.setThinking('Game Ended', 'Deciding next action...');
            gameState.gameEndDetected = true;
            gameState.isGameActive = false;
            
            // Wait a moment for UI to update, then handle game end
            setTimeout(function() {
                handleGameEnd();
            }, 2000);
        }
    }
    
    // Detect current opponent and perform bot detection
    function detectCurrentOpponent(previousOpponent) {
        BotManager.log('Detecting current opponent...');
        
        // Get username from storage
        chrome.storage.sync.get('username', function(result) {
            var username = result.username;
            if (!username) {
                BotManager.log('Username not found in storage', 'WARN');
                return;
            }
            
            // Find all player name elements
            var profileOpeners = document.querySelectorAll('.text-truncate.cursor-pointer');
            var opponentName = null;
            
            profileOpeners.forEach(function(opener) {
                var name = opener.textContent.trim();
                if (name !== username) {
                    opponentName = name;
                }
            });
            
            if (opponentName) {
                BotManager.log('Found opponent: ' + opponentName);
                BotManager.setThinking('Opponent Found', 'Analyzing: ' + opponentName);
                
                // Check if this is a different opponent
                if (previousOpponent && previousOpponent !== opponentName) {
                    BotManager.log('New opponent detected (was: ' + previousOpponent + ', now: ' + opponentName + ')');
                } else if (!previousOpponent) {
                    BotManager.log('First opponent of session: ' + opponentName);
                } else {
                    BotManager.log('Same opponent as before: ' + opponentName);
                }
                
                // Log current game count with this opponent
                var currentCount = BotManager.opponentGameCounts[opponentName] || 0;
                BotManager.log('Games played with ' + opponentName + ': ' + currentCount);
                
                BotManager.currentOpponent = opponentName;
                
                // Perform bot detection
                BotManager.setThinking('Analyzing Opponent', 'Checking profile for bot detection...');
                BotManager.performProfileNameDetection(opponentName, function(isBot, profileName) {
                    gameState.opponentDetected = true;
                    
                    if (isBot) {
                        BotManager.log('Opponent "' + opponentName + '" detected as BOT');
                        BotManager.setThinking('Bot Detected', '🤖 ' + opponentName + ' is a bot');
                        BotManager.displayBotDetectionNotification(opponentName, true, 'Profile name mismatch');
                    } else {
                        BotManager.log('Opponent "' + opponentName + '" detected as HUMAN');
                        BotManager.setThinking('Human Detected', '👤 ' + opponentName + ' is human');
                        BotManager.displayBotDetectionNotification(opponentName, false, 'Profile name matches');
                    }
                });
            } else {
                BotManager.log('Could not find opponent name', 'WARN');
                BotManager.setThinking('Waiting for Opponent', 'Unable to detect opponent name');
            }
        });
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

// Function to check if the script is enabled and not disabled by payment/version issues
function checkIfScriptEnabled() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['isScriptEnabled', 'scriptDisabled'], function(result) {
            const isEnabled = result.isScriptEnabled || false;
            const isDisabled = result.scriptDisabled || false;
            // Script is only truly enabled if it's turned on AND not disabled by payment/version
            resolve(isEnabled && !isDisabled);
        });
    });
}



/**
 * Function to check if the game room is unavailable.
 * If the game room is unavailable, redirects to Tic Tac Toe.
 * If the button text is "Leave room", clicks the button.
 */
function WebsiteErrorHandler() {
   // console.log("Checking for button click...");
    const button = document.querySelector('button.btn-outline-dark.ng-star-inserted');
  //  console.log("button", button);

    // Check if "Game room unavailable" message is displayed
    const gameRoomUnavailable = document.querySelector('.container.d-flex.justify-content-center.align-items-center.flex-column');
    const errorText = gameRoomUnavailable?.querySelector('h1.h3')?.textContent;
  //  console.log("gameRoomUnavailable", gameRoomUnavailable);

    if (errorText === "Game room unavailable") {
        // Click the tic-tac-toe link
        const ticTacToeLink = document.querySelector('a[href="/en/tic-tac-toe"]');
        if (ticTacToeLink) {
            console.log("Game room unavailable. Redirecting to Tic Tac Toe...");
            ticTacToeLink.click();
            return;
        }
    }

    // Only auto-click leave room if bot detection hasn't decided to play again
    if (button && button.textContent.includes("Leave room") && isAutoPlayOn) {
        // Check if we're in a bot game and decided to play again
        if (gameState.isGameActive && BotManager.currentOpponent && BotManager.isKnownBot(BotManager.currentOpponent)) {
            console.log("Bot game in progress - WebsiteErrorHandler will not interfere with leave button");
            return;
        }
        
        console.log("Button text is 'Leave room', waiting 10 second before clicking...");
        setTimeout(() => {
            if (button.textContent.includes("Leave room")) {
                console.log("Button text still says 'Leave room', clicking the button...");
                button.click();
            } else {
                console.log("Button text changed, not clicking...");
            }
        }, 10000);
    }
}

// Run the function every second
setInterval(WebsiteErrorHandler, 1000);


  
  
  
  //   && !button.textContent.includes('Play vs robot')        -- removed for now due to debugging purposes
  

// Function to start checking the script's enabled state at regular intervals
async function startInterval() {


    setInterval(async function() {
        const isEnabled = await checkIfScriptEnabled();

        // Only run the functionality if the state has changed to enabled AND auto-play is on
        if (isEnabled && isAutoPlayOn) {
           // console.log("Script enabled and auto-play on. Starting functionality...");
            initAITurn(); // Call the function when enabled and auto-play is on
        } else if (!isEnabled) {
       //     console.log("Script disabled. Stopping functionality...");
            // Optionally handle stopping the functionality if needed
        } else if (!isAutoPlayOn) {
       //     console.log("Auto-play disabled. Stopping AI functionality...");
            // AI functionality stopped when auto-play is off
        }


    }, 1000); // Check every second
}

// Call the function to start the interval
startInterval();



    document.addEventListener('DOMContentLoaded', function() {
        initGame();
    });
})();