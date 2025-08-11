// ==UserScript==
// @name         Tic Tac Toe AI for papergames
// @namespace    https://github.com/longkidkoolstar
// @version      1.0.0
// @description  AI plays Tic-Tac-Toe for you on papergames.io with advanced bot detection and leaderboard position checking. Have fun and destroy some nerds 😃!!
// @author       longkidkoolstar
// @icon         https://th.bing.com/th/id/R.3502d1ca849b062acb85cf68a8c48bcd?rik=LxTvt1UpLC2y2g&pid=ImgRaw&r=0
// @match        https://papergames.io/*
// @license      none
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// ==/UserScript==

(function() {
    'use strict';

    // ===== REMOTE VERSION CHECKING SYSTEM =====
    const LOCAL_SCRIPT_VERSION = "1.0.0"; // Change this to test version mismatch: "1.2.3" for matching version
    const API_BASE = "https://api.jsonstorage.net/v1/json/";
    const API_PATH = "d206ce58-9543-48db-a5e4-997cfc745ef3/7e7adc93-d373-4050-b5c1-c8b7115fbdb3";
    const API_KEY = "796c9bbf-df23-4228-afef-c3357694c29b";
    const VERSION_CHECK_API_URL = `${API_BASE}${API_PATH}?apiKey=${API_KEY}`;
    const VERSION_CHECK_INTERVAL = 1800000; // 30 minutes in milliseconds
    const RETRY_DELAY = 1000; // 1 second retry delay
    const UPDATE_ALERT_INTERVAL = 1000; // 1 second between update alerts

    let scriptDisabled = false;
    let updateAlertActive = false;

    // Version checking system
    async function performVersionCheck() {
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
                return;
            }

            // Check version mismatch
            if (data.scriptVersion !== LOCAL_SCRIPT_VERSION) {
                console.log(`[Version Check] Version mismatch: Local=${LOCAL_SCRIPT_VERSION}, Remote=${data.scriptVersion}`);
                startUpdateAlerts(data.scriptUpdateLink);
                return;
            }

            console.log('[Version Check] Version check passed - script is up to date');

            // Update last check timestamp
            try {
                localStorage.setItem('lastVersionCheck', Date.now().toString());
            } catch (e) {
                console.log('[Version Check] localStorage unavailable, will check on every run');
            }

            // Schedule next check
            setTimeout(performVersionCheck, VERSION_CHECK_INTERVAL);

        } catch (error) {
            console.log('[Version Check] Error during version check:', error.message);
            // Retry after delay
            setTimeout(performVersionCheck, RETRY_DELAY);
        }
    }

    function startUpdateAlerts(updateLink) {
        if (updateAlertActive) return;
        updateAlertActive = true;

        function showUpdateAlert() {
            if (scriptDisabled) return;

            // Only show alerts when document has focus
            if (document.hasFocus()) {
                alert("UPDATE THIS SCRIPT IN ORDER TO PROCEED!");

                // Open update link in new tab
                if (updateLink) {
                    window.open(updateLink, '_blank');
                }
            }

            // Continue showing alerts every 1000ms
            setTimeout(showUpdateAlert, UPDATE_ALERT_INTERVAL);
        }

        showUpdateAlert();
    }

    function shouldPerformVersionCheck() {
        try {
            const lastCheck = localStorage.getItem('lastVersionCheck');
            if (!lastCheck) return true;

            const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
            return timeSinceLastCheck >= VERSION_CHECK_INTERVAL;
        } catch (e) {
            // localStorage unavailable, check on every run
            return true;
        }
    }

    // Initialize version checking
    function initializeVersionCheck() {
        if (shouldPerformVersionCheck()) {
            performVersionCheck();
        } else {
            // Schedule next check based on when the last check was performed
            try {
                const lastCheck = parseInt(localStorage.getItem('lastVersionCheck'));
                const timeUntilNextCheck = VERSION_CHECK_INTERVAL - (Date.now() - lastCheck);
                if (timeUntilNextCheck > 0) {
                    setTimeout(performVersionCheck, timeUntilNextCheck);
                } else {
                    performVersionCheck();
                }
            } catch (e) {
                performVersionCheck();
            }
        }
    }

    // Start version checking immediately
    console.log('[Version Check] Initializing remote version checking system...');
    console.log('[Version Check] Local version:', LOCAL_SCRIPT_VERSION);
    console.log('[Version Check] API URL:', VERSION_CHECK_API_URL);
    initializeVersionCheck();

    // Function to check if script is disabled
    function isScriptDisabled() {
        return scriptDisabled;
    }
    // ===== END VERSION CHECKING SYSTEM =====

    /*
     * ENHANCED BOT DETECTION SYSTEM
     * =============================
     * This userscript now includes advanced bot detection that works by comparing
     * the opponent's displayed name in the match to their actual profile name.
     *
     * Detection Process:
     * 1. Locates opponent's name in <app-room-players> container
     * 2. Clicks on the opponent's name (with appprofileopener attribute) to open profile sidebar
     * 3. Retrieves the actual profile name from the sidebar header
     * 4. Compares display name vs profile name - if different, classifies as bot
     * 5. Shows "Bot detected" notification in console, alert, and on-screen overlay
     * 6. Automatically closes profile sidebar to avoid disrupting gameplay
     *
     * This detection runs automatically when matches start and integrates with
     * the existing bot management system for optimal gameplay strategy.
     */

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
            // Check if script is disabled due to payment/version issues
            if (isScriptDisabled()) {
                clearInterval(intervalId);
                return;
            }

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

    // Game State Detection System
    var lastGameState = null;

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
    function isInGame() {
        try {
            // First check if we're in matchmaking - this is a special state
            if (isInMatchmaking()) {
                // We're in matchmaking, not in a game yet, but also not in menu
                if (lastGameState !== 'matchmaking') {
                    BotManager.log('Entered matchmaking state');
                    lastGameState = 'matchmaking';
                }
                return false; // Not in game yet, but don't trigger menu detection
            }

            // Check if we're actually in a tic-tac-toe game
            var gameBoard = document.querySelector('.grid.s-3x3');

            // Check for buttons that indicate we're NOT in a game
            var playOnlineButton = document.querySelector("button.btn-secondary.flex-grow-1") ||
                                  document.querySelector("body > app-root > app-navigation > div.d-flex.h-100 > div.d-flex.flex-column.h-100.w-100 > main > app-game-landing > div > div > div > div.col-12.col-lg-9.dashboard > div.card.area-buttons.d-flex.justify-content-center.align-items-center.flex-column > button.btn.btn-secondary.btn-lg.position-relative") ||
                                  document.querySelector("button.btn.btn-secondary.btn-lg.position-relative");

            // Check for post-game buttons (play again/leave) - these indicate game ended but still in room
            var rematchButtons = document.querySelectorAll("body > app-root > app-navigation > div > div.d-flex.flex-column.h-100.w-100 > main > app-room > div > div > div.col-md-9.col-lg-8.bg-gray-000.h-100.position-relative.overflow-hidden.ng-tns-c1645232060-14 > div > div > div > app-re-match > div > button");
            var leaveRoomButton = document.querySelector("button.btn-light.ng-tns-c189-7");
            var playAgainButton = document.querySelector('button.btn.btn-secondary.mt-2.ng-star-inserted');

            // If rematch buttons exist, we're in post-game state (not actively playing)
            var inPostGame = rematchButtons && rematchButtons.length > 0;

            // If any of these buttons are visible, we're not in an active game
            if (playOnlineButton || leaveRoomButton || playAgainButton || inPostGame) {
                if (lastGameState === true) {
                    BotManager.log('Left game area - detected menu buttons');
                    lastGameState = false;
                }
                return false;
            }

            // For tic-tac-toe, we mainly need the game board
            // The tic-tac-toe-board element might not always be present, so let's be more flexible
            var inGame = !!gameBoard; // Convert to boolean

            // Additional check: if we have rematch buttons visible, we're between games (not actively playing)
            if (inGame && (playAgainButton || inPostGame)) {
                // We're in the game room but between games (post-game state)
                if (lastGameState === true) {
                    BotManager.log('Game ended - in post-game state with rematch buttons');
                    lastGameState = 'post-game';
                }
                return false; // Not actively in game
            }

            if (inGame && lastGameState !== true) {
                BotManager.log('Entered game area - game board detected');
                lastGameState = true;
            } else if (!inGame && lastGameState === true) {
                BotManager.log('Left game area - game board not found');
                lastGameState = false;
            }

            return inGame;
        } catch (error) {
            BotManager.log('Error in isInGame(): ' + error.message, 'ERROR');
            return false;
        }
    }

    function getBoardState() {
        try {
            var boardState = [];
            var gridItems = document.querySelectorAll('.grid.s-3x3 .grid-item');

            // Check if we have the game board
            if (!gridItems || gridItems.length !== 9) {
                // Try alternative selector
                gridItems = document.querySelectorAll('.grid .grid-item');
                if (!gridItems || gridItems.length !== 9) {
                    return null;
                }
            }

            for (var i = 0; i < 3; i++) {
                var row = [];
                for (var j = 0; j < 3; j++) {
                    var cell = gridItems[i * 3 + j];
                    if (!cell) {
                        return null; // Safety check
                    }

                    var svg = cell.querySelector('svg');
                    if (svg) {
                        var label = svg.getAttribute('aria-label');
                        if (label && label.toLowerCase().includes('x')) {
                            row.push('x');
                        } else if (label && (label.toLowerCase().includes('o') || label.toLowerCase().includes('circle'))) {
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
        } catch (error) {
            BotManager.log('Error in getBoardState(): ' + error.message, 'ERROR');
            return null;
        }
    }

    function simulateCellClick(row, col) {
        var gridItems = document.querySelectorAll('.grid.s-3x3 .grid-item');
        var cell = gridItems[row * 3 + col];
        if (cell) {
            var event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                //view: window
            });
            cell.dispatchEvent(event);
        }
    }

    var prevChronometerValue = null;

    // Enhanced Bot Management System
    var BotManager = {
        // Core state variables
        isAutoPlayEnabled: false,
        currentOpponentType: 'unknown', // 'bot', 'human', 'unknown'
        currentGameCount: 0,
        totalLosses: 0,
        sessionStartTime: Date.now(),
        lastMoveTime: null,
        moveTimes: [],
        detectionHistory: [],
        gameResults: [],

        // Detection settings
        detectionSensitivity: 'balanced', // 'conservative', 'balanced', 'aggressive'
        botResponseTimeThreshold: 3000, // ms
        humanResponseTimeThreshold: 8000, // ms

        // Game strategy settings
        gamesPerBot: 7,
        gamesPerHuman: 1,
        maxLosses: 5,

        // Safety and notification settings
        enable24HourSafety: true,
        enableBotDetectionAlert: true,
        enableBotDetectionGUI: true,

        // AI Strategy settings
        enableFirstMoveStrategy: false, // When bot goes first: start middle, then diagonal to opponent's corner

        // Leaderboard position checking settings
        enableLeaderboardCheck: false, // Enable/disable leaderboard position checking
        leaderboardStopPosition: 16000, // Stop auto-play when reaching this position or better

        // Profile detection tracking
        lastProfileDetectionName: null,

        // Initialize the bot manager
        init: function() {
            this.loadSettings();
            this.startHealthMonitoring();
            this.log('BotManager initialized');
        },

        // Load settings from GM storage
        loadSettings: function() {
            var self = this;
            Promise.all([
                GM.getValue('autoPlayEnabled', false),
                GM.getValue('totalLosses', 0),
                GM.getValue('currentGameCount', 0),
                GM.getValue('opponentType', 'unknown'),
                GM.getValue('sessionStartTime', Date.now()),
                GM.getValue('detectionSensitivity', 'balanced'),
                GM.getValue('gamesPerBot', 7),
                GM.getValue('gamesPerHuman', 1),
                GM.getValue('maxLosses', 5),
                GM.getValue('enable24HourSafety', true),
                GM.getValue('enableBotDetectionAlert', true),
                GM.getValue('enableBotDetectionGUI', true),
                GM.getValue('enableFirstMoveStrategy', false),
                GM.getValue('enableLeaderboardCheck', false),
                GM.getValue('leaderboardStopPosition', 16000),
                GM.getValue('username', GM.getValue('myUsername', '')),
                GM.getValue('knownBotNames', JSON.stringify([
                    'Katha', 'Staci', 'Claudetta', 'Charline', 'Carolyne',
                    'Valerye', 'Rowena', 'Arabel', 'Zea', 'Paper Man'
                ]))
            ]).then(function(values) {
                self.isAutoPlayEnabled = values[0];
                self.totalLosses = values[1];
                self.currentGameCount = values[2];
                self.currentOpponentType = values[3];
                self.sessionStartTime = values[4];
                self.detectionSensitivity = values[5];
                self.gamesPerBot = values[6];
                self.gamesPerHuman = values[7];
                self.maxLosses = values[8];
                self.enable24HourSafety = values[9];
                self.enableBotDetectionAlert = values[10];
                self.enableBotDetectionGUI = values[11];
                self.enableFirstMoveStrategy = values[12];
                self.enableLeaderboardCheck = values[13];
                self.leaderboardStopPosition = values[14];
                self.myUsername = values[15];
                self.log('Username loaded from GM storage: "' + self.myUsername + '"');

                // Load known bot names from storage
                try {
                    self.knownBotNames = JSON.parse(values[16]);
                    self.log('Loaded ' + self.knownBotNames.length + ' known bot names from storage');
                } catch (e) {
                    self.log('Error loading known bot names, using defaults: ' + e.message, 'WARN');
                    self.knownBotNames = [
                        'Katha', 'Staci', 'Claudetta', 'Charline', 'Carolyne',
                        'Valerye', 'Rowena', 'Arabel', 'Zea', 'Paper Man'
                    ];
                }

                self.log('Settings loaded. My username: "' + self.myUsername + '"');

                // Try to auto-detect username if it's not set
                if (!self.myUsername) {
                    // First attempt after 2 seconds
                    setTimeout(function() {
                        if (!self.updateUsernameFromDetection()) {
                            // If first attempt fails, try again after 5 seconds
                            setTimeout(function() {
                                self.updateUsernameFromDetection();
                            }, 5000);
                        }
                    }, 2000);
                }

                // Update settings UI after loading
                self.updateSettingsUI();
            });
        },

        // Save settings to GM storage
        saveSettings: function() {
            GM.setValue('autoPlayEnabled', this.isAutoPlayEnabled);
            GM.setValue('totalLosses', this.totalLosses);
            GM.setValue('currentGameCount', this.currentGameCount);
            GM.setValue('opponentType', this.currentOpponentType);
            GM.setValue('sessionStartTime', this.sessionStartTime);
            GM.setValue('detectionSensitivity', this.detectionSensitivity);
            GM.setValue('gamesPerBot', this.gamesPerBot);
            GM.setValue('gamesPerHuman', this.gamesPerHuman);
            GM.setValue('maxLosses', this.maxLosses);
            GM.setValue('enable24HourSafety', this.enable24HourSafety);
            GM.setValue('enableBotDetectionAlert', this.enableBotDetectionAlert);
            GM.setValue('enableBotDetectionGUI', this.enableBotDetectionGUI);
            GM.setValue('enableFirstMoveStrategy', this.enableFirstMoveStrategy);
            GM.setValue('enableLeaderboardCheck', this.enableLeaderboardCheck);
            GM.setValue('leaderboardStopPosition', this.leaderboardStopPosition);
            GM.setValue('myUsername', this.myUsername);
            GM.setValue('username', this.myUsername); // Save to both keys for compatibility
            GM.setValue('knownBotNames', JSON.stringify(this.knownBotNames));
        },

        // Known bot names - loaded from GM storage in loadSettings()
        knownBotNames: [],

        // Detect if opponent is bot or human
        detectOpponentType: function(opponentName, responseTime) {
            var confidence = 0;
            var factors = [];

            // Check against known bot names first (highest priority)
            for (var i = 0; i < this.knownBotNames.length; i++) {
                if (this.knownBotNames[i].toLowerCase() === opponentName.toLowerCase()) {
                    confidence = 1.0; // 100% confidence
                    factors.push('Known bot name: ' + opponentName);
                    this.log('Opponent "' + opponentName + '" matched known bot list', 'SUCCESS');
                    break;
                }
            }

            // Note: Profile name detection is now handled separately in the main detection loop
            // to avoid async issues in this synchronous function

            // If not a known bot, continue with other detection methods
            if (confidence < 1.0) {
                // Response time analysis (if available)
                if (responseTime !== null && responseTime !== undefined) {
                    if (responseTime < this.botResponseTimeThreshold) {
                        confidence += 0.3;
                        factors.push('Fast response time: ' + responseTime + 'ms');
                    } else if (responseTime > this.humanResponseTimeThreshold) {
                        confidence -= 0.3;
                        factors.push('Slow response time: ' + responseTime + 'ms');
                    }
                }

                // Username pattern analysis
                var botPatterns = [
                    /^bot/i, /bot$/i, /^ai/i, /ai$/i,
                    /^\d+$/, /^user\d+$/i, /^player\d+$/i,
                    /^guest/i, /^anon/i, /^temp/i
                ];

                for (var i = 0; i < botPatterns.length; i++) {
                    if (botPatterns[i].test(opponentName)) {
                        confidence += 0.4;
                        factors.push('Bot-like username pattern');
                        break;
                    }
                }
            }

            // Move timing consistency (if we have enough data)
            if (this.moveTimes.length >= 3) {
                var avgTime = this.moveTimes.reduce(function(a, b) { return a + b; }) / this.moveTimes.length;
                var variance = this.moveTimes.reduce(function(sum, time) {
                    return sum + Math.pow(time - avgTime, 2);
                }, 0) / this.moveTimes.length;

                if (variance < 1000000) { // Low variance suggests bot
                    confidence += 0.2;
                    factors.push('Consistent timing pattern');
                }
            }

            // Adjust confidence based on sensitivity setting
            var threshold = 0.5;
            if (this.detectionSensitivity === 'conservative') threshold = 0.7;
            else if (this.detectionSensitivity === 'aggressive') threshold = 0.3;

            var detectedType = confidence >= threshold ? 'bot' : 'human';

            // Store detection result
            this.detectionHistory.push({
                opponent: opponentName,
                type: detectedType,
                confidence: confidence,
                factors: factors,
                timestamp: Date.now()
            });

            // Keep only last 20 detections
            if (this.detectionHistory.length > 20) {
                this.detectionHistory.shift();
            }

            this.log('Opponent detection: ' + opponentName + ' -> ' + detectedType + ' (confidence: ' + confidence.toFixed(2) + ')');
            return detectedType;
        },

        // Record move timing
        recordMoveTime: function() {
            var currentTime = Date.now();
            if (this.lastMoveTime) {
                var responseTime = currentTime - this.lastMoveTime;
                this.moveTimes.push(responseTime);

                // Keep only last 10 move times
                if (this.moveTimes.length > 10) {
                    this.moveTimes.shift();
                }

                return responseTime;
            }
            this.lastMoveTime = currentTime;
            return null;
        },

        // Enhanced logging system
        logHistory: [],
        maxLogEntries: 500,

        log: function(message, level) {
            level = level || 'INFO';
            var timestamp = new Date();
            var logEntry = {
                timestamp: timestamp,
                level: level,
                message: message,
                timeString: timestamp.toLocaleTimeString()
            };

            // Add to history
            this.logHistory.push(logEntry);
            if (this.logHistory.length > this.maxLogEntries) {
                this.logHistory.shift();
            }

            // Console output with color coding
            var color = level === 'ERROR' ? 'color: red' :
                       level === 'WARN' ? 'color: orange' :
                       level === 'SUCCESS' ? 'color: green' : 'color: blue';

            console.log('%c[BotManager] ' + logEntry.timeString + ' [' + level + ']: ' + message, color);

            // Update log display if it exists
            this.updateLogDisplay();
        },

        updateLogDisplay: function() {
            var logDisplay = document.getElementById('bot-log-display');
            if (logDisplay) {
                var recentLogs = this.logHistory.slice(-20).reverse();
                var html = recentLogs.map(function(entry) {
                    var colorClass = entry.level === 'ERROR' ? 'color: #e74c3c' :
                                   entry.level === 'WARN' ? 'color: #f39c12' :
                                   entry.level === 'SUCCESS' ? 'color: #2ecc71' : 'color: #3498db';
                    return '<div style="' + colorClass + '; margin-bottom: 2px;">' +
                           entry.timeString + ' [' + entry.level + ']: ' + entry.message + '</div>';
                }).join('');
                logDisplay.innerHTML = html;
            }
        },

        exportLogs: function() {
            var logData = {
                sessionStart: new Date(this.sessionStartTime).toISOString(),
                sessionEnd: new Date().toISOString(),
                totalRuntime: this.getRuntime(),
                settings: {
                    detectionSensitivity: this.detectionSensitivity,
                    gamesPerBot: this.gamesPerBot,
                    gamesPerHuman: this.gamesPerHuman,
                    maxLosses: this.maxLosses
                },
                stats: {
                    totalGames: this.gameResults.length,
                    totalLosses: this.totalLosses,
                    detectionAccuracy: this.getDetectionAccuracy(),
                    winRate: this.getWinRate()
                },
                logs: this.logHistory,
                detectionHistory: this.detectionHistory,
                gameResults: this.gameResults
            };

            var blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'tic-tac-toe-bot-logs-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.log('Logs exported successfully', 'SUCCESS');
        },

        getWinRate: function() {
            if (this.gameResults.length === 0) return 0;
            var wins = this.gameResults.filter(function(r) { return r.result === 'win'; }).length;
            return Math.round((wins / this.gameResults.length) * 100);
        },

        // Bot thinking state management
        currentThinking: 'Initializing...',
        nextAction: 'Waiting for game',
        currentOpponentName: 'Unknown',

        setThinking: function(thinking, nextAction) {
            this.currentThinking = thinking;
            this.nextAction = nextAction || 'Analyzing...';
            this.updateThinkingDisplay();
        },

        updateThinkingDisplay: function() {
            var thinkingDisplay = document.getElementById('bot-thinking-display');
            if (thinkingDisplay) {
                thinkingDisplay.innerHTML =
                    '<div style="color: #3498db; font-weight: bold;">🤖 ' + this.currentThinking + '</div>' +
                    '<div style="color: #2ecc71; font-size: 11px; margin-top: 3px;">➤ ' + this.nextAction + '</div>';
            }
        },

        // Your username for filtering (loaded from GM storage)
        myUsername: '', // Default fallback

        // Detect current opponent name
        detectOpponentName: function() {
            try {
                // Don't change opponent name too frequently - only update if we don't have one or if we're in a new game
                if (this.currentOpponentName !== 'Unknown' && this.currentOpponentName !== 'Not detected' &&
                    GameManager && GameManager.gameInProgress) {
                    return this.currentOpponentName; // Keep current name during active game
                }

                // Common selectors for opponent name in game UI
                var nameSelectors = [
                    '.player-name',
                    '.opponent-name',
                    '[class*="opponent"]',
                    '[class*="player"]',
                    '.game-info .player-name',
                    '.player-info .name',
                    '.vs .player',
                    '.players .player',
                    // Generic selectors for names
                    '.name',
                    '[data-player="opponent"]',
                    '[data-player="2"]'
                ];

                var potentialNames = [];

                for (var i = 0; i < nameSelectors.length; i++) {
                    var elements = document.querySelectorAll(nameSelectors[i]);
                    for (var j = 0; j < elements.length; j++) {
                        var element = elements[j];
                        var text = element.textContent.trim();

                        // Skip empty text, your own name, or common UI text
                        if (text && text.length > 0 && text.length < 50 &&
                            text.toLowerCase() !== this.myUsername.toLowerCase() && // Skip your own name
                            !text.toLowerCase().includes(this.myUsername.toLowerCase()) && // Skip text containing your username
                            !text.includes('vs') && !text.includes('VS') &&
                            !text.includes('Player') && !text.includes('Opponent') &&
                            !text.includes('You') && !text.includes('Current') &&
                            !text.includes('Score') && !text.includes('Time') &&
                            !text.includes('Tic') && !text.includes('Tac') &&
                            !text.match(/^\d+$/) && // Skip pure numbers
                            !text.match(/\d{2,}/) && // Skip text with long numbers (timestamps/scores)
                            !text.includes(':') && // Skip time/score formats
                            !text.includes('Game') && !text.includes('Round') &&
                            text.match(/^[a-zA-Z0-9\s_-]+$/) && // Only allow reasonable username characters
                            text.length >= 3 && text.length <= 20) { // Reasonable username length

                            // Try to extract clean name from potentially messy text
                            var cleanName = this.extractCleanName(text);
                            if (cleanName && potentialNames.indexOf(cleanName) === -1) {
                                potentialNames.push(cleanName);
                                this.log('Found potential opponent name: "' + cleanName + '" (extracted from: "' + text + '") via selector: ' + nameSelectors[i]);
                            }
                        }
                    }
                }

                // If we found potential names, pick the most likely one
                if (potentialNames.length > 0) {
                    // Prefer known bot names
                    for (var k = 0; k < potentialNames.length; k++) {
                        var name = potentialNames[k];
                        for (var l = 0; l < this.knownBotNames.length; l++) {
                            if (this.knownBotNames[l].toLowerCase() === name.toLowerCase()) {
                                this.currentOpponentName = name;
                                this.log('Opponent name confirmed (known bot): "' + name + '"', 'SUCCESS');
                                return name;
                            }
                        }
                    }

                    // If no known bot, take the first reasonable name
                    var selectedName = potentialNames[0];
                    if (selectedName !== this.currentOpponentName) {
                        this.currentOpponentName = selectedName;
                        this.log('Opponent name set to: "' + selectedName + '"', 'INFO');
                    }
                    return selectedName;
                }

                return this.currentOpponentName;
            } catch (error) {
                this.log('Error detecting opponent name: ' + error.message, 'WARN');
                return 'Unknown';
            }
        },

        // Extract clean opponent name from messy text
        extractCleanName: function(text) {
            // Check against known bot names first - they might be embedded in the text
            for (var i = 0; i < this.knownBotNames.length; i++) {
                var botName = this.knownBotNames[i];
                if (text.toLowerCase().includes(botName.toLowerCase())) {
                    return botName; // Return the clean bot name
                }
            }

            // Try to extract a reasonable username from the text
            // Remove your username if it appears
            var cleanText = text.replace(new RegExp(this.myUsername, 'gi'), '');

            // Remove common patterns: numbers with colons (scores/times), long numbers
            cleanText = cleanText.replace(/\d{2,}:\d+/g, ''); // Remove score patterns like "01:53"
            cleanText = cleanText.replace(/\d{3,}/g, ''); // Remove long numbers
            cleanText = cleanText.replace(/[:\d]{3,}/g, ''); // Remove colon-number patterns

            // Split by common separators and find the longest reasonable part
            var parts = cleanText.split(/[\s:,\-_]+/);
            var bestPart = '';

            for (var j = 0; j < parts.length; j++) {
                var part = parts[j].trim();
                if (part.length >= 3 && part.length <= 20 &&
                    part.match(/^[a-zA-Z][a-zA-Z0-9\s]*$/) && // Starts with letter
                    !part.match(/^\d+$/) && // Not just numbers
                    part.toLowerCase() !== this.myUsername.toLowerCase()) {
                    if (part.length > bestPart.length) {
                        bestPart = part;
                    }
                }
            }

            return bestPart.length >= 3 ? bestPart : null;
        },

        // Reset opponent name when starting new matchmaking
        resetOpponentName: function() {
            this.currentOpponentName = 'Unknown';
            this.lastProfileDetectionName = null; // Reset profile detection tracking
            this.log('Opponent name reset for new matchmaking');
        },

        // Add a new bot name to the known list
        addKnownBot: function(botName) {
            if (!botName || botName.trim().length === 0) {
                this.log('Cannot add empty bot name', 'WARN');
                return false;
            }

            var cleanName = botName.trim();
            if (!this.knownBotNames.includes(cleanName)) {
                this.knownBotNames.push(cleanName);
                this.log('Added new bot to known list: "' + cleanName + '" (Total: ' + this.knownBotNames.length + ')', 'SUCCESS');

                // Save to GM storage for persistence
                var self = this;
                GM.setValue('knownBotNames', JSON.stringify(this.knownBotNames)).then(function() {
                    self.log('Bot names saved to GM storage successfully', 'SUCCESS');
                }).catch(function(error) {
                    self.log('Error saving bot names to GM storage: ' + error, 'ERROR');
                });

                // Update the display if the function exists
                if (this.updateKnownBotsDisplay) {
                    this.updateKnownBotsDisplay();
                }

                return true;
            } else {
                this.log('Bot already in known list: "' + cleanName + '"', 'INFO');
            }
            return false;
        },

        // Note: Known bot names are now loaded in loadSettings() function

        // Health monitoring and 24-hour operation
        startHealthMonitoring: function() {
            var self = this;
            setInterval(function() {
                self.performHealthCheck();
            }, 300000); // Every 5 minutes

            // Memory cleanup every 30 minutes
            setInterval(function() {
                self.performMemoryCleanup();
            }, 1800000);

            // Error recovery check every minute
            setInterval(function() {
                self.performErrorRecovery();
            }, 60000);
        },

        performHealthCheck: function() {
            var runtime = Date.now() - this.sessionStartTime;
            var hours = runtime / 3600000;

            this.log('Health check - Runtime: ' + this.getRuntime() +
                    ', Games: ' + this.gameResults.length +
                    ', Losses: ' + this.totalLosses +
                    ', Detection accuracy: ' + this.getDetectionAccuracy() + '%');

            // Auto-disable after 24 hours for safety (if enabled)
            if (this.enable24HourSafety && hours >= 24 && this.isAutoPlayEnabled) {
                this.log('24-hour limit reached. Auto-disabling for safety.');
                this.isAutoPlayEnabled = false;
                this.saveSettings();
                this.show24HourNotification();
            }

            // Check for stuck states
            if (this.gameResults.length === 0 && hours > 0.5) {
                this.log('Warning: No games played in 30 minutes. Possible stuck state.');
            }
        },

        performMemoryCleanup: function() {
            // Keep only recent data to prevent memory leaks
            if (this.detectionHistory.length > 50) {
                this.detectionHistory = this.detectionHistory.slice(-30);
            }

            if (this.gameResults.length > 100) {
                this.gameResults = this.gameResults.slice(-50);
            }

            if (this.moveTimes.length > 20) {
                this.moveTimes = this.moveTimes.slice(-10);
            }

            this.log('Memory cleanup performed');
        },

        performErrorRecovery: function() {
            // Check for common error states and attempt recovery
            if (this.isAutoPlayEnabled && this.currentOpponentType === 'unknown') {
                var timeSinceLastDetection = Date.now() - (this.detectionHistory.length > 0 ?
                    this.detectionHistory[this.detectionHistory.length - 1].timestamp : this.sessionStartTime);

                // If no detection for 10 minutes, reset
                if (timeSinceLastDetection > 600000) {
                    this.log('No opponent detection for 10 minutes. Attempting recovery.');
                    this.currentGameCount = 0;
                    this.saveSettings();
                }
            }
        },

        getDetectionAccuracy: function() {
            if (this.detectionHistory.length < 2) return 100;

            var accurate = this.detectionHistory.filter(function(detection) {
                return detection.confidence > 0.6;
            }).length;

            return Math.round((accurate / this.detectionHistory.length) * 100);
        },

        show24HourNotification: function() {
            var notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = '#f39c12';
            notification.style.color = 'white';
            notification.style.padding = '20px';
            notification.style.borderRadius = '10px';
            notification.style.zIndex = '10001';
            notification.style.textAlign = 'center';
            notification.style.fontSize = '16px';
            notification.style.fontWeight = 'bold';
            notification.innerHTML = '24-HOUR LIMIT REACHED!<br>Auto-play disabled for safety.<br>Re-enable in settings if needed.';

            document.body.appendChild(notification);

            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 15000);
        },

        getRuntime: function() {
            var runtime = Date.now() - this.sessionStartTime;
            var hours = Math.floor(runtime / 3600000);
            var minutes = Math.floor((runtime % 3600000) / 60000);
            return hours + 'h ' + minutes + 'm';
        },

        // Check current leaderboard position
        checkLeaderboardPosition: function() {
            if (!this.enableLeaderboardCheck) {
                this.log('Leaderboard check disabled, skipping position check');
                return { shouldStop: false, position: null, score: null };
            }

            if (!this.myUsername) {
                this.log('Username not set. Please set your username in the settings or wait for auto-detection.', 'WARN');
                return { shouldStop: false, position: null, score: null };
            }

            try {
                this.log('Checking leaderboard position...');

                // Look for leaderboard container
                var leaderboardContainer = document.querySelector('.leaderboard-container');
                if (!leaderboardContainer) {
                    this.log('Leaderboard container not found - may not be on leaderboard page', 'WARN');
                    return { shouldStop: false, position: null, score: null };
                }

                // Find all player rows in the leaderboard
                var playerRows = leaderboardContainer.querySelectorAll('tr[app-tournament-leaderboard-player]');
                if (!playerRows || playerRows.length === 0) {
                    this.log('No player rows found in leaderboard', 'WARN');
                    return { shouldStop: false, position: null, score: null };
                }

                // Look for our own name in the leaderboard
                var myUsername = this.myUsername;
                this.log('Looking for username "' + this.myUsername + '" in leaderboard');

                for (var i = 0; i < playerRows.length; i++) {
                    var row = playerRows[i];
                    var nameElement = row.querySelector('.player-name');

                    if (nameElement) {
                        var playerName = nameElement.textContent.trim();
                        this.log('Checking leaderboard player: "' + playerName + '"');

                        // Check if this is our row
                        if (playerName.toLowerCase() === myUsername.toLowerCase()) {
                            // Get position from the first cell
                            var positionElement = row.querySelector('td:first-child');
                            if (positionElement) {
                                var positionText = positionElement.textContent.trim();
                                var position = parseInt(positionText.replace(/[^\d]/g, ''));

                                this.log('Found our leaderboard position: ' + position);

                                // Get the score from the last cell (points column)
                                var scoreElement = row.querySelector('td:last-child');
                                var score = 0;
                                
                                if (scoreElement) {
                                    var scoreText = scoreElement.textContent.trim();
                                    score = parseInt(scoreText.replace(/[^\d]/g, ''));
                                    this.log('Found our leaderboard score: ' + score);
                                }
                                
                                // Check if we should stop (score is better than or equal to stop position)
                                var shouldStop = score >= this.leaderboardStopPosition;

                                if (shouldStop) {
                                    this.log('Leaderboard position ' + position + ' reached target score ' + this.leaderboardStopPosition + ' with score ' + score + '. Stopping auto-play.', 'SUCCESS');
                                }

                                return { shouldStop: shouldStop, position: position, score: score };
                            }
                        }
                    }
                }

                this.log('Our username "' + this.myUsername + '" not found in visible leaderboard');
                return { shouldStop: false, position: null, score: null };

            } catch (error) {
                this.log('Error checking leaderboard position: ' + error.message, 'ERROR');
                return { shouldStop: false, position: null, score: null };
            }
        },

        // Show leaderboard position reached notification
        showLeaderboardStopNotification: function(position, score) {
            var notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = '#2ecc71';
            notification.style.color = 'white';
            notification.style.padding = '20px';
            notification.style.borderRadius = '10px';
            notification.style.zIndex = '10001';
            notification.style.textAlign = 'center';
            notification.style.fontSize = '16px';
            notification.style.fontWeight = 'bold';
            notification.innerHTML = 'LEADERBOARD TARGET REACHED!<br>Position: ' + position + '<br>Score: ' + score + '<br>Auto-play has been stopped.<br>Re-enable in settings if needed.';

            document.body.appendChild(notification);

            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 15000);
        },

        // Try to automatically detect the current user's username
        detectMyUsername: function() {
            try {
                // Try to find username in various places on the page
                var selectors = [
                    // Profile sidebar header
                    'body > app-root > app-navigation > app-profile-sidenav > div > header > h1',
                    // Navigation username
                    '.navbar .username',
                    '.user-name',
                    '.profile-name',
                    // Game room player names (look for the one that's not the opponent)
                    'app-room-players .player-name'
                ];

                for (var i = 0; i < selectors.length; i++) {
                    var elements = document.querySelectorAll(selectors[i]);
                    for (var j = 0; j < elements.length; j++) {
                        var element = elements[j];
                        var username = element.textContent.trim();

                        if (username && username.length > 0 && username.length < 30 &&
                            !username.toLowerCase().includes('guest') &&
                            !username.toLowerCase().includes('unknown') &&
                            username !== this.currentOpponentName) {

                            this.log('Auto-detected username: "' + username + '" from selector: ' + selectors[i]);
                            return username;
                        }
                    }
                }

                this.log('Could not auto-detect username', 'WARN');
                return null;
            } catch (error) {
                this.log('Error auto-detecting username: ' + error.message, 'ERROR');
                return null;
            }
        },

        // Update username with auto-detection
        updateUsernameFromDetection: function() {
            var detectedUsername = this.detectMyUsername();
            if (detectedUsername && detectedUsername !== this.myUsername) {
                this.log('Updating username from "' + this.myUsername + '" to "' + detectedUsername + '"');
                this.myUsername = detectedUsername;
                this.saveSettings();

                // Update UI if it exists
                var usernameInput = document.querySelector('#username-input');
                if (usernameInput) {
                    usernameInput.value = this.myUsername;
                }

                return true;
            }
            return false;
        },

        // Profile name detection for bot identification
        performProfileNameDetection: function(displayName, callback) {
            var self = this;

            // Prevent duplicate detection for the same opponent
            if (this.lastProfileDetectionName === displayName) {
                self.log('Profile detection already performed for: ' + displayName + ', skipping duplicate');
                callback(false, null);
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

                    // Debug: Check what containers are available
                    var allContainers = document.querySelectorAll('[class*="room"], [class*="player"]');
                    this.log('Available containers with room/player in class: ' + allContainers.length);
                    for (var i = 0; i < Math.min(allContainers.length, 5); i++) {
                        this.log('Container ' + i + ': ' + allContainers[i].className);
                    }
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

                // Debug: Log all containers found
                for (var j = 0; j < playerContainers.length; j++) {
                    var container = playerContainers[j];
                    this.log('Player container ' + j + ': ' + container.className);
                    this.log('Container ' + j + ' content: "' + container.textContent.trim().substring(0, 50) + '"');
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

                            // Check if this is likely the opponent (not our own name)
                            // We'll return the first clickable name we find for now
                            return nameElement;
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

                                    // Check if this element contains the opponent name we're looking for
                                    // We can use the displayName parameter to verify
                                    if (displayName && altText.includes(displayName)) {
                                        this.log('Using alternative element as it contains opponent name: ' + displayName);
                                        return altElement;
                                    } else if (!displayName && altText.length > 3) {
                                        this.log('Using alternative element as it seems to contain a name');
                                        return altElement;
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

                        if (elementText.includes(displayName)) {
                            this.log('Found clickable element containing opponent name: "' + elementText + '"');
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
                    'app-profile-sidenav [class*="close"]',
                    'app-profile-sidenav button'
                ];

                for (var i = 0; i < closeSelectors.length; i++) {
                    var closeButton = document.querySelector(closeSelectors[i]);
                    if (closeButton) {
                        closeButton.click();
                        this.log('Closed profile sidebar using selector: ' + closeSelectors[i]);
                        return true;
                    }
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
            // Console notification (always shown)
            console.log('%c🤖 BOT DETECTED! 🤖', 'color: red; font-size: 16px; font-weight: bold;');
            console.log('%cDisplay Name: ' + displayName, 'color: orange; font-weight: bold;');
            console.log('%cProfile Name: ' + profileName, 'color: orange; font-weight: bold;');

            // Browser alert (if enabled)
            if (this.enableBotDetectionAlert) {
                alert('🤖 BOT DETECTED!\n\nDisplay Name: ' + displayName + '\nProfile Name: ' + profileName + '\n\nThe opponent appears to be a bot because their display name doesn\'t match their profile name.');
            }

            // On-screen overlay notification (if enabled)
            if (this.enableBotDetectionGUI) {
                var notification = document.createElement('div');
                notification.style.position = 'fixed';
                notification.style.top = '20px';
                notification.style.right = '20px';
                notification.style.backgroundColor = '#e74c3c';
                notification.style.color = 'white';
                notification.style.padding = '15px 20px';
                notification.style.borderRadius = '8px';
                notification.style.zIndex = '10003';
                notification.style.fontSize = '14px';
                notification.style.fontWeight = 'bold';
                notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                notification.style.maxWidth = '300px';
                notification.innerHTML =
                    '🤖 <strong>BOT DETECTED!</strong><br>' +
                    '<small>Display: ' + displayName + '</small><br>' +
                    '<small>Profile: ' + profileName + '</small>';

                document.body.appendChild(notification);

                // Auto-remove notification after 8 seconds
                setTimeout(function() {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 8000);
            }

            this.log('Bot detection notification displayed (Alert: ' + this.enableBotDetectionAlert + ', GUI: ' + this.enableBotDetectionGUI + ')', 'SUCCESS');
        },

        // Update settings UI elements to reflect current values
        updateSettingsUI: function() {
            // Update alert toggle if it exists
            var alertToggle = document.querySelector('#bot-alert-toggle');
            if (alertToggle) {
                alertToggle.textContent = this.enableBotDetectionAlert ? 'Alert ON' : 'Alert OFF';
                alertToggle.style.backgroundColor = this.enableBotDetectionAlert ? '#2ecc71' : '#e74c3c';
            }

            // Update GUI toggle if it exists
            var guiToggle = document.querySelector('#bot-gui-toggle');
            if (guiToggle) {
                guiToggle.textContent = this.enableBotDetectionGUI ? 'GUI ON' : 'GUI OFF';
                guiToggle.style.backgroundColor = this.enableBotDetectionGUI ? '#2ecc71' : '#e74c3c';
            }

            // Update safety toggle if it exists
            var safetyToggle = document.querySelector('#safety-toggle');
            if (safetyToggle) {
                safetyToggle.textContent = this.enable24HourSafety ? 'Safety ON' : 'Safety OFF';
                safetyToggle.style.backgroundColor = this.enable24HourSafety ? '#2ecc71' : '#f39c12';
            }

            // Update first move strategy toggle if it exists
            var firstMoveToggle = document.querySelector('#first-move-strategy-toggle');
            if (firstMoveToggle) {
                firstMoveToggle.textContent = this.enableFirstMoveStrategy ? 'Strategy ON' : 'Strategy OFF';
                firstMoveToggle.style.backgroundColor = this.enableFirstMoveStrategy ? '#2ecc71' : '#e74c3c';
            }

            // Update leaderboard check toggle if it exists
            var leaderboardToggle = document.querySelector('#leaderboard-check-toggle');
            if (leaderboardToggle) {
                leaderboardToggle.textContent = this.enableLeaderboardCheck ? 'Check ON' : 'Check OFF';
                leaderboardToggle.style.backgroundColor = this.enableLeaderboardCheck ? '#2ecc71' : '#e74c3c';
            }

            // Update leaderboard position input if it exists
            var leaderboardInput = document.querySelector('#leaderboard-position-input');
            if (leaderboardInput) {
                leaderboardInput.value = this.leaderboardStopPosition;
            }

            // Update username input if it exists
            var usernameInput = document.querySelector('#username-input');
            if (usernameInput) {
                usernameInput.value = this.myUsername;
            }

            // Update known bots display if function exists
            if (this.updateKnownBotsDisplay) {
                this.updateKnownBotsDisplay();
            }

            this.log('Settings UI updated to reflect stored values');
        },

        // Debug function to check GM storage
        debugStorage: function() {
            var self = this;
            GM.getValue('knownBotNames', '[]').then(function(storedBots) {
                self.log('=== GM STORAGE DEBUG ===');
                self.log('Stored bot names: ' + storedBots);
                try {
                    var parsed = JSON.parse(storedBots);
                    self.log('Parsed bot names: ' + JSON.stringify(parsed));
                    self.log('Number of stored bots: ' + parsed.length);
                } catch (e) {
                    self.log('Error parsing stored bot names: ' + e.message, 'ERROR');
                }
                self.log('Current knownBotNames array: ' + JSON.stringify(self.knownBotNames));
                self.log('=== END STORAGE DEBUG ===');
            });
        }
    };

    // Safety and Reliability System
    var SafetyManager = {
        errorCount: 0,
        maxErrors: 10,
        lastErrorTime: 0,
        safeMode: false,

        // Global error handler
        init: function() {
            var self = this;

            // Catch unhandled errors
            window.addEventListener('error', function(event) {
                self.handleError('JavaScript Error: ' + event.message, event.error);
            });

            // Catch unhandled promise rejections
            window.addEventListener('unhandledrejection', function(event) {
                self.handleError('Promise Rejection: ' + event.reason, event.reason);
            });

            BotManager.log('SafetyManager initialized', 'INFO');
        },

        handleError: function(message) {
            this.errorCount++;
            this.lastErrorTime = Date.now();

            BotManager.log('Error #' + this.errorCount + ': ' + message, 'ERROR');

            if (this.errorCount >= this.maxErrors) {
                this.enableSafeMode();
            }

            // Auto-recovery attempt
            setTimeout(function() {
                SafetyManager.attemptRecovery();
            }, 5000);
        },

        enableSafeMode: function() {
            this.safeMode = true;
            BotManager.isAutoPlayEnabled = false;
            BotManager.saveSettings();

            BotManager.log('SAFE MODE ENABLED - Too many errors detected', 'ERROR');

            this.showSafeModeNotification();
        },

        showSafeModeNotification: function() {
            var notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = '#c0392b';
            notification.style.color = 'white';
            notification.style.padding = '20px';
            notification.style.borderRadius = '10px';
            notification.style.zIndex = '10002';
            notification.style.textAlign = 'center';
            notification.style.fontSize = '16px';
            notification.style.fontWeight = 'bold';
            notification.innerHTML = '⚠️ SAFE MODE ACTIVATED ⚠️<br>Multiple errors detected.<br>Auto-play disabled for safety.<br>Check console for details.';

            document.body.appendChild(notification);

            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 20000);
        },

        attemptRecovery: function() {
            if (this.safeMode) return;

            try {
                // Reset game state
                BotManager.currentOpponentType = 'unknown';
                BotManager.currentGameCount = 0;
                GameManager.gameInProgress = false;
                GameEndDetector.reset();

                BotManager.log('Recovery attempt completed', 'INFO');
            } catch (e) {
                BotManager.log('Recovery attempt failed: ' + e.message, 'ERROR');
            }
        },

        resetErrorCount: function() {
            this.errorCount = 0;
            this.safeMode = false;
            BotManager.log('Error count reset - Safe mode disabled', 'SUCCESS');
        }
    };

    // Initialize Safety Manager
    SafetyManager.init();

    // Game Management System (Global scope)
    var GameManager = {
        gameInProgress: false,
        gameStartTime: null,
        gameEndTime: null,

        // Start a new game
        startGame: function() {
            this.gameInProgress = true;
            this.gameStartTime = Date.now();
            BotManager.recordMoveTime(); // Reset move timing
            BotManager.log('Game started');
            BotManager.setThinking('Game in progress', 'Analyzing board and planning moves');

            // Note: Bot detection is handled in the main opponent detection loop
        },

        // End current game
        endGame: function(result) {
            if (!this.gameInProgress) return;

            this.gameInProgress = false;
            this.gameEndTime = Date.now();
            var gameDuration = this.gameEndTime - this.gameStartTime;

            // Record game result
            BotManager.gameResults.push({
                result: result,
                duration: gameDuration,
                opponent: BotManager.currentOpponentType,
                timestamp: this.gameEndTime
            });

            // Update loss counter
            if (result === 'loss') {
                BotManager.totalLosses++;
                BotManager.saveSettings();
            }

            BotManager.log('Game ended: ' + result + ' (duration: ' + (gameDuration/1000).toFixed(1) + 's)');

            // Check if we should continue or stop
            this.handleGameEnd();
        },

        // Handle post-game logic
        handleGameEnd: function() {
            // Check loss limit
            if (BotManager.totalLosses >= BotManager.maxLosses) {
                BotManager.log('Loss limit reached (' + BotManager.maxLosses + '). Stopping auto-play.');
                BotManager.isAutoPlayEnabled = false;
                BotManager.saveSettings();
                this.showLossLimitNotification();
                return;
            }

            if (!BotManager.isAutoPlayEnabled) return;

            // Determine next action based on opponent type and game count
            var maxGames = BotManager.currentOpponentType === 'bot' ? BotManager.gamesPerBot : BotManager.gamesPerHuman;
            BotManager.currentGameCount++;

            BotManager.log('Game ' + BotManager.currentGameCount + '/' + maxGames + ' vs ' + BotManager.currentOpponentType);

            if (BotManager.currentGameCount >= maxGames) {
                // Cycle complete - leave and find new opponent
                BotManager.log('Cycle complete. Leaving to find new opponent.');
                BotManager.setThinking('Cycle complete (' + maxGames + ' games)', 'Waiting for leave button');
                BotManager.currentGameCount = 0;
                BotManager.currentOpponentType = 'unknown';
                BotManager.saveSettings();

                // Wait for rematch buttons to appear, then click leave
                waitForRematchButtons(function() {
                    BotManager.setThinking('Leaving current room', 'Clicking leave button');
                    BotManager.resetOpponentName(); // Reset opponent name when leaving
                    clickLeaveRoomButton();
                    setTimeout(function() {
                        BotManager.setThinking('Finding new opponent', 'Clicking play online button');
                        clickPlayOnlineButton();
                    }, 1000);
                }, false);
            } else if (BotManager.currentOpponentType === 'bot') {
                // Continue with bot - click play again
                BotManager.log('Continuing with bot. Clicking play again.');
                BotManager.setThinking('Continuing vs bot (' + BotManager.currentGameCount + '/' + maxGames + ')', 'Waiting for rematch buttons');

                // Wait for rematch buttons to appear, then click play again
                waitForRematchButtons(function() {
                    if (!clickPlayAgainButton()) {
                        // Fallback: leave and find new opponent
                        BotManager.log('Play again button not found. Leaving to find new opponent.');
                        BotManager.setThinking('Play again failed', 'Leaving to find new opponent');
                        BotManager.resetOpponentName(); // Reset opponent name when leaving
                        clickLeaveRoomButton();
                        setTimeout(function() {
                            BotManager.setThinking('Finding new opponent', 'Clicking play online button');
                            clickPlayOnlineButton();
                        }, 1000);
                    } else {
                        BotManager.setThinking('Play again clicked', 'Waiting for new game to start');
                        // Start monitoring for the new game to begin
                        setTimeout(function() {
                            checkForNewGameStart();
                        }, 1000);
                    }
                }, true);
            } else {
                // Human opponent - leave after 1 game
                BotManager.log('Human opponent detected. Leaving after 1 game.');
                BotManager.setThinking('Human opponent - 1 game complete', 'Waiting for leave button');
                BotManager.currentGameCount = 0;
                BotManager.currentOpponentType = 'unknown';
                BotManager.saveSettings();

                // Wait for rematch buttons to appear, then click leave
                waitForRematchButtons(function() {
                    BotManager.setThinking('Leaving after human game', 'Clicking leave button');
                    BotManager.resetOpponentName(); // Reset opponent name when leaving
                    clickLeaveRoomButton();
                    setTimeout(function() {
                        BotManager.setThinking('Finding new opponent', 'Clicking play online button');
                        clickPlayOnlineButton();
                    }, 1000);
                }, false);
            }
        },

        // Show loss limit notification
        showLossLimitNotification: function() {
            var notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = '#dc3545';
            notification.style.color = 'white';
            notification.style.padding = '20px';
            notification.style.borderRadius = '10px';
            notification.style.zIndex = '10000';
            notification.style.textAlign = 'center';
            notification.style.fontSize = '16px';
            notification.style.fontWeight = 'bold';
            notification.innerHTML = 'LOSS LIMIT REACHED!<br>Auto-play has been disabled.<br>Reset in settings to continue.';

            document.body.appendChild(notification);

            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 10000);
        }
    };

    // Button Click Functions (Global scope)
    function clickLeaveRoomButton() {
        BotManager.log('Searching for leave room button...');

        // Check for app-juicy-button components first
        var juicyButtons = document.querySelectorAll('app-juicy-button');
        BotManager.log('Found ' + juicyButtons.length + ' app-juicy-button components for leave detection');

        for (var i = 0; i < juicyButtons.length; i++) {
            var juicyButton = juicyButtons[i];
            var buttonText = juicyButton.textContent.toLowerCase().trim();
            BotManager.log('Leave check - App-juicy-button ' + i + ' text: "' + buttonText + '"');

            // Since both buttons might say "Play again!", we need to distinguish them
            // The leave button is typically the second one or has different positioning
            if (buttonText.includes('leave') || buttonText.includes('exit') || buttonText.includes('quit') ||
                buttonText.includes('back') || buttonText.includes('menu') || buttonText.includes('close')) {
                var innerButton = juicyButton.querySelector('button');
                if (innerButton) {
                    innerButton.click();
                    BotManager.log('Clicked leave room app-juicy-button: "' + buttonText + '"');
                    return true;
                }
            }
        }

        // If both buttons say "Play again!", try to distinguish by position
        // Typically the leave button is the second button or in a different container
        if (juicyButtons.length >= 2) {
            BotManager.log('Multiple juicy buttons found, trying to identify leave button by position');

            // Try the second button (often the leave button)
            var secondButton = juicyButtons[1];
            var secondButtonText = secondButton.textContent.toLowerCase().trim();

            // If it contains "play again", it might still be the leave button in disguise
            if (secondButtonText.includes('play') || secondButtonText.includes('again')) {
                var innerButton = secondButton.querySelector('button');
                if (innerButton) {
                    BotManager.log('Clicking second juicy button as potential leave button: "' + secondButtonText + '"');
                    innerButton.click();
                    return true;
                }
            }
        }

        // Legacy selectors for backwards compatibility
        var legacySelectors = [
            "button.btn-light.ng-tns-c189-7",
            "app-re-match button",
            "button[class*='btn-light']",
            "button[class*='leave']",
            "button[class*='exit']"
        ];

        for (var j = 0; j < legacySelectors.length; j++) {
            var buttons = document.querySelectorAll(legacySelectors[j]);
            for (var k = 0; k < buttons.length; k++) {
                var button = buttons[k];
                var buttonText = button.textContent.toLowerCase();
                if (buttonText.includes('leave') || buttonText.includes('exit') || buttonText.includes('quit') ||
                    buttonText.includes('back') || buttonText.includes('menu')) {
                    button.click();
                    BotManager.log('Clicked leave room button using legacy selector: ' + legacySelectors[j]);
                    return true;
                }
            }
        }

        // Final fallback - search all buttons for leave-related text
        var allButtons = document.querySelectorAll('button');
        for (var l = 0; l < allButtons.length; l++) {
            var button = allButtons[l];
            var text = button.textContent.toLowerCase();
            if (text.includes('leave') || text.includes('exit') || text.includes('quit') ||
                text.includes('back') || text.includes('menu')) {
                button.click();
                BotManager.log('Clicked leave room button found by text search: ' + text.trim());
                return true;
            }
        }

        BotManager.log('Leave room button not found with any method', 'WARN');
        BotManager.log('=== DEBUG: All app-juicy-button components ===');
        var debugJuicy = document.querySelectorAll('app-juicy-button');
        for (var m = 0; m < debugJuicy.length; m++) {
            var juicy = debugJuicy[m];
            BotManager.log('Juicy ' + m + ': "' + juicy.textContent.trim() + '" classes: ' + juicy.className);
        }
        return false;
    }

    function clickPlayOnlineButton() {
        // Check leaderboard position before clicking play online
        var leaderboardCheck = BotManager.checkLeaderboardPosition();
        if (leaderboardCheck.shouldStop) {
            BotManager.log('Leaderboard position ' + leaderboardCheck.position + ' reached target score ' + leaderboardCheck.score + '. Stopping auto-play.');
            BotManager.isAutoPlayEnabled = false;
            BotManager.saveSettings();
            BotManager.showLeaderboardStopNotification(leaderboardCheck.position, leaderboardCheck.score);
            return false;
        }

        // First check if we're already in matchmaking
        if (isInMatchmaking()) {
            BotManager.log('Already in matchmaking - "Finding a random player..." detected, skipping play online button search');
            BotManager.setThinking('Already matchmaking', 'Waiting for opponent...');
            return true;
        }

        BotManager.log('Not in matchmaking, searching for play online button...');

        // Try multiple selectors for the play online button
        var selectors = [
            "button.btn-secondary.flex-grow-1",
            "body > app-root > app-navigation > div.d-flex.h-100 > div.d-flex.flex-column.h-100.w-100 > main > app-game-landing > div > div > div > div.col-12.col-lg-9.dashboard > div.card.area-buttons.d-flex.justify-content-center.align-items-center.flex-column > button.btn.btn-secondary.btn-lg.position-relative",
            "button.btn.btn-secondary.btn-lg.position-relative",
            "button[class*='btn-secondary'][class*='btn-lg']"
        ];

        for (var i = 0; i < selectors.length; i++) {
            var playOnlineButton = document.querySelector(selectors[i]);
            if (playOnlineButton && playOnlineButton.textContent.toLowerCase().includes('play')) {
                playOnlineButton.click();
                BotManager.log('Clicked play online button using selector: ' + selectors[i]);

                // Reset opponent name for new matchmaking
                BotManager.resetOpponentName();

                // Wait for "Finding a random player..." text to appear
                BotManager.setThinking('Play online clicked', 'Waiting for matchmaking to start');
                waitForMatchmaking();
                return true;
            }
        }

        // Check if matchmaking started after our click attempt
        setTimeout(function() {
            if (isInMatchmaking()) {
                BotManager.log('Matchmaking started successfully after click attempt');
                BotManager.setThinking('Matchmaking active', 'Finding opponent...');
            } else {
                BotManager.log('Play online button not found and no matchmaking detected', 'WARN');
            }
        }, 1000);

        return false;
    }

    // Wait for matchmaking to start
    function waitForMatchmaking() {
        var attempts = 0;
        var maxAttempts = 20; // 10 seconds max

        var checkMatchmaking = setInterval(function() {
            attempts++;

            // Use the helper function to check for matchmaking
            var foundMatchmaking = isInMatchmaking();

            if (foundMatchmaking) {
                BotManager.log('Matchmaking detected');
            }

            if (foundMatchmaking) {
                clearInterval(checkMatchmaking);
                BotManager.setThinking('Matchmaking active', 'Finding opponent...');
                BotManager.log('Matchmaking started successfully after ' + (attempts * 0.5) + ' seconds');
            } else if (attempts >= maxAttempts) {
                clearInterval(checkMatchmaking);
                BotManager.setThinking('Matchmaking timeout', 'Checking if already in game or need to retry');
                BotManager.log('Matchmaking text not found after 10 seconds - checking game state', 'WARN');

                // Check if we're already in a game (matchmaking succeeded but we missed it)
                setTimeout(function() {
                    if (isInGame()) {
                        BotManager.log('Actually in game now - matchmaking must have succeeded');
                        BotManager.setThinking('In game', 'Matchmaking succeeded');
                    } else {
                        BotManager.log('Not in game and no matchmaking detected - may need manual intervention', 'ERROR');
                    }
                }, 1000);
            }
        }, 500);
    }

    // Check for new game start after clicking play again
    function checkForNewGameStart() {
        var attempts = 0;
        var maxAttempts = 20; // 10 seconds max

        BotManager.log('Monitoring for new game start after play again...');

        var checkGame = setInterval(function() {
            attempts++;

            // Check if we're now in a game
            if (isInGame()) {
                clearInterval(checkGame);
                BotManager.log('New game detected after play again - game board found');
                BotManager.setThinking('New game started', 'Playing against same opponent');

                // Start the new game
                if (GameManager) {
                    GameManager.startGame();
                }
            } else if (attempts >= maxAttempts) {
                clearInterval(checkGame);
                BotManager.log('New game not detected after 10 seconds - may need manual intervention', 'WARN');
                BotManager.setThinking('Game start timeout', 'Checking current state');
            }
        }, 500);
    }

    // Wait for rematch buttons to appear after game ends
    function waitForRematchButtons(callback, isPlayAgain) {
        var attempts = 0;
        var maxAttempts = 20; // 10 seconds max
        var actionType = isPlayAgain ? 'play again' : 'leave';

        BotManager.setThinking('Game ended', 'Waiting for ' + actionType + ' button to appear');

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
                BotManager.setThinking('Buttons found', 'Clicking ' + actionType + ' button');
                callback();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkButtons);
                BotManager.log('Rematch buttons did not appear after 10 seconds', 'WARN');
                BotManager.setThinking('Button timeout', 'Falling back to leave and find new opponent');

                // Debug: Log what we can see
                BotManager.log('=== DEBUG: What we can see after timeout ===');
                var allJuicy = document.querySelectorAll('app-juicy-button');
                var allButtons = document.querySelectorAll('button');
                BotManager.log('Total app-juicy-button components: ' + allJuicy.length);
                BotManager.log('Total button elements: ' + allButtons.length);

                // Fallback: leave and find new opponent
                setTimeout(function() {
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

                if (buttonText.includes('play') && buttonText.includes('again')) {
                    // For app-juicy-button, we need to click the actual button element
                    var actualButton = button.tagName === 'BUTTON' ? button : button.closest('button');
                    if (actualButton) {
                        actualButton.click();
                        BotManager.log('Clicked play again button using juicy selector: "' + buttonText + '"');
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

        // Enhanced debug info for app-juicy-button
        BotManager.log('=== DEBUG: App-juicy-button components ===');
        var debugJuicy = document.querySelectorAll('app-juicy-button');
        for (var o = 0; o < debugJuicy.length; o++) {
            var juicy = debugJuicy[o];
            BotManager.log('Juicy ' + o + ': "' + juicy.textContent.trim() + '" classes: ' + juicy.className);
        }

        return false;
    }

    // Initialize BotManager
    BotManager.init();

    // Check if username is stored in GM storage
    GM.getValue('username').then(function(username) {
        if (!username) {
            // Alert the user
            alert('Username is not stored in GM storage.');

            // Prompt the user to enter the username
            username = prompt('Please enter your Papergames username (case-sensitive):');

            // Save the username to GM storage
            GM.setValue('username', username);
        }
    });

    function logout() {
        GM.deleteValue('username');
        location.reload();
    }

    function createLogoutButton() {
        var logoutButton = document.createElement('button');
        logoutButton.textContent = 'Logout';
        logoutButton.style.position = 'fixed';
        logoutButton.style.bottom = '20px';
        logoutButton.style.right = '20px';
        logoutButton.style.zIndex = '9999';
        logoutButton.style.color = 'white'; // Set the text color to white
        logoutButton.classList.add('btn', 'btn-secondary', 'mb-2', 'ng-star-inserted');
        logoutButton.addEventListener('click', logout);
        logoutButton.addEventListener('mouseover', function() {
            logoutButton.style.opacity = '0.5'; // Dim the button when hovered over
        });
        logoutButton.addEventListener('mouseout', function() {
            logoutButton.style.opacity = '1'; // Restore the button opacity when mouse leaves
        });
        document.body.appendChild(logoutButton);
    }
    createLogoutButton();

    //------------------------------------------------

    (function() {
        'use strict';

        // Create a container for the dropdown
        var dropdownContainer = document.createElement('div');
        dropdownContainer.style.position = 'fixed';
        dropdownContainer.style.bottom = '20px';
        dropdownContainer.style.left = '20px';
        dropdownContainer.style.zIndex = '9998';
        dropdownContainer.style.backgroundColor = '#1b2837';
        dropdownContainer.style.border = '1px solid #18bc9c';
        dropdownContainer.style.borderRadius = '5px';

        // Create a button to toggle the dropdown
        var toggleButton = document.createElement('button');
        toggleButton.textContent = 'Settings';
        toggleButton.style.padding = '5px 10px';
        toggleButton.style.border = 'none';
        toggleButton.classList.add('btn', 'btn-secondary', 'mb-2', 'ng-star-inserted');
        toggleButton.style.backgroundColor = '#007bff';
        toggleButton.style.color = 'white';
        toggleButton.style.borderRadius = '5px';
        toggleButton.addEventListener('mouseover', function() {
            toggleButton.style.opacity = '0.5'; // Dim the button when hovered over
        });
        toggleButton.addEventListener('mouseout', function() {
            toggleButton.style.opacity = '1'; // Restore the button opacity when mouse leaves
        });

        // Create the dropdown content
        var dropdownContent = document.createElement('div');
        dropdownContent.style.display = 'none';
        dropdownContent.style.padding = '8px';

        // Create the "Auto Queue" tab
        var autoQueueTab = document.createElement('div');
        autoQueueTab.textContent = 'Auto Queue';
        autoQueueTab.style.padding = '5px 0';
        autoQueueTab.style.cursor = 'pointer';

        // Create the "Depth Slider" tab
        var depthSliderTab = document.createElement('div');
        depthSliderTab.textContent = 'Depth Slider';
        depthSliderTab.style.padding = '5px 0';
        depthSliderTab.style.cursor = 'pointer';

        // Create the "Auto Play Control" tab
        var autoPlayTab = document.createElement('div');
        autoPlayTab.textContent = 'Auto Play Control';
        autoPlayTab.style.padding = '5px 0';
        autoPlayTab.style.cursor = 'pointer';
        autoPlayTab.style.color = '#18bc9c';
        autoPlayTab.style.fontWeight = 'bold';

        // Create the "Detection Settings" tab
        var detectionTab = document.createElement('div');
        detectionTab.textContent = 'Detection Settings';
        detectionTab.style.padding = '5px 0';
        detectionTab.style.cursor = 'pointer';

        // Create the "Game Strategy" tab
        var strategyTab = document.createElement('div');
        strategyTab.textContent = 'Game Strategy';
        strategyTab.style.padding = '5px 0';
        strategyTab.style.cursor = 'pointer';

        // Create the settings for "Auto Queue"
        var autoQueueSettings = document.createElement('div');
        autoQueueSettings.textContent = 'Auto Queue Settings';
        autoQueueSettings.style.display = 'none'; // Initially hidden
        autoQueueSettings.style.padding = '10px';

        // Create the settings for "Depth Slider"
        var depthSliderSettings = document.createElement('div');
        depthSliderSettings.style.display = 'none'; // Initially displayed for this tab
        depthSliderSettings.style.padding = '10px';

        // Create the depth slider
        var depthSlider = document.createElement('input');
        depthSlider.type = 'range';
        depthSlider.min = '1';
        depthSlider.max = '100';
        GM.getValue('depth').then(function(storedDepth) {
            depthSlider.value = storedDepth !== null ? storedDepth : '100';
        });

        // Add event listener to the depth slider
        depthSlider.addEventListener('input', function() {
            var depth = Math.round(depthSlider.value);
            GM.setValue('depth', depth.toString());

            // Show the popup with the current depth value
            var popup = document.querySelector('.depth-popup'); // Use an existing popup or create a new one
            if (!popup) {
                popup = document.createElement('div');
                popup.classList.add('depth-popup');
                popup.style.position = 'fixed';
                popup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                popup.style.color = 'white';
                popup.style.padding = '5px 10px';
                popup.style.borderRadius = '5px';
                popup.style.zIndex = '9999';
                popup.style.display = 'none';
                document.body.appendChild(popup);
            }

            popup.innerText = 'Depth: ' + depth;
            popup.style.display = 'block';

            // Calculate slider position and adjust popup position
            var sliderRect = depthSlider.getBoundingClientRect();
            var popupX = sliderRect.left + ((depthSlider.value - depthSlider.min) / (depthSlider.max - depthSlider.min)) * sliderRect.width - popup.clientWidth / 2;
            var popupY = sliderRect.top - popup.clientHeight - 10;

            popup.style.left = popupX + 'px';
            popup.style.top = popupY + 'px';

            // Start a timer to hide the popup after a certain duration (e.g., 2 seconds)
            setTimeout(function() {
                popup.style.display = 'none';
            }, 2000);
        });

        // Append the depth slider to the "Depth Slider" settings
        depthSliderSettings.appendChild(depthSlider);

        // Create Auto Play Control Settings
        var autoPlaySettings = document.createElement('div');
        autoPlaySettings.style.display = 'none';
        autoPlaySettings.style.padding = '10px';

        // Master Auto-Play Toggle
        var autoPlayToggle = document.createElement('button');
        autoPlayToggle.textContent = 'Auto-Play: OFF';
        autoPlayToggle.classList.add('btn', 'btn-secondary', 'mb-2', 'ng-star-inserted');
        autoPlayToggle.style.backgroundColor = 'red';
        autoPlayToggle.style.color = 'white';
        autoPlayToggle.style.width = '100%';
        autoPlayToggle.style.marginBottom = '10px';

        autoPlayToggle.addEventListener('click', function() {
            BotManager.isAutoPlayEnabled = !BotManager.isAutoPlayEnabled;
            BotManager.saveSettings();
            updateAutoPlayDisplay();
        });

        // Status Display
        var statusDisplay = document.createElement('div');
        statusDisplay.style.backgroundColor = '#2c3e50';
        statusDisplay.style.color = 'white';
        statusDisplay.style.padding = '8px';
        statusDisplay.style.borderRadius = '5px';
        statusDisplay.style.marginBottom = '10px';
        statusDisplay.style.fontSize = '12px';

        // Loss Counter Display
        var lossDisplay = document.createElement('div');
        lossDisplay.style.backgroundColor = '#e74c3c';
        lossDisplay.style.color = 'white';
        lossDisplay.style.padding = '5px';
        lossDisplay.style.borderRadius = '3px';
        lossDisplay.style.marginBottom = '10px';
        lossDisplay.style.textAlign = 'center';

        // Loss Reset Button
        var lossResetBtn = document.createElement('button');
        lossResetBtn.textContent = 'Reset Losses';
        lossResetBtn.classList.add('btn', 'btn-warning', 'btn-sm');
        lossResetBtn.style.width = '100%';
        lossResetBtn.style.marginBottom = '10px';

        lossResetBtn.addEventListener('click', function() {
            if (confirm('Reset loss counter to 0?')) {
                BotManager.totalLosses = 0;
                BotManager.isAutoPlayEnabled = true;
                BotManager.saveSettings();
                updateAutoPlayDisplay();
            }
        });

        // Emergency Stop Button
        var emergencyStop = document.createElement('button');
        emergencyStop.textContent = '🛑 EMERGENCY STOP';
        emergencyStop.classList.add('btn', 'btn-danger');
        emergencyStop.style.width = '100%';
        emergencyStop.style.fontWeight = 'bold';

        emergencyStop.addEventListener('click', function() {
            BotManager.isAutoPlayEnabled = false;
            BotManager.currentOpponentType = 'unknown';
            BotManager.currentGameCount = 0;
            GameManager.gameInProgress = false;
            BotManager.saveSettings();
            updateAutoPlayDisplay();
            BotManager.log('EMERGENCY STOP activated', 'WARN');
        });

        // Safety Reset Button
        var safetyReset = document.createElement('button');
        safetyReset.textContent = '🔧 Reset Safety';
        safetyReset.classList.add('btn', 'btn-success');
        safetyReset.style.width = '100%';
        safetyReset.style.fontWeight = 'bold';
        safetyReset.style.marginTop = '5px';

        safetyReset.addEventListener('click', function() {
            if (confirm('Reset all safety systems and error counters?')) {
                SafetyManager.resetErrorCount();
                BotManager.totalLosses = 0;
                BotManager.isAutoPlayEnabled = true;
                BotManager.currentOpponentType = 'unknown';
                BotManager.currentGameCount = 0;
                GameManager.gameInProgress = false;
                BotManager.saveSettings();
                updateAutoPlayDisplay();
                BotManager.log('Safety systems reset', 'SUCCESS');
            }
        });

        // Update display function
        function updateAutoPlayDisplay() {
            autoPlayToggle.textContent = BotManager.isAutoPlayEnabled ? 'Auto-Play: ON' : 'Auto-Play: OFF';
            autoPlayToggle.style.backgroundColor = BotManager.isAutoPlayEnabled ? 'green' : 'red';

            var runtime = BotManager.getRuntime();
            var opponentInfo = BotManager.currentOpponentType === 'unknown' ? 'Detecting...' :
                              BotManager.currentOpponentType + ' (' + BotManager.currentGameCount + '/' +
                              (BotManager.currentOpponentType === 'bot' ? BotManager.gamesPerBot : BotManager.gamesPerHuman) + ')';

            // Update opponent name detection (only when in game or when we don't have a name)
            if (isInGame() || BotManager.currentOpponentName === 'Unknown') {
                BotManager.detectOpponentName();
            }

            var opponentNameDisplay = BotManager.currentOpponentName !== 'Unknown' ?
                                    BotManager.currentOpponentName : 'Not detected';

            // Add color coding for opponent name
            var nameColor = '#ffffff'; // default white
            if (BotManager.currentOpponentName !== 'Unknown' && BotManager.currentOpponentName !== 'Not detected') {
                // Check if it's a known bot
                var isKnownBot = false;
                for (var i = 0; i < BotManager.knownBotNames.length; i++) {
                    if (BotManager.knownBotNames[i].toLowerCase() === BotManager.currentOpponentName.toLowerCase()) {
                        isKnownBot = true;
                        break;
                    }
                }
                nameColor = isKnownBot ? '#2ecc71' : '#f39c12'; // green for bots, orange for humans
            }

            statusDisplay.innerHTML =
                '<strong>Status:</strong> ' + (BotManager.isAutoPlayEnabled ? 'Active' : 'Stopped') + '<br>' +
                '<strong>Runtime:</strong> ' + runtime + '<br>' +
                '<strong>Opponent:</strong> ' + opponentInfo + '<br>' +
                '<strong>Name:</strong> <span style="color: ' + nameColor + '; font-weight: bold;">' + opponentNameDisplay + '</span><br>' +
                '<strong>Game:</strong> ' + ((GameManager && GameManager.gameInProgress) ? 'In Progress' : 'Waiting');

            lossDisplay.textContent = 'Losses: ' + BotManager.totalLosses + '/' + BotManager.maxLosses;

            if (BotManager.totalLosses >= BotManager.maxLosses) {
                lossDisplay.style.backgroundColor = '#c0392b';
                lossDisplay.innerHTML += '<br>LIMIT REACHED!';
            }
        }

        // Initial display update
        updateAutoPlayDisplay();

        // Update display every 2 seconds
        setInterval(function() {
            // Check if script is disabled due to payment/version issues
            if (isScriptDisabled()) {
                return; // Stop all script execution
            }
            updateAutoPlayDisplay();
        }, 2000);

        // Debug Button
        var debugBtn = document.createElement('button');
        debugBtn.textContent = '🔍 Debug State';
        debugBtn.classList.add('btn', 'btn-info');
        debugBtn.style.width = '100%';
        debugBtn.style.marginTop = '5px';
        debugBtn.style.fontSize = '12px';

        debugBtn.addEventListener('click', function() {
            debugGameState();
            debugPlayAgainButtons();
        });

        // Test Leaderboard Button
        var testLeaderboardBtn = document.createElement('button');
        testLeaderboardBtn.textContent = '📊 Test Leaderboard';
        testLeaderboardBtn.classList.add('btn', 'btn-warning');
        testLeaderboardBtn.style.width = '100%';
        testLeaderboardBtn.style.marginTop = '5px';
        testLeaderboardBtn.style.fontSize = '12px';

        testLeaderboardBtn.addEventListener('click', function() {
            var result = BotManager.checkLeaderboardPosition();
            BotManager.log('Leaderboard test result: shouldStop=' + result.shouldStop + ', position=' + result.position);
            alert('Leaderboard Check Result:\nShould Stop: ' + result.shouldStop + '\nPosition: ' + result.position + '\nTarget: ' + BotManager.leaderboardStopPosition + '\nCheck Enabled: ' + BotManager.enableLeaderboardCheck + '\nUsername: "' + BotManager.myUsername + '"');
        });

        autoPlaySettings.appendChild(autoPlayToggle);
        autoPlaySettings.appendChild(statusDisplay);
        autoPlaySettings.appendChild(lossDisplay);
        autoPlaySettings.appendChild(lossResetBtn);
        autoPlaySettings.appendChild(emergencyStop);
        autoPlaySettings.appendChild(safetyReset);
        autoPlaySettings.appendChild(debugBtn);
        autoPlaySettings.appendChild(testLeaderboardBtn);

        // Create Detection Settings
        var detectionSettings = document.createElement('div');
        detectionSettings.style.display = 'none';
        detectionSettings.style.padding = '10px';

        // Detection Sensitivity Slider
        var sensitivityLabel = document.createElement('div');
        sensitivityLabel.textContent = 'Detection Sensitivity:';
        sensitivityLabel.style.marginBottom = '5px';
        sensitivityLabel.style.color = 'white';

        var sensitivitySlider = document.createElement('input');
        sensitivitySlider.type = 'range';
        sensitivitySlider.min = '1';
        sensitivitySlider.max = '3';
        sensitivitySlider.value = BotManager.detectionSensitivity === 'conservative' ? '1' :
                                  BotManager.detectionSensitivity === 'balanced' ? '2' : '3';
        sensitivitySlider.style.width = '100%';
        sensitivitySlider.style.marginBottom = '10px';

        var sensitivityDisplay = document.createElement('div');
        sensitivityDisplay.style.textAlign = 'center';
        sensitivityDisplay.style.color = '#18bc9c';
        sensitivityDisplay.style.marginBottom = '15px';

        function updateSensitivityDisplay() {
            var labels = ['Conservative', 'Balanced', 'Aggressive'];
            sensitivityDisplay.textContent = labels[sensitivitySlider.value - 1];
        }
        updateSensitivityDisplay();

        sensitivitySlider.addEventListener('input', function() {
            var settings = ['conservative', 'balanced', 'aggressive'];
            BotManager.detectionSensitivity = settings[sensitivitySlider.value - 1];
            BotManager.saveSettings();
            updateSensitivityDisplay();
        });

        // Manual Override Buttons
        var overrideLabel = document.createElement('div');
        overrideLabel.textContent = 'Manual Override:';
        overrideLabel.style.marginBottom = '5px';
        overrideLabel.style.color = 'white';

        var overrideContainer = document.createElement('div');
        overrideContainer.style.display = 'flex';
        overrideContainer.style.gap = '5px';
        overrideContainer.style.marginBottom = '15px';

        var forceBotBtn = document.createElement('button');
        forceBotBtn.textContent = 'Force Bot';
        forceBotBtn.classList.add('btn', 'btn-info', 'btn-sm');
        forceBotBtn.style.flex = '1';

        forceBotBtn.addEventListener('click', function() {
            BotManager.currentOpponentType = 'bot';
            BotManager.currentGameCount = 0;
            BotManager.saveSettings();
            BotManager.log('Manually set opponent as bot');
        });

        var forceHumanBtn = document.createElement('button');
        forceHumanBtn.textContent = 'Force Human';
        forceHumanBtn.classList.add('btn', 'btn-info', 'btn-sm');
        forceHumanBtn.style.flex = '1';

        forceHumanBtn.addEventListener('click', function() {
            BotManager.currentOpponentType = 'human';
            BotManager.currentGameCount = 0;
            BotManager.saveSettings();
            BotManager.log('Manually set opponent as human');
        });

        overrideContainer.appendChild(forceBotBtn);
        overrideContainer.appendChild(forceHumanBtn);

        // Detection History Display
        var historyLabel = document.createElement('div');
        historyLabel.textContent = 'Recent Detections:';
        historyLabel.style.marginBottom = '5px';
        historyLabel.style.color = 'white';

        var historyDisplay = document.createElement('div');
        historyDisplay.style.backgroundColor = '#2c3e50';
        historyDisplay.style.color = 'white';
        historyDisplay.style.padding = '8px';
        historyDisplay.style.borderRadius = '5px';
        historyDisplay.style.fontSize = '11px';
        historyDisplay.style.maxHeight = '100px';
        historyDisplay.style.overflowY = 'auto';

        function updateDetectionHistory() {
            var recent = BotManager.detectionHistory.slice(-5).reverse();
            if (recent.length === 0) {
                historyDisplay.innerHTML = 'No detections yet';
                return;
            }

            var html = recent.map(function(detection) {
                var time = new Date(detection.timestamp).toLocaleTimeString();
                var confidence = (detection.confidence * 100).toFixed(0);
                return time + ': ' + detection.opponent + ' → ' + detection.type + ' (' + confidence + '%)';
            }).join('<br>');

            historyDisplay.innerHTML = html;
        }

        updateDetectionHistory();
        setInterval(function() {
            // Check if script is disabled due to payment/version issues
            if (isScriptDisabled()) {
                return; // Stop all script execution
            }
            updateDetectionHistory();
        }, 3000);

        // Known Bots Display
        var knownBotsLabel = document.createElement('div');
        knownBotsLabel.textContent = 'Known Bot Names (' + BotManager.knownBotNames.length + '):';
        knownBotsLabel.style.marginBottom = '5px';
        knownBotsLabel.style.marginTop = '15px';
        knownBotsLabel.style.color = 'white';

        var knownBotsDisplay = document.createElement('div');
        knownBotsDisplay.style.backgroundColor = '#2c3e50';
        knownBotsDisplay.style.color = '#18bc9c';
        knownBotsDisplay.style.padding = '8px';
        knownBotsDisplay.style.borderRadius = '5px';
        knownBotsDisplay.style.fontSize = '11px';
        knownBotsDisplay.style.maxHeight = '80px';
        knownBotsDisplay.style.overflowY = 'auto';
        knownBotsDisplay.innerHTML = BotManager.knownBotNames.join(', ');

        // Function to update known bots display
        BotManager.updateKnownBotsDisplay = function() {
            if (knownBotsLabel && knownBotsDisplay) {
                knownBotsLabel.textContent = 'Known Bot Names (' + BotManager.knownBotNames.length + '):';
                knownBotsDisplay.innerHTML = BotManager.knownBotNames.join(', ');
            }
        };

        // Bot Detection Alert Toggle
        var alertToggleLabel = document.createElement('div');
        alertToggleLabel.textContent = 'Bot Detection Alert:';
        alertToggleLabel.style.marginBottom = '5px';
        alertToggleLabel.style.marginTop = '15px';
        alertToggleLabel.style.fontWeight = 'bold';

        var alertToggle = document.createElement('button');
        alertToggle.id = 'bot-alert-toggle';
        alertToggle.textContent = BotManager.enableBotDetectionAlert ? 'Alert ON' : 'Alert OFF';
        alertToggle.style.backgroundColor = BotManager.enableBotDetectionAlert ? '#2ecc71' : '#e74c3c';
        alertToggle.style.color = 'white';
        alertToggle.style.border = 'none';
        alertToggle.style.padding = '8px 16px';
        alertToggle.style.borderRadius = '4px';
        alertToggle.style.cursor = 'pointer';
        alertToggle.style.marginBottom = '10px';

        alertToggle.addEventListener('click', function() {
            BotManager.enableBotDetectionAlert = !BotManager.enableBotDetectionAlert;
            alertToggle.textContent = BotManager.enableBotDetectionAlert ? 'Alert ON' : 'Alert OFF';
            alertToggle.style.backgroundColor = BotManager.enableBotDetectionAlert ? '#2ecc71' : '#e74c3c';
            BotManager.saveSettings();
            BotManager.log('Bot detection alert ' + (BotManager.enableBotDetectionAlert ? 'enabled' : 'disabled'));
        });

        // Bot Detection GUI Toggle
        var guiToggleLabel = document.createElement('div');
        guiToggleLabel.textContent = 'Bot Detection GUI Popup:';
        guiToggleLabel.style.marginBottom = '5px';
        guiToggleLabel.style.fontWeight = 'bold';

        var guiToggle = document.createElement('button');
        guiToggle.id = 'bot-gui-toggle';
        guiToggle.textContent = BotManager.enableBotDetectionGUI ? 'GUI ON' : 'GUI OFF';
        guiToggle.style.backgroundColor = BotManager.enableBotDetectionGUI ? '#2ecc71' : '#e74c3c';
        guiToggle.style.color = 'white';
        guiToggle.style.border = 'none';
        guiToggle.style.padding = '8px 16px';
        guiToggle.style.borderRadius = '4px';
        guiToggle.style.cursor = 'pointer';
        guiToggle.style.marginBottom = '10px';

        guiToggle.addEventListener('click', function() {
            BotManager.enableBotDetectionGUI = !BotManager.enableBotDetectionGUI;
            guiToggle.textContent = BotManager.enableBotDetectionGUI ? 'GUI ON' : 'GUI OFF';
            guiToggle.style.backgroundColor = BotManager.enableBotDetectionGUI ? '#2ecc71' : '#e74c3c';
            BotManager.saveSettings();
            BotManager.log('Bot detection GUI ' + (BotManager.enableBotDetectionGUI ? 'enabled' : 'disabled'));
        });

        // 24-Hour Safety Toggle
        var safetyToggleLabel = document.createElement('div');
        safetyToggleLabel.textContent = '24-Hour Safety Limit:';
        safetyToggleLabel.style.marginBottom = '5px';
        safetyToggleLabel.style.marginTop = '15px';
        safetyToggleLabel.style.fontWeight = 'bold';

        var safetyToggle = document.createElement('button');
        safetyToggle.id = 'safety-toggle';
        safetyToggle.textContent = BotManager.enable24HourSafety ? 'Safety ON' : 'Safety OFF';
        safetyToggle.style.backgroundColor = BotManager.enable24HourSafety ? '#2ecc71' : '#f39c12';
        safetyToggle.style.color = 'white';
        safetyToggle.style.border = 'none';
        safetyToggle.style.padding = '8px 16px';
        safetyToggle.style.borderRadius = '4px';
        safetyToggle.style.cursor = 'pointer';
        safetyToggle.style.marginBottom = '10px';

        safetyToggle.addEventListener('click', function() {
            BotManager.enable24HourSafety = !BotManager.enable24HourSafety;
            safetyToggle.textContent = BotManager.enable24HourSafety ? 'Safety ON' : 'Safety OFF';
            safetyToggle.style.backgroundColor = BotManager.enable24HourSafety ? '#2ecc71' : '#f39c12';
            BotManager.saveSettings();
            BotManager.log('24-hour safety ' + (BotManager.enable24HourSafety ? 'enabled' : 'disabled'));
        });

        detectionSettings.appendChild(sensitivityLabel);
        detectionSettings.appendChild(sensitivitySlider);
        detectionSettings.appendChild(sensitivityDisplay);
        detectionSettings.appendChild(overrideLabel);
        detectionSettings.appendChild(overrideContainer);
        detectionSettings.appendChild(alertToggleLabel);
        detectionSettings.appendChild(alertToggle);
        detectionSettings.appendChild(guiToggleLabel);
        detectionSettings.appendChild(guiToggle);
        detectionSettings.appendChild(safetyToggleLabel);
        detectionSettings.appendChild(safetyToggle);
        detectionSettings.appendChild(historyLabel);
        detectionSettings.appendChild(historyDisplay);
        detectionSettings.appendChild(knownBotsLabel);
        detectionSettings.appendChild(knownBotsDisplay);

        // Create Game Strategy Settings
        var strategySettings = document.createElement('div');
        strategySettings.style.display = 'none';
        strategySettings.style.padding = '10px';

        // Games per Bot setting
        var botGamesLabel = document.createElement('div');
        botGamesLabel.textContent = 'Games vs Bots:';
        botGamesLabel.style.marginBottom = '5px';
        botGamesLabel.style.color = 'white';

        var botGamesInput = document.createElement('input');
        botGamesInput.type = 'number';
        botGamesInput.min = '1';
        botGamesInput.max = '20';
        botGamesInput.value = BotManager.gamesPerBot;
        botGamesInput.style.width = '100%';
        botGamesInput.style.marginBottom = '10px';
        botGamesInput.style.padding = '5px';
        botGamesInput.style.borderRadius = '3px';
        botGamesInput.style.border = '1px solid #ccc';

        botGamesInput.addEventListener('change', function() {
            BotManager.gamesPerBot = parseInt(botGamesInput.value) || 7;
            BotManager.saveSettings();
        });

        // Games per Human setting
        var humanGamesLabel = document.createElement('div');
        humanGamesLabel.textContent = 'Games vs Humans:';
        humanGamesLabel.style.marginBottom = '5px';
        humanGamesLabel.style.color = 'white';

        var humanGamesInput = document.createElement('input');
        humanGamesInput.type = 'number';
        humanGamesInput.min = '1';
        humanGamesInput.max = '5';
        humanGamesInput.value = BotManager.gamesPerHuman;
        humanGamesInput.style.width = '100%';
        humanGamesInput.style.marginBottom = '10px';
        humanGamesInput.style.padding = '5px';
        humanGamesInput.style.borderRadius = '3px';
        humanGamesInput.style.border = '1px solid #ccc';

        humanGamesInput.addEventListener('change', function() {
            BotManager.gamesPerHuman = parseInt(humanGamesInput.value) || 1;
            BotManager.saveSettings();
        });

        // Max Losses setting
        var maxLossesLabel = document.createElement('div');
        maxLossesLabel.textContent = 'Maximum Losses:';
        maxLossesLabel.style.marginBottom = '5px';
        maxLossesLabel.style.color = 'white';

        var maxLossesInput = document.createElement('input');
        maxLossesInput.type = 'number';
        maxLossesInput.min = '1';
        maxLossesInput.max = '50';
        maxLossesInput.value = BotManager.maxLosses;
        maxLossesInput.style.width = '100%';
        maxLossesInput.style.marginBottom = '15px';
        maxLossesInput.style.padding = '5px';
        maxLossesInput.style.borderRadius = '3px';
        maxLossesInput.style.border = '1px solid #ccc';

        maxLossesInput.addEventListener('change', function() {
            BotManager.maxLosses = parseInt(maxLossesInput.value) || 5;
            BotManager.saveSettings();
        });

        // First Move Strategy Toggle
        var firstMoveStrategyLabel = document.createElement('div');
        firstMoveStrategyLabel.textContent = 'First Move Strategy:';
        firstMoveStrategyLabel.style.marginBottom = '5px';
        firstMoveStrategyLabel.style.color = 'white';

        var firstMoveStrategyToggle = document.createElement('button');
        firstMoveStrategyToggle.id = 'first-move-strategy-toggle';
        firstMoveStrategyToggle.textContent = BotManager.enableFirstMoveStrategy ? 'Strategy ON' : 'Strategy OFF';
        firstMoveStrategyToggle.classList.add('btn', 'btn-sm');
        firstMoveStrategyToggle.style.width = '100%';
        firstMoveStrategyToggle.style.marginBottom = '10px';
        firstMoveStrategyToggle.style.backgroundColor = BotManager.enableFirstMoveStrategy ? '#2ecc71' : '#e74c3c';
        firstMoveStrategyToggle.style.color = 'white';

        firstMoveStrategyToggle.addEventListener('click', function() {
            BotManager.enableFirstMoveStrategy = !BotManager.enableFirstMoveStrategy;
            firstMoveStrategyToggle.textContent = BotManager.enableFirstMoveStrategy ? 'Strategy ON' : 'Strategy OFF';
            firstMoveStrategyToggle.style.backgroundColor = BotManager.enableFirstMoveStrategy ? '#2ecc71' : '#e74c3c';
            BotManager.saveSettings();
            BotManager.log('First move strategy ' + (BotManager.enableFirstMoveStrategy ? 'enabled' : 'disabled'));
        });

        // Strategy Description
        var strategyDescription = document.createElement('div');
        strategyDescription.textContent = 'When enabled: Bot starts in center, then plays diagonal to opponent\'s corner';
        strategyDescription.style.fontSize = '11px';
        strategyDescription.style.color = '#bdc3c7';
        strategyDescription.style.marginBottom = '15px';
        strategyDescription.style.fontStyle = 'italic';

        // Leaderboard Position Check Toggle
        var leaderboardCheckLabel = document.createElement('div');
        leaderboardCheckLabel.textContent = 'Leaderboard Position Check:';
        leaderboardCheckLabel.style.marginBottom = '5px';
        leaderboardCheckLabel.style.color = 'white';
        leaderboardCheckLabel.style.marginTop = '15px';

        var leaderboardCheckToggle = document.createElement('button');
        leaderboardCheckToggle.id = 'leaderboard-check-toggle';
        leaderboardCheckToggle.textContent = BotManager.enableLeaderboardCheck ? 'Check ON' : 'Check OFF';
        leaderboardCheckToggle.classList.add('btn', 'btn-sm');
        leaderboardCheckToggle.style.width = '100%';
        leaderboardCheckToggle.style.marginBottom = '10px';
        leaderboardCheckToggle.style.backgroundColor = BotManager.enableLeaderboardCheck ? '#2ecc71' : '#e74c3c';
        leaderboardCheckToggle.style.color = 'white';

        leaderboardCheckToggle.addEventListener('click', function() {
            BotManager.enableLeaderboardCheck = !BotManager.enableLeaderboardCheck;
            leaderboardCheckToggle.textContent = BotManager.enableLeaderboardCheck ? 'Check ON' : 'Check OFF';
            leaderboardCheckToggle.style.backgroundColor = BotManager.enableLeaderboardCheck ? '#2ecc71' : '#e74c3c';
            BotManager.saveSettings();
            BotManager.log('Leaderboard position check ' + (BotManager.enableLeaderboardCheck ? 'enabled' : 'disabled'));
        });

        // Leaderboard Stop Score Input
        var leaderboardPositionLabel = document.createElement('div');
        leaderboardPositionLabel.textContent = 'Stop at Score (or higher):';
        leaderboardPositionLabel.style.marginBottom = '5px';
        leaderboardPositionLabel.style.color = 'white';
        leaderboardPositionLabel.style.marginTop = '10px';

        var leaderboardPositionInput = document.createElement('input');
        leaderboardPositionInput.id = 'leaderboard-position-input';
        leaderboardPositionInput.type = 'number';
        leaderboardPositionInput.value = BotManager.leaderboardStopPosition;
        leaderboardPositionInput.min = '1';
        leaderboardPositionInput.max = '50000';
        leaderboardPositionInput.style.width = '100%';
        leaderboardPositionInput.style.padding = '5px';
        leaderboardPositionInput.style.marginBottom = '10px';
        leaderboardPositionInput.style.backgroundColor = '#2c3e50';
        leaderboardPositionInput.style.color = 'white';
        leaderboardPositionInput.style.border = '1px solid #ccc';
        leaderboardPositionInput.style.borderRadius = '3px';

        leaderboardPositionInput.addEventListener('change', function() {
            var newPosition = parseInt(leaderboardPositionInput.value) || 16000;
            if (newPosition < 1) newPosition = 1;
            if (newPosition > 50000) newPosition = 50000;
            BotManager.leaderboardStopPosition = newPosition;
            leaderboardPositionInput.value = newPosition;
            BotManager.saveSettings();
            BotManager.log('Leaderboard stop position set to: ' + newPosition);
        });

        var leaderboardDescription = document.createElement('div');
        leaderboardDescription.style.color = '#bdc3c7';
        leaderboardDescription.style.fontSize = '11px';
        leaderboardDescription.style.marginBottom = '15px';
        leaderboardDescription.style.fontStyle = 'italic';
        leaderboardDescription.textContent = 'When enabled, auto-play will stop when you reach the specified leaderboard position or better. Default: 16000 (16k).';

        // Username Setting
        var usernameLabel = document.createElement('div');
        usernameLabel.textContent = 'Your Username (for leaderboard detection):';
        usernameLabel.style.marginBottom = '5px';
        usernameLabel.style.color = 'white';
        usernameLabel.style.marginTop = '15px';

        var usernameInput = document.createElement('input');
        usernameInput.id = 'username-input';
        usernameInput.type = 'text';
        usernameInput.value = BotManager.myUsername;
        usernameInput.placeholder = 'Enter your username';
        usernameInput.style.width = '100%';
        usernameInput.style.padding = '5px';
        usernameInput.style.marginBottom = '10px';
        usernameInput.style.backgroundColor = '#2c3e50';
        usernameInput.style.color = 'white';
        usernameInput.style.border = '1px solid #ccc';
        usernameInput.style.borderRadius = '3px';

        usernameInput.addEventListener('change', function() {
            var newUsername = usernameInput.value.trim();
            if (newUsername.length > 0) {
                BotManager.myUsername = newUsername;
                BotManager.saveSettings();
                BotManager.log('Username updated to: "' + newUsername + '"');
            } else {
                usernameInput.value = BotManager.myUsername; // Reset to current value if empty
            }
        });

        // Auto-detect username button
        var autoDetectBtn = document.createElement('button');
        autoDetectBtn.textContent = '🔍 Auto-Detect';
        autoDetectBtn.classList.add('btn', 'btn-sm');
        autoDetectBtn.style.width = '100%';
        autoDetectBtn.style.marginBottom = '10px';
        autoDetectBtn.style.backgroundColor = '#3498db';
        autoDetectBtn.style.color = 'white';
        autoDetectBtn.style.fontSize = '12px';

        autoDetectBtn.addEventListener('click', function() {
            var detected = BotManager.updateUsernameFromDetection();
            if (detected) {
                alert('Username auto-detected and updated to: "' + BotManager.myUsername + '"');
            } else {
                alert('Could not auto-detect username. Please enter it manually.');
            }
        });

        var usernameDescription = document.createElement('div');
        usernameDescription.style.color = '#bdc3c7';
        usernameDescription.style.fontSize = '11px';
        usernameDescription.style.marginBottom = '15px';
        usernameDescription.style.fontStyle = 'italic';
        usernameDescription.textContent = 'Enter your exact username as it appears on the leaderboard, or use Auto-Detect to find it automatically.';

        // Performance Stats
        var statsLabel = document.createElement('div');
        statsLabel.textContent = 'Session Stats:';
        statsLabel.style.marginBottom = '5px';
        statsLabel.style.color = 'white';

        var statsDisplay = document.createElement('div');
        statsDisplay.style.backgroundColor = '#2c3e50';
        statsDisplay.style.color = 'white';
        statsDisplay.style.padding = '8px';
        statsDisplay.style.borderRadius = '5px';
        statsDisplay.style.fontSize = '12px';

        function updateStats() {
            var totalGames = BotManager.gameResults.length;
            var wins = BotManager.gameResults.filter(function(r) { return r.result === 'win'; }).length;
            var losses = BotManager.gameResults.filter(function(r) { return r.result === 'loss'; }).length;
            var draws = BotManager.gameResults.filter(function(r) { return r.result === 'draw'; }).length;
            var winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0';

            statsDisplay.innerHTML =
                '<strong>Total Games:</strong> ' + totalGames + '<br>' +
                '<strong>Wins:</strong> ' + wins + ' | <strong>Losses:</strong> ' + losses + ' | <strong>Draws:</strong> ' + draws + '<br>' +
                '<strong>Win Rate:</strong> ' + winRate + '%<br>' +
                '<strong>Runtime:</strong> ' + BotManager.getRuntime();
        }

        updateStats();
        setInterval(function() {
            // Check if script is disabled due to payment/version issues
            if (isScriptDisabled()) {
                return; // Stop all script execution
            }
            updateStats();
        }, 5000);

        // Export Logs Button
        var exportBtn = document.createElement('button');
        exportBtn.textContent = '📥 Export Logs';
        exportBtn.classList.add('btn', 'btn-info', 'btn-sm');
        exportBtn.style.width = '100%';
        exportBtn.style.marginBottom = '10px';

        exportBtn.addEventListener('click', function() {
            BotManager.exportLogs();
        });

        // Real-time Log Display
        var logLabel = document.createElement('div');
        logLabel.textContent = 'Recent Activity:';
        logLabel.style.marginBottom = '5px';
        logLabel.style.color = 'white';

        var logDisplay = document.createElement('div');
        logDisplay.id = 'bot-log-display';
        logDisplay.style.backgroundColor = '#2c3e50';
        logDisplay.style.color = 'white';
        logDisplay.style.padding = '8px';
        logDisplay.style.borderRadius = '5px';
        logDisplay.style.fontSize = '10px';
        logDisplay.style.maxHeight = '120px';
        logDisplay.style.overflowY = 'auto';
        logDisplay.style.fontFamily = 'monospace';

        strategySettings.appendChild(botGamesLabel);
        strategySettings.appendChild(botGamesInput);
        strategySettings.appendChild(humanGamesLabel);
        strategySettings.appendChild(humanGamesInput);
        strategySettings.appendChild(maxLossesLabel);
        strategySettings.appendChild(maxLossesInput);
        strategySettings.appendChild(firstMoveStrategyLabel);
        strategySettings.appendChild(firstMoveStrategyToggle);
        strategySettings.appendChild(strategyDescription);
        strategySettings.appendChild(leaderboardCheckLabel);
        strategySettings.appendChild(leaderboardCheckToggle);
        strategySettings.appendChild(leaderboardPositionLabel);
        strategySettings.appendChild(leaderboardPositionInput);
        strategySettings.appendChild(leaderboardDescription);
        strategySettings.appendChild(usernameLabel);
        strategySettings.appendChild(usernameInput);
        strategySettings.appendChild(autoDetectBtn);
        strategySettings.appendChild(usernameDescription);
        strategySettings.appendChild(statsLabel);
        strategySettings.appendChild(statsDisplay);
        strategySettings.appendChild(exportBtn);
        strategySettings.appendChild(logLabel);
        strategySettings.appendChild(logDisplay);

        // Create the settings for "Auto Queue"
        var autoQueueSettings = document.createElement('div');
        autoQueueSettings.style.padding = '10px';

        // Create the "Auto Queue" toggle button
        var autoQueueToggleButton = document.createElement('button');
        autoQueueToggleButton.textContent = 'Auto Queue Off';
        autoQueueToggleButton.style.marginTop = '10px';
        autoQueueToggleButton.style.display = 'none';
        autoQueueToggleButton.classList.add('btn', 'btn-secondary', 'mb-2', 'ng-star-inserted');
        autoQueueToggleButton.style.backgroundColor = 'red'; // Initially red for "Off"
        autoQueueToggleButton.style.color = 'white';
        autoQueueToggleButton.addEventListener('click', toggleAutoQueue);

        autoQueueSettings.appendChild(autoQueueToggleButton);

        var isAutoQueueOn = false; // Track the state

        function toggleAutoQueue() {
            // Toggle the state
            isAutoQueueOn = !isAutoQueueOn;
            GM.setValue('isToggled', isAutoQueueOn);

            // Update the button text and style based on the state
            autoQueueToggleButton.textContent = isAutoQueueOn ? 'Auto Queue On' : 'Auto Queue Off';
            autoQueueToggleButton.style.backgroundColor = isAutoQueueOn ? 'green' : 'red';
        }





        // Enhanced periodic checking with smart logic
        function checkButtonsPeriodically() {
            // Use old auto-queue if new auto-play is disabled
            if (isAutoQueueOn && !BotManager.isAutoPlayEnabled) {
                clickLeaveRoomButton();
                clickPlayOnlineButton();
            }

            // New auto-play system - more aggressive play online clicking
            if (BotManager.isAutoPlayEnabled && !isInGame()) {
                // Check leaderboard position before clicking play online
                var leaderboardCheck = BotManager.checkLeaderboardPosition();
                if (leaderboardCheck.shouldStop) {
                    BotManager.log('Leaderboard position ' + leaderboardCheck.position + ' reached target score ' + leaderboardCheck.score + '. Stopping auto-play.');
                    BotManager.isAutoPlayEnabled = false;
                    BotManager.saveSettings();
                    BotManager.showLeaderboardStopNotification(leaderboardCheck.position, leaderboardCheck.score);
                    return;
                }

                // Check for play online button and click it
                var playOnlineSelectors = [
                    "button.btn-secondary.flex-grow-1",
                    "body > app-root > app-navigation > div.d-flex.h-100 > div.d-flex.flex-column.h-100.w-100 > main > app-game-landing > div > div > div > div.col-12.col-lg-9.dashboard > div.card.area-buttons.d-flex.justify-content-center.align-items-center.flex-column > button.btn.btn-secondary.btn-lg.position-relative",
                    "button.btn.btn-secondary.btn-lg.position-relative",
                    "button[class*='btn-secondary'][class*='btn-lg']"
                ];

                for (var i = 0; i < playOnlineSelectors.length; i++) {
                    var playButton = document.querySelector(playOnlineSelectors[i]);
                    if (playButton && (playButton.textContent.toLowerCase().includes('play') ||
                                      playButton.textContent.toLowerCase().includes('online'))) {
                        playButton.click();
                        BotManager.log('Auto-clicked play online button');
                        break;
                    }
                }
            }
        }

        // Set up periodic checking - more frequent for auto-play
        setInterval(function() {
            // Check if script is disabled due to payment/version issues
            if (isScriptDisabled()) {
                return; // Stop all script execution
            }
            checkButtonsPeriodically();
        }, 1000);

        //------------------------------------------------------------------------Testing Purposes

        let previousNumber = null; // Initialize the previousNumber to null

        function trackAndClickIfDifferent() {
            // Select the <span> element using its class name
            const spanElement = document.querySelector('app-count-down span');

            if (spanElement) {
                // Extract the number from the text content
                const number = parseInt(spanElement.textContent, 10);

                // Check if parsing was successful
                if (!isNaN(number)) {
                    // Check if the number has changed since the last check
                    if (previousNumber !== null && number !== previousNumber && isAutoQueueOn) {
                        spanElement.click();
                    }

                    // Update the previousNumber with the current value
                    previousNumber = number;
                }
            }
        }

        // Set up an interval to call the function at regular intervals (e.g., every 1 second)
        setInterval(function() {
            // Check if script is disabled due to payment/version issues
            if (isScriptDisabled()) {
                return; // Stop all script execution
            }
            trackAndClickIfDifferent();
        }, 1000); // 1000 milliseconds = 1 second

        //-------------------------------------------------------------------------------------------

        // Append the toggle button to the "Auto Queue" settings
        autoQueueSettings.appendChild(autoQueueToggleButton);

        // Function to hide all settings panels
        function hideAllSettings() {
            autoQueueSettings.style.display = 'none';
            depthSliderSettings.style.display = 'none';
            autoPlaySettings.style.display = 'none';
            detectionSettings.style.display = 'none';
            strategySettings.style.display = 'none';
            autoQueueToggleButton.style.display = 'none';
        }

        // Add event listeners to the tabs to toggle their respective settings
        autoQueueTab.addEventListener('click', function() {
            hideAllSettings();
            autoQueueSettings.style.display = 'block';
            autoQueueToggleButton.style.display = 'block';
        });

        depthSliderTab.addEventListener('click', function() {
            hideAllSettings();
            depthSliderSettings.style.display = 'block';
        });

        autoPlayTab.addEventListener('click', function() {
            hideAllSettings();
            autoPlaySettings.style.display = 'block';
        });

        detectionTab.addEventListener('click', function() {
            hideAllSettings();
            detectionSettings.style.display = 'block';
        });

        strategyTab.addEventListener('click', function() {
            hideAllSettings();
            strategySettings.style.display = 'block';
        });

        // Append the tabs and settings to the dropdown content
        dropdownContent.appendChild(autoPlayTab);
        dropdownContent.appendChild(autoPlaySettings);
        dropdownContent.appendChild(detectionTab);
        dropdownContent.appendChild(detectionSettings);
        dropdownContent.appendChild(strategyTab);
        dropdownContent.appendChild(strategySettings);
        dropdownContent.appendChild(autoQueueTab);
        dropdownContent.appendChild(autoQueueSettings);
        dropdownContent.appendChild(depthSliderTab);
        dropdownContent.appendChild(depthSliderSettings);

        // Append the button and dropdown content to the container
        dropdownContainer.appendChild(toggleButton);
        dropdownContainer.appendChild(dropdownContent);

        // Toggle the dropdown when the button is clicked
        toggleButton.addEventListener('click', function() {
            if (dropdownContent.style.display === 'none') {
                dropdownContent.style.display = 'block';
            } else {
                dropdownContent.style.display = 'none';
            }
        });

        // Append the dropdown container to the document body
        document.body.appendChild(dropdownContainer);
    })();

    // Create Persistent Status Bar
    (function() {
        'use strict';

        var statusBar = document.createElement('div');
        statusBar.id = 'bot-status-bar';
        statusBar.style.position = 'fixed';
        statusBar.style.top = '10px';
        statusBar.style.right = '10px';
        statusBar.style.backgroundColor = 'rgba(27, 40, 55, 0.95)';
        statusBar.style.border = '2px solid #18bc9c';
        statusBar.style.borderRadius = '8px';
        statusBar.style.padding = '10px';
        statusBar.style.color = 'white';
        statusBar.style.fontSize = '12px';
        statusBar.style.fontFamily = 'monospace';
        statusBar.style.zIndex = '9997';
        statusBar.style.minWidth = '200px';
        statusBar.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';

        // Status content container
        var statusContent = document.createElement('div');
        statusContent.style.marginBottom = '8px';

        // Bot thinking display
        var thinkingDisplay = document.createElement('div');
        thinkingDisplay.id = 'bot-thinking-display';
        thinkingDisplay.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
        thinkingDisplay.style.border = '1px solid #3498db';
        thinkingDisplay.style.borderRadius = '4px';
        thinkingDisplay.style.padding = '6px';
        thinkingDisplay.style.marginBottom = '8px';
        thinkingDisplay.style.fontSize = '11px';
        thinkingDisplay.innerHTML =
            '<div style="color: #3498db; font-weight: bold;">🤖 Initializing...</div>' +
            '<div style="color: #2ecc71; font-size: 10px; margin-top: 3px;">➤ Starting up systems</div>';

        // Quick controls container
        var quickControls = document.createElement('div');
        quickControls.style.display = 'flex';
        quickControls.style.gap = '5px';

        // Quick start/stop button
        var quickToggle = document.createElement('button');
        quickToggle.textContent = '▶';
        quickToggle.style.padding = '2px 6px';
        quickToggle.style.fontSize = '10px';
        quickToggle.style.border = 'none';
        quickToggle.style.borderRadius = '3px';
        quickToggle.style.cursor = 'pointer';
        quickToggle.style.backgroundColor = '#e74c3c';
        quickToggle.style.color = 'white';

        quickToggle.addEventListener('click', function() {
            BotManager.isAutoPlayEnabled = !BotManager.isAutoPlayEnabled;
            BotManager.saveSettings();
            updateStatusBar();
        });

        // Quick reset button
        var quickReset = document.createElement('button');
        quickReset.textContent = '🔄';
        quickReset.style.padding = '2px 6px';
        quickReset.style.fontSize = '10px';
        quickReset.style.border = 'none';
        quickReset.style.borderRadius = '3px';
        quickReset.style.cursor = 'pointer';
        quickReset.style.backgroundColor = '#f39c12';
        quickReset.style.color = 'white';

        quickReset.addEventListener('click', function() {
            BotManager.currentOpponentType = 'unknown';
            BotManager.currentGameCount = 0;
            GameManager.gameInProgress = false;
            BotManager.saveSettings();
            updateStatusBar();
        });

        quickControls.appendChild(quickToggle);
        quickControls.appendChild(quickReset);

        statusBar.appendChild(thinkingDisplay);
        statusBar.appendChild(statusContent);
        statusBar.appendChild(quickControls);
        document.body.appendChild(statusBar);

        // Update status bar function
        function updateStatusBar() {
            var autoPlayStatus = BotManager.isAutoPlayEnabled ?
                '<span style="color: #2ecc71;">●</span> ACTIVE' :
                '<span style="color: #e74c3c;">●</span> STOPPED';

            var opponentStatus = BotManager.currentOpponentType === 'unknown' ?
                '<span style="color: #f39c12;">Detecting...</span>' :
                '<span style="color: #3498db;">' + BotManager.currentOpponentType.toUpperCase() + '</span>';

            var gameProgress = '';
            if (BotManager.currentOpponentType !== 'unknown') {
                var maxGames = BotManager.currentOpponentType === 'bot' ? BotManager.gamesPerBot : BotManager.gamesPerHuman;
                gameProgress = ' (' + BotManager.currentGameCount + '/' + maxGames + ')';
            }

            var gameStatus = (GameManager && GameManager.gameInProgress) ?
                '<span style="color: #2ecc71;">Playing</span>' :
                '<span style="color: #95a5a6;">Waiting</span>';

            var lossStatus = BotManager.totalLosses >= BotManager.maxLosses ?
                '<span style="color: #e74c3c; font-weight: bold;">LIMIT REACHED!</span>' :
                '<span style="color: #f39c12;">' + BotManager.totalLosses + '/' + BotManager.maxLosses + '</span>';

            statusContent.innerHTML =
                '<div><strong>Auto-Play:</strong> ' + autoPlayStatus + '</div>' +
                '<div><strong>Opponent:</strong> ' + opponentStatus + gameProgress + '</div>' +
                '<div><strong>Game:</strong> ' + gameStatus + '</div>' +
                '<div><strong>Losses:</strong> ' + lossStatus + '</div>' +
                '<div><strong>Runtime:</strong> ' + BotManager.getRuntime() + '</div>';

            // Update quick toggle button
            quickToggle.textContent = BotManager.isAutoPlayEnabled ? '⏸' : '▶';
            quickToggle.style.backgroundColor = BotManager.isAutoPlayEnabled ? '#e74c3c' : '#2ecc71';
        }

        // Initial update and set interval
        updateStatusBar();
        setInterval(function() {
            // Check if script is disabled due to payment/version issues
            if (isScriptDisabled()) {
                return; // Stop all script execution
            }
            updateStatusBar();
        }, 1000);

        // Make status bar draggable
        var isDragging = false;
        var dragOffset = { x: 0, y: 0 };

        statusBar.addEventListener('mousedown', function(e) {
            if (e.target === statusBar || e.target === statusContent) {
                isDragging = true;
                dragOffset.x = e.clientX - statusBar.offsetLeft;
                dragOffset.y = e.clientY - statusBar.offsetTop;
                statusBar.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                statusBar.style.left = (e.clientX - dragOffset.x) + 'px';
                statusBar.style.top = (e.clientY - dragOffset.y) + 'px';
                statusBar.style.right = 'auto';
            }
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
            statusBar.style.cursor = 'default';
        });
    })();

    //------------------------------------------------

    function updateBoard(squareId) {
        var row = parseInt(squareId[0]);
        var col = parseInt(squareId[1]);
        
        GM.getValue("username").then(function(username) {
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

        if (currentElement.textContent !== prevChronometerValue && profileOpener) {
            prevChronometerValue = currentElement.textContent;
            simulateCellClick(row, col);
        } else {
            console.log("Waiting for AI's turn...");
        }
    });
        return player;
    }
    
    function logBoardState() {
        // Attempt to log various variables and elements for debugging
        try {
            // Log row and col based on a hardcoded squareId for debugging
            var squareId = "00"; // Change this as needed for different squares
            var row = parseInt(squareId[0]);
            var col = parseInt(squareId[1]);
    
            console.log("Row:", row, "Col:", col);
    
            // Log username from GM storage
            GM.getValue("username").then(function(username) {
                console.log("Username from GM storage:", username);
    
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
    setInterval(function() {
        // Check if script is disabled due to payment/version issues
        if (isScriptDisabled()) {
            return; // Stop all script execution
        }
        logBoardState();
    }, 5000);
    

    var player;

    function initGame() {
        var ticTacToeBoard = document.getElementById('tic-tac-toe-board');
        if (!ticTacToeBoard) {
            // Board doesn't exist yet, try again later
            setTimeout(initGame, 1000);
            return;
        }

        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.target.id === 'tic-tac-toe-board' && isInGame()) {
                    initAITurn();
                }
            });
        });

        observer.observe(ticTacToeBoard, { attributes: true, childList: true, subtree: true });
        BotManager.log('Game observer initialized');
    }


    function initAITurn() {
        // Only proceed if we're actually in a game
        if (!isInGame()) {
            return;
        }

        displayBoardAndPlayer();
        var boardState = getBoardState();

        // Additional safety check
        if (!boardState) {
            return;
        }

        var bestMove = findBestMove(boardState, player);
        if (bestMove && bestMove.row !== -1 && bestMove.col !== -1) {
            updateBoard(bestMove.row.toString() + bestMove.col.toString());
        }
    }

    function findBestMove(board, player) {
        console.log("Current player: " + player); // Debug statement to show the value of the player variable

        // Check if special first-move strategy is enabled
        if (BotManager.enableFirstMoveStrategy) {
            var specialMove = getFirstMoveStrategyMove(board, player);
            if (specialMove) {
                console.log("Using first-move strategy: " + specialMove.row + "," + specialMove.col);
                BotManager.log('🎯 First-move strategy activated: (' + specialMove.row + ',' + specialMove.col + ')');
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

        console.log("The value of the best Move is: " + bestVal);
        return bestMove;
    }

    // Special first-move strategy: start middle, then diagonal to opponent's corner
    function getFirstMoveStrategyMove(board, player) {
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
            BotManager.log('First move strategy: Playing center (1,1)');
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
                    BotManager.log('First move strategy: Playing diagonal corner (' + diagonalCorner.row + ',' + diagonalCorner.col + ') opposite to opponent corner (' + opponentCorner.row + ',' + opponentCorner.col + ')');
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

    function displayBoardAndPlayer() {
        if (!isInGame()) {
            return;
        }

        var boardState = getBoardState();
        if (!boardState) {
            return;
        }

        console.log("Board State:");
        boardState.forEach(function(row) {
            console.log(row.join(' | '));
        });

        // Display opponent name in console
        displayOpponentName();
    }
    
    function displayOpponentName() {
        GM.getValue("username").then(function(username) {
            var profileOpeners = document.querySelectorAll(".text-truncate.cursor-pointer");
            var opponentName = null;

            profileOpeners.forEach(function(opener) {
                if (opener.textContent.trim() !== username) {
                    opponentName = opener.textContent.trim();
                }
            });

            if (opponentName) {
                console.log("Opponent: " + opponentName);

                // Enhanced opponent detection for auto-play with profile-based detection
                if (BotManager.isAutoPlayEnabled && BotManager.currentOpponentType === 'unknown') {
                    BotManager.log('Starting profile-based bot detection for: ' + opponentName);
                    BotManager.setThinking('Analyzing opponent: ' + opponentName, 'Performing profile-based bot detection');

                    // Use profile-based detection first
                    BotManager.performProfileNameDetection(opponentName, function(isBot, profileName) {
                        var detectedType;

                        if (isBot) {
                            detectedType = 'bot';
                            BotManager.log('Opponent classified as bot via profile detection: ' + opponentName, 'SUCCESS');
                        } else {
                            // Fall back to existing detection methods
                            detectedType = BotManager.detectOpponentType(opponentName, null);
                            BotManager.log('Profile detection inconclusive, using traditional detection: ' + opponentName + ' -> ' + detectedType);
                        }

                        BotManager.currentOpponentType = detectedType;
                        BotManager.currentGameCount = 0; // Reset game count for new opponent
                        BotManager.saveSettings();

                        BotManager.log('Final opponent classification: ' + opponentName + ' -> ' + detectedType, 'SUCCESS');

                        var maxGames = detectedType === 'bot' ? BotManager.gamesPerBot : BotManager.gamesPerHuman;
                        BotManager.setThinking('Opponent: ' + opponentName + ' (' + detectedType + ')', 'Will play ' + maxGames + ' game(s)');

                        // Start game tracking
                        if (!GameManager.gameInProgress) {
                            GameManager.startGame();
                        }
                    });
                }
            } else {
                console.log("Opponent name not found");
                // Debug: log all profile elements found
                BotManager.log('Profile elements found: ' + profileOpeners.length);
                profileOpeners.forEach(function(opener, index) {
                    BotManager.log('Profile ' + index + ': "' + opener.textContent.trim() + '"');
                });
            }
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

    // Game End Detection System
    var GameEndDetector = {
        lastBoardState: null,
        gameEndChecked: false,

        // Check if game has ended and determine result
        checkGameEnd: function() {
            if (!BotManager.isAutoPlayEnabled || !GameManager.gameInProgress || !isInGame()) return;

            var currentBoard = getBoardState();
            if (!currentBoard) return;

            var boardString = JSON.stringify(currentBoard);

            // Only check if board has changed
            if (this.lastBoardState === boardString) return;
            this.lastBoardState = boardString;

            var gameResult = this.analyzeGameResult(currentBoard);
            if (gameResult !== 'ongoing') {
                this.gameEndChecked = true;
                BotManager.log('Game end detected: ' + gameResult);
                GameManager.endGame(gameResult);
            }
        },

        // Analyze current board to determine game result
        analyzeGameResult: function(board) {
            var score = evaluateBoard(board);

            if (score === 10) {
                return 'win'; // AI won
            } else if (score === -10) {
                return 'loss'; // AI lost
            } else if (!areMovesLeft(board)) {
                return 'draw'; // Draw
            }

            // Check for game end UI elements
            var gameEndElements = [
                document.querySelector('.game-over'),
                document.querySelector('.winner'),
                document.querySelector('[class*="game-end"]'),
                document.querySelector('button[class*="play-again"]'),
                document.querySelector('button.btn.btn-secondary.mt-2.ng-star-inserted')
            ];

            for (var i = 0; i < gameEndElements.length; i++) {
                if (gameEndElements[i] && gameEndElements[i].style.display !== 'none') {
                    // Try to determine result from UI
                    var text = gameEndElements[i].textContent.toLowerCase();
                    if (text.includes('you win') || text.includes('victory')) {
                        return 'win';
                    } else if (text.includes('you lose') || text.includes('defeat')) {
                        return 'loss';
                    } else if (text.includes('draw') || text.includes('tie')) {
                        return 'draw';
                    } else if (text.includes('play again')) {
                        // Game ended, but result unclear - assume loss for safety
                        return 'loss';
                    }
                }
            }

            return 'ongoing';
        },

        // Reset for new game
        reset: function() {
            this.lastBoardState = null;
            this.gameEndChecked = false;
        }
    };

    // Enhanced main game loop with game end detection
    setInterval(function() {
        // Check if script is disabled due to payment/version issues
        if (isScriptDisabled()) {
            return; // Stop all script execution
        }

        initAITurn();
        GameEndDetector.checkGameEnd();
    }, 1000);

    // Initialize enhanced features on page load
    function initializeEnhancedFeatures() {
        BotManager.log('Enhanced Tic Tac Toe Bot initialized successfully!', 'SUCCESS');
        BotManager.log('Features: Smart play again logic, Bot/Human detection, Loss limiting, 24h operation', 'INFO');

        // Show welcome message for first-time users
        GM.getValue('firstTimeUser', true).then(function(isFirstTime) {
            if (isFirstTime) {
                setTimeout(function() {
                    var welcome = document.createElement('div');
                    welcome.style.position = 'fixed';
                    welcome.style.top = '50%';
                    welcome.style.left = '50%';
                    welcome.style.transform = 'translate(-50%, -50%)';
                    welcome.style.backgroundColor = '#2ecc71';
                    welcome.style.color = 'white';
                    welcome.style.padding = '20px';
                    welcome.style.borderRadius = '10px';
                    welcome.style.zIndex = '10003';
                    welcome.style.textAlign = 'center';
                    welcome.style.fontSize = '16px';
                    welcome.innerHTML = '🎮 Enhanced Tic Tac Toe Bot Ready!<br><br>' +
                                       '✅ Smart opponent detection<br>' +
                                       '✅ Intelligent play again logic<br>' +
                                       '✅ Loss limiting (5 max)<br>' +
                                       '✅ 24-hour safe operation<br><br>' +
                                       'Check the Settings panel to configure and start!';

                    document.body.appendChild(welcome);

                    setTimeout(function() {
                        if (welcome.parentNode) {
                            welcome.parentNode.removeChild(welcome);
                        }
                    }, 8000);
                }, 2000);

                GM.setValue('firstTimeUser', false);
            }
        });
    }

    // Debug function to find play online buttons
    function debugPlayOnlineButtons() {
        var allButtons = document.querySelectorAll('button');
        var playButtons = [];

        allButtons.forEach(function(button) {
            var text = button.textContent.toLowerCase();
            if (text.includes('play') || text.includes('online')) {
                playButtons.push({
                    text: button.textContent.trim(),
                    classes: button.className,
                    selector: button.tagName + (button.className ? '.' + button.className.split(' ').join('.') : '')
                });
            }
        });

        if (playButtons.length > 0) {
            BotManager.log('Found play buttons: ' + JSON.stringify(playButtons, null, 2));
        } else {
            BotManager.log('No play buttons found on page');
        }
    }

    // Debug function to find play again buttons
    function debugPlayAgainButtons() {
        BotManager.log('=== PLAY AGAIN BUTTON DEBUG ===');

        // Check the exact selector first
        var exactSelector = "body > app-root > app-navigation > div > div.d-flex.flex-column.h-100.w-100 > main > app-room > div > div > div.col-md-9.col-lg-8.bg-gray-000.h-100.position-relative.overflow-hidden.ng-tns-c1645232060-14 > div > div > div > app-re-match > div > button";
        var rematchButtons = document.querySelectorAll(exactSelector);

        BotManager.log('Rematch buttons found with exact selector: ' + rematchButtons.length);
        for (var i = 0; i < rematchButtons.length; i++) {
            var button = rematchButtons[i];
            BotManager.log('Rematch button ' + i + ': "' + button.textContent.trim() + '" (visible: ' + (button.offsetParent !== null) + ')');
        }

        // Check app-re-match container
        var rematchContainer = document.querySelector('app-re-match');
        BotManager.log('app-re-match container found: ' + !!rematchContainer);
        if (rematchContainer) {
            var containerButtons = rematchContainer.querySelectorAll('button');
            BotManager.log('Buttons in app-re-match: ' + containerButtons.length);
            for (var j = 0; j < containerButtons.length; j++) {
                BotManager.log('Container button ' + j + ': "' + containerButtons[j].textContent.trim() + '"');
            }
        }

        // Check all buttons with "again" text
        var allButtons = document.querySelectorAll('button');
        var againButtons = [];

        allButtons.forEach(function(button) {
            var text = button.textContent.toLowerCase();
            if (text.includes('again') || text.includes('rematch') || text.includes('play again')) {
                againButtons.push({
                    text: button.textContent.trim(),
                    classes: button.className,
                    visible: button.offsetParent !== null,
                    parentElement: button.parentElement ? button.parentElement.tagName : 'none'
                });
            }
        });

        BotManager.log('All "again/rematch" buttons found: ' + againButtons.length);
        againButtons.forEach(function(btn, index) {
            BotManager.log('Again button ' + index + ': ' + JSON.stringify(btn, null, 2));
        });

        // Check for new app-juicy-button structure
        var juicyButtons = document.querySelectorAll('app-juicy-button');
        BotManager.log('Found ' + juicyButtons.length + ' app-juicy-button components');

        for (var i = 0; i < juicyButtons.length; i++) {
            var juicy = juicyButtons[i];
            BotManager.log('App-juicy-button ' + i + ':');
            BotManager.log('  Text: "' + juicy.textContent.trim() + '"');
            BotManager.log('  Classes: ' + juicy.className);
            BotManager.log('  Visible: ' + (juicy.offsetParent !== null));
            BotManager.log('  HTML: ' + juicy.outerHTML.substring(0, 200) + '...');

            var innerButton = juicy.querySelector('button');
            if (innerButton) {
                BotManager.log('  Inner button classes: ' + innerButton.className);
                BotManager.log('  Inner button visible: ' + (innerButton.offsetParent !== null));
            }
        }

        // Check the specific legacy button class
        var specificButton = document.querySelector('button.btn.btn-secondary.mt-2.ng-star-inserted');
        if (specificButton) {
            BotManager.log('Found legacy button with exact class: "' + specificButton.textContent.trim() + '"');
            BotManager.log('Button HTML: ' + specificButton.outerHTML);
            BotManager.log('Button visible: ' + (specificButton.offsetParent !== null));
        } else {
            BotManager.log('Legacy button with class "btn.btn-secondary.mt-2.ng-star-inserted" NOT FOUND');
        }

        // Test the actual click function
        BotManager.log('=== TESTING CLICK FUNCTION ===');
        var clickResult = clickPlayAgainButton();
        BotManager.log('Click function result: ' + clickResult);

        BotManager.log('=== END PLAY AGAIN DEBUG ===');
    }

    // Debug function to check game state
    function debugGameState() {
        BotManager.log('=== GAME STATE DEBUG ===');
        BotManager.log('isInGame(): ' + isInGame());
        BotManager.log('GameManager.gameInProgress: ' + (GameManager ? GameManager.gameInProgress : 'undefined'));
        BotManager.log('BotManager.currentOpponentType: ' + BotManager.currentOpponentType);
        BotManager.log('BotManager.isAutoPlayEnabled: ' + BotManager.isAutoPlayEnabled);

        var gameBoard = document.querySelector('.grid.s-3x3');
        var ticTacToeBoard = document.getElementById('tic-tac-toe-board');
        BotManager.log('Game board found: ' + !!gameBoard);
        BotManager.log('Tic-tac-toe board found: ' + !!ticTacToeBoard);

        var profileOpeners = document.querySelectorAll(".text-truncate.cursor-pointer");
        BotManager.log('Profile elements found: ' + profileOpeners.length);

        profileOpeners.forEach(function(opener, index) {
            BotManager.log('Profile ' + index + ': "' + opener.textContent.trim() + '"');
        });

        var boardState = getBoardState();
        if (boardState) {
            BotManager.log('Board state: ' + JSON.stringify(boardState));
        } else {
            BotManager.log('Board state: null');
        }
        BotManager.log('=== END DEBUG ===');
    }

    // Initialize on page load
    setTimeout(initializeEnhancedFeatures, 1000);

    // Update settings UI after GM storage loads
    setTimeout(function() {
        BotManager.updateSettingsUI();
    }, 3000);

    // Debug play buttons after 5 seconds
    setTimeout(debugPlayOnlineButtons, 5000);

    // Debug game state every 10 seconds when auto-play is enabled
    setInterval(function() {
        // Check if script is disabled due to payment/version issues
        if (isScriptDisabled()) {
            return; // Stop all script execution
        }

        if (BotManager.isAutoPlayEnabled && BotManager.currentOpponentType === 'unknown') {
            debugGameState();
        }
    }, 10000);

    // Make debug functions available globally for manual testing
    window.debugTicTacToeBot = debugGameState;
    window.debugPlayAgainButtons = debugPlayAgainButtons;
    window.testLeaderboardCheck = function() {
        var result = BotManager.checkLeaderboardPosition();
        console.log('Leaderboard check result:', result);
        console.log('Settings - Enabled:', BotManager.enableLeaderboardCheck, 'Target Score:', BotManager.leaderboardStopPosition);
        if (result.score) {
            console.log('Current Score:', result.score, 'Target Score:', BotManager.leaderboardStopPosition);
        }
        return result;
    };
    
    // Debug function to check GM storage values
    window.checkGMStorage = function() {
        Promise.all([
            GM.getValue('username', 'not set'),
            GM.getValue('myUsername', 'not set')
        ]).then(function(values) {
            var usernameValue = values[0];
            var myUsernameValue = values[1];
            
            console.log('GM Storage Values:');
            console.log('username:', usernameValue);
            console.log('myUsername:', myUsernameValue);
            console.log('BotManager.myUsername:', BotManager.myUsername);
            
            alert('GM Storage Values:\n' +
                  'username: "' + usernameValue + '"\n' +
                  'myUsername: "' + myUsernameValue + '"\n' +
                  'BotManager.myUsername: "' + BotManager.myUsername + '"');
        });
    };

    // Manual test function for play again button
    window.testPlayAgainButton = function() {
        console.log('=== MANUAL PLAY AGAIN BUTTON TEST ===');

        // Test new app-juicy-button structure first
        var juicyButtons = document.querySelectorAll('app-juicy-button');
        console.log('Found ' + juicyButtons.length + ' app-juicy-button components');

        for (var i = 0; i < juicyButtons.length; i++) {
            var juicy = juicyButtons[i];
            var text = juicy.textContent.toLowerCase().trim();
            console.log('App-juicy-button ' + i + ' text: "' + text + '"');

            if (text.includes('play') && text.includes('again')) {
                console.log('✅ Found play again app-juicy-button');
                var innerButton = juicy.querySelector('button');
                if (innerButton) {
                    console.log('Clicking inner button...');
                    innerButton.click();
                    console.log('Click attempted on app-juicy-button');
                    return true;
                } else {
                    console.log('No inner button found, clicking component directly...');
                    juicy.click();
                    return true;
                }
            }
        }

        // Test the legacy button structure
        var exactButton = document.querySelector('button.btn.btn-secondary.mt-2.ng-star-inserted');
        if (exactButton) {
            console.log('✅ Found legacy button with exact class');
            console.log('Button text: "' + exactButton.textContent + '"');
            console.log('Button visible: ' + (exactButton.offsetParent !== null));

            // Try clicking it
            console.log('Attempting to click legacy button...');
            exactButton.click();
            console.log('Click attempted');
            return true;
        } else {
            console.log('❌ No app-juicy-button or legacy button found');

            // Search for any button with "play" and "again"
            var allButtons = document.querySelectorAll('button');
            console.log('Searching through ' + allButtons.length + ' buttons...');

            for (var i = 0; i < allButtons.length; i++) {
                var btn = allButtons[i];
                var btnText = btn.textContent.toLowerCase();
                if (btnText.includes('play') && btnText.includes('again')) {
                    console.log('Found alternative button: "' + btn.textContent + '"');
                    console.log('Classes: ' + btn.className);
                    btn.click();
                    return true;
                }
            }
            console.log('No suitable button found');
            return false;
        }
    };

    // Add bot name function
    window.addBotName = function(name) {
        if (BotManager.addKnownBot(name)) {
            BotManager.log('Added "' + name + '" to bot list', 'SUCCESS');
        } else {
            BotManager.log('"' + name + '" already in bot list', 'INFO');
        }
    };

    // Force opponent detection based on debug output
    window.forceOpponentDetection = function() {
        GM.getValue("username").then(function(username) {
            var profileOpeners = document.querySelectorAll(".text-truncate.cursor-pointer");
            BotManager.log('Force detection: Found ' + profileOpeners.length + ' profiles');

            profileOpeners.forEach(function(opener) {
                var name = opener.textContent.trim();
                BotManager.log('Checking profile: "' + name + '"');

                if (name !== username && name.length > 0) {
                    var detectedType = BotManager.detectOpponentType(name, null);
                    BotManager.currentOpponentType = detectedType;
                    BotManager.currentGameCount = 0;
                    BotManager.saveSettings();

                    BotManager.log('FORCED opponent detection: ' + name + ' -> ' + detectedType, 'SUCCESS');

                    if (!GameManager.gameInProgress) {
                        GameManager.startGame();
                        BotManager.log('Game started after forced detection');
                    }
                }
            });
        });
    };

    // Auto-trigger opponent detection if we see the right conditions
    setTimeout(function() {
        if (BotManager.isAutoPlayEnabled && BotManager.currentOpponentType === 'unknown') {
            var gameBoard = document.querySelector('.grid.s-3x3');
            var profiles = document.querySelectorAll(".text-truncate.cursor-pointer");

            if (gameBoard && profiles.length >= 2) {
                BotManager.log('Auto-triggering opponent detection...');
                forceOpponentDetection();
            }
        }
    }, 3000);

    // Verify all components are loaded correctly
    setTimeout(function() {
        if (typeof BotManager !== 'undefined' &&
            typeof GameManager !== 'undefined' &&
            typeof GameEndDetector !== 'undefined' &&
            typeof SafetyManager !== 'undefined') {
            BotManager.log('All components loaded successfully!', 'SUCCESS');
        } else {
            console.error('Some components failed to load properly');
        }
    }, 2000);

    // Auto-Play System - Monitor for play online button and game states
    setInterval(function() {
        // Check if script is disabled due to payment/version issues
        if (isScriptDisabled()) {
            return; // Stop all script execution
        }

        if (!BotManager.isAutoPlayEnabled) {
            BotManager.setThinking('Auto-play disabled', 'Waiting for activation');
            return;
        }

        if (!isInGame()) {
            // Not in a game - reset game state if needed
            if (GameManager.gameInProgress) {
                GameManager.gameInProgress = false;
                GameEndDetector.reset();
                BotManager.currentOpponentType = 'unknown'; // Reset opponent detection
                BotManager.log('Game ended - left game area');
            }

            BotManager.setThinking('Looking for game', 'Searching for play online button');

            // Check if we should automatically click play online
            var playOnlineSelectors = [
                "button.btn-secondary.flex-grow-1",
                "body > app-root > app-navigation > div.d-flex.h-100 > div.d-flex.flex-column.h-100.w-100 > main > app-game-landing > div > div > div > div.col-12.col-lg-9.dashboard > div.card.area-buttons.d-flex.justify-content-center.align-items-center.flex-column > button.btn.btn-secondary.btn-lg.position-relative",
                "button.btn.btn-secondary.btn-lg.position-relative"
            ];

            for (var i = 0; i < playOnlineSelectors.length; i++) {
                var playButton = document.querySelector(playOnlineSelectors[i]);
                if (playButton && playButton.textContent.toLowerCase().includes('play')) {
                    // Check leaderboard position before clicking
                    var leaderboardCheck = BotManager.checkLeaderboardPosition();
                    if (leaderboardCheck.shouldStop) {
                        BotManager.log('Leaderboard position ' + leaderboardCheck.position + ' reached target score ' + leaderboardCheck.score + '. Stopping auto-play.');
                        BotManager.isAutoPlayEnabled = false;
                        BotManager.saveSettings();
                        BotManager.showLeaderboardStopNotification(leaderboardCheck.position, leaderboardCheck.score);
                        return;
                    }

                    BotManager.setThinking('Play button found', 'Will click in 2 seconds');
                    // Wait a bit before clicking to avoid spam
                    setTimeout(function() {
                        if (BotManager.isAutoPlayEnabled && !isInGame()) {
                            BotManager.setThinking('Clicking play online', 'Joining matchmaking');
                            clickPlayOnlineButton();
                        }
                    }, 2000);
                    break;
                }
            }
            return;
        }

        // We're in a game - try to detect opponent and start game
        if (BotManager.currentOpponentType === 'unknown') {
            BotManager.setThinking('In game - detecting opponent', 'Scanning player profiles');
            displayOpponentName(); // Force opponent detection
        }

        var boardState = getBoardState();
        if (!boardState) return;

        var isEmpty = boardState.every(function(row) {
            return row.every(function(cell) {
                return cell === '_';
            });
        });

        if (isEmpty && !GameEndDetector.gameEndChecked && !GameManager.gameInProgress) {
            // New game detected - start it even if opponent unknown for now
            BotManager.setThinking('New game detected', 'Starting game logic');
            GameManager.startGame();
            BotManager.log('New game started (opponent detection in progress)');
        }
    }, 2000);

    // Aggressive opponent detection system - DISABLED to avoid conflicts with enhanced detection
    // The profile-based detection is now handled in the main game monitoring loop above
    // This entire section has been disabled to prevent duplicate detection

    /*
    // DISABLED CODE BLOCK - DO NOT UNCOMMENT
    setInterval(function() {
        // This detection system has been replaced by the enhanced profile-based detection above
        // Keeping this commented out to prevent conflicts and duplicate detection
    }, 1000);
    */

    document.addEventListener('DOMContentLoaded', function() {
        initGame();
    });
})();