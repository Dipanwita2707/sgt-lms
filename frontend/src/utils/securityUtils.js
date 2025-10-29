/**
 * Security utilities for quiz environment validation
 */

/**
 * Attempts to disable Chrome extensions by opening quiz in incognito-like mode
 * @returns {Promise<boolean>} Success status
 */
export const disableBrowserExtensions = async () => {
  try {
    // Method 1: Request to open in incognito mode (extensions disabled by default)
    if (navigator.userAgent.includes('Chrome')) {
      // Create a link to open current page in incognito mode
      const currentUrl = window.location.href;
      const incognitoUrl = `chrome://incognito/${currentUrl}`;
      
      // Try to detect if we're already in incognito mode
      const isIncognito = await detectIncognitoMode();
      
      if (!isIncognito) {
        // Show warning about extensions
        console.warn('🔒 Extensions may be active. For maximum security, please:');
        console.warn('1. Open quiz in Incognito/Private mode');
        console.warn('2. Or disable all extensions manually');
        
        return false;
      }
    }
    
    // Method 2: Detect and warn about active extensions
    const extensionCheck = detectChromeExtensions();
    if (extensionCheck.detected.length > 0) {
      console.warn('🚨 Browser extensions detected:', extensionCheck.detected);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Extension disable check failed:', error);
    return false;
  }
};

/**
 * Detects if browser is in incognito/private mode
 * @returns {Promise<boolean>} True if in incognito mode
 */
export const detectIncognitoMode = () => {
  return new Promise((resolve) => {
    // Chrome detection
    if (navigator.userAgent.includes('Chrome')) {
      const fs = window.RequestFileSystem || window.webkitRequestFileSystem;
      if (fs) {
        fs(window.TEMPORARY, 100, resolve.bind(null, false), resolve.bind(null, true));
      } else {
        resolve(false);
      }
    }
    // Firefox detection
    else if (navigator.userAgent.includes('Firefox')) {
      const db = indexedDB.open('test');
      db.onerror = () => resolve(true);
      db.onsuccess = () => resolve(false);
    }
    // Safari detection
    else if (navigator.userAgent.includes('Safari')) {
      try {
        localStorage.setItem('test', '1');
        localStorage.removeItem('test');
        resolve(false);
      } catch (e) {
        resolve(true);
      }
    } else {
      resolve(false);
    }
  });
};

/**
 * Detects remote connection software and screen sharing applications
 * @returns {Object} Detection results
 */
export const detectRemoteConnections = () => {
  const detectedRemoteApps = [];
  const suspiciousActivity = [];
  
  try {
    // Method 1: Check for remote desktop software indicators
    const remoteDesktopIndicators = [
      // TeamViewer detection
      () => {
        return document.title.includes('TeamViewer') ||
               window.location.href.includes('teamviewer') ||
               document.querySelector('[class*="teamviewer"]') ||
               document.querySelector('[id*="teamviewer"]') ||
               navigator.userAgent.includes('TeamViewer');
      },
      
      // AnyDesk detection
      () => {
        return document.title.includes('AnyDesk') ||
               window.location.href.includes('anydesk') ||
               document.querySelector('[class*="anydesk"]') ||
               document.querySelector('[id*="anydesk"]') ||
               navigator.userAgent.includes('AnyDesk');
      },
      
      // Chrome Remote Desktop detection
      () => {
        return document.title.includes('Chrome Remote Desktop') ||
               window.location.href.includes('remotedesktop.google.com') ||
               document.querySelector('[class*="remote-desktop"]') ||
               document.querySelector('[aria-label*="remote"]');
      },
      
      // Windows RDP detection
      () => {
        return navigator.userAgent.includes('Remote Desktop') ||
               document.title.includes('Remote Desktop Connection') ||
               window.screen.width === 1024 && window.screen.height === 768; // Common RDP resolution
      },
      
      // VNC detection
      () => {
        return document.title.includes('VNC') ||
               window.location.href.includes('vnc') ||
               navigator.userAgent.includes('VNC') ||
               document.querySelector('[class*="vnc"]');
      },
      
      // Generic remote session detection
      () => {
        const suspiciousPatterns = ['remote', 'desktop', 'viewer', 'session', 'share', 'connect'];
        const title = document.title.toLowerCase();
        const url = window.location.href.toLowerCase();
        
        return suspiciousPatterns.some(pattern => 
          title.includes(pattern) || url.includes(pattern)
        );
      }
    ];
    
    remoteDesktopIndicators.forEach((test, index) => {
      try {
        if (test()) {
          detectedRemoteApps.push({
            type: 'remote-desktop',
            method: `detection-method-${index + 1}`,
            confidence: 'high',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.warn(`Remote desktop detection method ${index + 1} failed:`, error);
      }
    });
    
    // Method 2: Check for screen sharing indicators
    const screenSharingChecks = [
      // Check if screen is being captured
      () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          // This is indirect - we can't directly detect if screen is being shared
          // But we can check for suspicious screen dimensions
          const ratio = window.screen.width / window.screen.height;
          return ratio < 1.2 || ratio > 2.5; // Unusual aspect ratios might indicate sharing
        }
        return false;
      },
      
      // Check for multiple monitor setup (common in remote scenarios)
      () => {
        return window.screen.availWidth !== window.screen.width ||
               window.screen.availHeight !== window.screen.height;
      },
      
      // Check for virtualized environment indicators
      () => {
        const userAgent = navigator.userAgent;
        const virtualizedIndicators = [
          'VirtualBox', 'VMware', 'QEMU', 'Xen', 'Hyper-V', 
          'Parallels', 'VirtualPC', 'Docker'
        ];
        return virtualizedIndicators.some(indicator => userAgent.includes(indicator));
      }
    ];
    
    screenSharingChecks.forEach((test, index) => {
      try {
        if (test()) {
          suspiciousActivity.push({
            type: 'screen-sharing-indicator',
            method: `sharing-detection-${index + 1}`,
            confidence: 'medium',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.warn(`Screen sharing detection method ${index + 1} failed:`, error);
      }
    });
    
    // Method 3: Performance-based detection
    const performanceIndicators = () => {
      const start = performance.now();
      for (let i = 0; i < 100000; i++) {
        Math.random();
      }
      const end = performance.now();
      const executionTime = end - start;
      
      // If execution is unusually slow, might indicate remote session
      return executionTime > 50; // Threshold for suspicious performance
    };
    
    if (performanceIndicators()) {
      suspiciousActivity.push({
        type: 'performance-degradation',
        method: 'execution-time-test',
        confidence: 'low',
        timestamp: new Date()
      });
    }
    
  } catch (error) {
    console.error('Remote connection detection failed:', error);
  }
  
  return {
    remoteDesktopDetected: detectedRemoteApps.length > 0,
    screenSharingPossible: suspiciousActivity.length > 0,
    detectedRemoteApps,
    suspiciousActivity,
    confidence: detectedRemoteApps.length > 0 ? 'high' : 
                suspiciousActivity.length > 0 ? 'medium' : 'low'
  };
};

/**
 * Detects if Chrome extensions are active by checking for common extension artifacts
 * @returns {Object} Detection results
 */
export const detectChromeExtensions = () => {
  const detectedExtensions = [];
  const warnings = [];
  const blockedExtensions = []; // Extensions that must be disabled for quiz security
  
  try {
    // Method 1: Detect problematic extensions that interfere with focus/tab detection
    const problematicExtensions = [
      {
        name: 'Always Active Window',
        indicators: [
          () => window.alwaysActiveWindow !== undefined,
          () => document.querySelector('[data-extension="always-active-window"]'),
          () => window.navigator.userAgent.includes('AlwaysActiveWindow'),
          () => {
            // Test if window focus events are being artificially triggered
            let focusCount = 0;
            const testHandler = () => focusCount++;
            window.addEventListener('focus', testHandler);
            window.dispatchEvent(new Event('blur'));
            window.dispatchEvent(new Event('focus'));
            window.removeEventListener('focus', testHandler);
            return focusCount > 1; // Abnormal focus event behavior
          },
          () => {
            // Check for Always Active Window specific DOM elements
            const elements = document.querySelectorAll('*');
            for (let el of elements) {
              if (el.id && el.id.toLowerCase().includes('always') && el.id.toLowerCase().includes('active')) {
                return true;
              }
              if (el.className && el.className.toLowerCase().includes('always-active')) {
                return true;
              }
            }
            return false;
          },
          () => {
            // Check for modified setTimeout/setInterval behavior
            const originalSetTimeout = window.setTimeout.toString();
            const originalSetInterval = window.setInterval.toString();
            return !originalSetTimeout.includes('[native code]') || 
                   !originalSetInterval.toString().includes('[native code]') ||
                   originalSetTimeout.includes('active') ||
                   originalSetInterval.includes('active');
          },
          () => {
            // Test if page visibility API is being overridden
            try {
              const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
              return descriptor && descriptor.get && !descriptor.get.toString().includes('[native code]');
            } catch (e) {
              return false;
            }
          },
          () => {
            // Direct Always Active Window behavior test
            const directTest = directAlwaysActiveWindowTest();
            return directTest.detected && directTest.confidence !== 'low';
          }
        ],
        severity: 'CRITICAL',
        reason: 'Prevents proper tab switching and window focus detection during quiz'
      },
      {
        name: 'Stay Alive',
        indicators: [
          () => window.stayAlive !== undefined,
          () => document.querySelector('[id*="stay-alive"]'),
          () => window.setInterval.toString().includes('stayalive')
        ],
        severity: 'CRITICAL', 
        reason: 'Keeps tabs artificially active, interfering with quiz monitoring'
      },
      {
        name: 'Tab Suspender Blockers',
        indicators: [
          () => window.noSleep !== undefined,
          () => document.querySelector('[class*="nosleep"]'),
          () => window.navigator.wakeLock !== undefined
        ],
        severity: 'HIGH',
        reason: 'May interfere with proper tab activity detection'
      }
    ];

    // Check for each problematic extension
    problematicExtensions.forEach(ext => {
      const detected = ext.indicators.some(indicator => {
        try {
          return indicator();
        } catch (e) {
          return false;
        }
      });
      
      if (detected) {
        detectedExtensions.push(`${ext.name} (${ext.severity} RISK)`);
        blockedExtensions.push({
          name: ext.name,
          severity: ext.severity,
          reason: ext.reason
        });
        warnings.push(`${ext.name} detected - this extension MUST be disabled to take the quiz`);
      }
    });

    // Method 2: Check for modified global objects commonly used by extensions
    const globalChecks = [
      'webkitNotifications',
      'chrome.runtime', 
      'chrome.storage',
      'chrome.tabs',
      'chrome.webRequest'
    ];
    
    globalChecks.forEach(prop => {
      const obj = prop.includes('.') ? 
        prop.split('.').reduce((o, p) => o && o[p], window) : 
        window[prop];
      if (obj) {
        detectedExtensions.push(`Global object detected: ${prop}`);
      }
    });

    // Method 2: Check for extension-injected script tags
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src && script.src.includes('chrome-extension://')) {
        detectedExtensions.push(`Extension script: ${script.src.substring(0, 50)}...`);
      }
    });

    // Method 3: Check for extension-injected DOM elements
    const extensionElements = document.querySelectorAll('[id*="extension"], [class*="extension"], [data-extension]');
    if (extensionElements.length > 0) {
      detectedExtensions.push(`Extension DOM elements: ${extensionElements.length} found`);
    }

    // Method 4: Test for focus/visibility API manipulation
    const focusManipulationTest = () => {
      // Test if document.hidden and document.visibilityState are being manipulated
      const originalHidden = document.hidden;
      const originalVisibilityState = document.visibilityState;
      
      // Simulate tab switch
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      
      // Check if values are being overridden
      const isManipulated = (document.hidden === false || document.visibilityState === 'visible');
      
      // Restore original values
      Object.defineProperty(document, 'hidden', { value: originalHidden, configurable: true });
      Object.defineProperty(document, 'visibilityState', { value: originalVisibilityState, configurable: true });
      
      return isManipulated;
    };

    if (focusManipulationTest()) {
      detectedExtensions.push('Focus/Visibility API manipulation detected');
      blockedExtensions.push({
        name: 'Focus Manipulation Extension',
        severity: 'CRITICAL',
        reason: 'Prevents detection of tab switching and window minimizing'
      });
      warnings.push('Extension detected that manipulates window focus - MUST be disabled');
    }

    // Method 5: Check for common ad blocker/security extension artifacts
    const adBlockerTests = [
      () => {
        const testAd = document.createElement('div');
        testAd.innerHTML = '&nbsp;';
        testAd.className = 'adsbox';
        testAd.style.position = 'absolute';
        testAd.style.left = '-10000px';
        document.body.appendChild(testAd);
        const blocked = testAd.offsetHeight === 0;
        document.body.removeChild(testAd);
        return blocked;
      }
    ];

    adBlockerTests.forEach((test, index) => {
      try {
        if (test()) {
          detectedExtensions.push(`Ad blocker detected (test ${index + 1})`);
        }
      } catch (e) {
        // Ignore test errors
      }
    });

    // Method 6: Check for developer tools extensions
    const devToolsCheck = () => {
      const threshold = 160;
      return window.outerHeight - window.innerHeight > threshold ||
             window.outerWidth - window.innerWidth > threshold;
    };

    if (devToolsCheck()) {
      detectedExtensions.push('Developer tools or extensions affecting window size');
    }

    // Method 7: Check for content script modifications
    const originalConsole = console;
    if (originalConsole.log.toString().includes('native code') === false) {
      detectedExtensions.push('Console object has been modified (possible extension)');
    }

    // Generate warnings based on detections
    if (detectedExtensions.length > 0) {
      warnings.push('Browser extensions detected that may interfere with quiz security');
      warnings.push('Please disable all extensions and refresh the page before starting');
    }

    // Add specific warnings for blocked extensions
    if (blockedExtensions.length > 0) {
      warnings.push('CRITICAL: Extensions detected that MUST be disabled:');
      blockedExtensions.forEach(ext => {
        warnings.push(`• ${ext.name}: ${ext.reason}`);
      });
      warnings.push('Quiz access will be BLOCKED until these extensions are disabled');
    }

    return {
      extensionsDetected: detectedExtensions.length > 0,
      count: detectedExtensions.length,
      details: detectedExtensions,
      warnings: warnings,
      blockedExtensions: blockedExtensions,
      canProceedToQuiz: blockedExtensions.length === 0, // Block quiz if critical extensions detected
      riskLevel: blockedExtensions.length > 0 ? 'critical' : 
                detectedExtensions.length > 3 ? 'high' : 
                detectedExtensions.length > 1 ? 'medium' : 
                detectedExtensions.length > 0 ? 'low' : 'none'
    };

  } catch (error) {
    console.error('Extension detection failed:', error);
    return {
      extensionsDetected: false,
      count: 0,
      details: [],
      warnings: ['Unable to verify extension status'],
      riskLevel: 'unknown'
    };
  }
};

/**
 * Validates the browser environment for quiz security
 * @returns {Object} Environment validation results
 */
export const validateBrowserEnvironment = () => {
  const issues = [];
  const recommendations = [];

  try {
    // Check if running in incognito/private mode
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        if (estimate.quota < 120000000) { // Less than ~120MB suggests incognito
          issues.push('Browser appears to be in private/incognito mode');
          recommendations.push('Use regular browsing mode for better security validation');
        }
      });
    }

    // Check for automation tools
    if (navigator.webdriver) {
      issues.push('Automated browser detected (WebDriver)');
      recommendations.push('Use a regular browser without automation tools');
    }

    // Check for unusual navigator properties
    const suspiciousProps = [
      'phantom', 'callPhantom', '__phantomas', '_phantom',
      'Buffer', 'emit', 'spawn'
    ];

    suspiciousProps.forEach(prop => {
      if (window[prop] || navigator[prop]) {
        issues.push(`Suspicious property detected: ${prop}`);
        recommendations.push('Browser environment may be compromised');
      }
    });

    // Check screen resolution (very small resolutions might indicate automation)
    if (screen.width < 800 || screen.height < 600) {
      issues.push('Unusually small screen resolution detected');
      recommendations.push('Use a standard screen resolution');
    }

    // Check for headless browser indicators
    if (navigator.userAgent.includes('HeadlessChrome') || 
        navigator.userAgent.includes('PhantomJS') ||
        window.outerWidth === 0 || window.outerHeight === 0) {
      issues.push('Headless browser detected');
      recommendations.push('Use a regular browser with GUI');
    }

    // Check timezone
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!timezone || timezone === 'UTC') {
        issues.push('Unusual timezone settings detected');
      }
    } catch (e) {
      issues.push('Unable to verify timezone settings');
    }

    return {
      isValid: issues.length === 0,
      issues: issues,
      recommendations: recommendations,
      riskLevel: issues.length > 2 ? 'high' : 
                issues.length > 0 ? 'medium' : 'low'
    };

  } catch (error) {
    console.error('Browser environment validation failed:', error);
    return {
      isValid: false,
      issues: ['Browser environment validation failed'],
      recommendations: ['Please use a supported browser'],
      riskLevel: 'high'
    };
  }
};

/**
 * Creates a security report combining all checks
 * @returns {Promise<Object>} Complete security assessment
 */
export const createSecurityReport = async () => {
  const extensionCheck = detectChromeExtensions();
  const environmentCheck = validateBrowserEnvironment();
  const realTimeTest = await performRealTimeTabSwitchTest();
  const directTest = directAlwaysActiveWindowTest();
  
  // If direct test shows high confidence detection, add it as a blocked extension
  if (directTest.detected && (directTest.confidence === 'high' || directTest.confidence === 'very-high')) {
    extensionCheck.blockedExtensions.push({
      name: 'Always Active Window (Direct Detection)',
      severity: 'CRITICAL',
      reason: 'Direct behavioral test confirmed extension interference',
      evidence: directTest.evidence,
      confidence: directTest.confidence
    });
    extensionCheck.warnings.push('CRITICAL: Always Active Window extension detected via direct testing');
    extensionCheck.riskLevel = 'critical';
    extensionCheck.canProceedToQuiz = false;
  }
  
  // If real-time test shows interference, add it as a blocked extension
  if (realTimeTest.extensionInterference) {
    extensionCheck.blockedExtensions.push({
      name: 'Tab Switching Interference Extension',
      severity: 'CRITICAL',
      reason: 'Real-time test detected extension interference with tab switching detection'
    });
    extensionCheck.warnings.push('CRITICAL: Real-time test detected extension interference');
    extensionCheck.riskLevel = 'critical';
    extensionCheck.canProceedToQuiz = false;
  }
  
  const overallRisk = extensionCheck.riskLevel === 'critical' ? 'critical' :
    [extensionCheck.riskLevel, environmentCheck.riskLevel]
    .includes('high') ? 'high' : 
    [extensionCheck.riskLevel, environmentCheck.riskLevel]
    .includes('medium') ? 'medium' : 'low';

  const canProceed = extensionCheck.canProceedToQuiz && 
                    environmentCheck.isValid && 
                    overallRisk !== 'critical' &&
                    realTimeTest.overallWorking &&
                    !(directTest.detected && directTest.confidence !== 'low');

  return {
    timestamp: new Date().toISOString(),
    extensions: extensionCheck,
    environment: environmentCheck,
    realTimeTest: realTimeTest,
    directTest: directTest,
    overallRisk: overallRisk,
    blockedExtensions: extensionCheck.blockedExtensions || [],
    canProceed: canProceed,
    blockingReason: !canProceed ? (
      extensionCheck.blockedExtensions?.length > 0 ? 
      'Critical extensions detected that prevent quiz security' :
      realTimeTest.extensionInterference ?
      'Real-time test detected tab switching interference' :
      directTest.detected ?
      'Direct test detected Always Active Window extension' :
      'Environment validation failed'
    ) : null,
    recommendations: [
      ...extensionCheck.warnings,
      ...environmentCheck.recommendations,
      ...(realTimeTest.extensionInterference ? [
        'Disable browser extensions that interfere with tab switching detection',
        'Common problematic extensions: Always Active Window, Stay Alive, NoSleep'
      ] : []),
      ...(directTest.detected && directTest.confidence !== 'low' ? [
        'Always Active Window extension detected - MUST be disabled',
        'Go to Chrome Extensions (chrome://extensions/) and disable Always Active Window',
        'Refresh this page after disabling the extension'
      ] : [])
    ]
  };
};

/**
 * Continuously monitors for extension activity during quiz
 * @param {Function} onViolation Callback when violation detected
 * @returns {Function} Cleanup function
 */
export const startSecurityMonitoring = (onViolation) => {
  const violations = [];
  
  // Monitor for new script injections
  const scriptObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'SCRIPT' && node.src && 
            node.src.includes('chrome-extension://')) {
          const violation = {
            type: 'script_injection',
            details: 'Extension script injected during quiz',
            timestamp: new Date().toISOString()
          };
          violations.push(violation);
          onViolation(violation);
        }
      });
    });
  });

  scriptObserver.observe(document.head, { childList: true, subtree: true });
  scriptObserver.observe(document.body, { childList: true, subtree: true });

  // Monitor for DOM modifications that might indicate extension activity
  const domObserver = new MutationObserver((mutations) => {
    let suspiciousChanges = 0;
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && ( // Element node
              node.className?.includes('extension') ||
              node.id?.includes('extension') ||
              node.getAttribute?.('data-extension')
            )) {
            suspiciousChanges++;
          }
        });
      }
    });

    if (suspiciousChanges > 2) {
      const violation = {
        type: 'dom_manipulation',
        details: `Suspicious DOM changes detected: ${suspiciousChanges}`,
        timestamp: new Date().toISOString()
      };
      violations.push(violation);
      onViolation(violation);
    }
  });

  domObserver.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: true,
    attributeFilter: ['class', 'id', 'data-extension']
  });

  // Cleanup function
  return () => {
    scriptObserver.disconnect();
    domObserver.disconnect();
    return violations;
  };
};

/**
 * Bypass-resistant tab switching detection that works even with Always Active Window extension
 * Uses multiple detection methods that are harder for extensions to block
 * @param {Function} onTabSwitch Callback when tab switch is detected
 * @returns {Function} Cleanup function
 */
export const startBypassResistantTabDetection = (onTabSwitch) => {
  const detectionMethods = [];
  let isActive = true;
  let lastActiveTime = Date.now();
  let activityCheckInterval;
  let mouseMovementTimeout;
  let keyboardActivityTimeout;
  
  // Method 1: Mouse movement tracking
  let mouseMovementDetected = false;
  const mouseHandler = () => {
    mouseMovementDetected = true;
    lastActiveTime = Date.now();
    clearTimeout(mouseMovementTimeout);
    mouseMovementTimeout = setTimeout(() => {
      mouseMovementDetected = false;
    }, 2000);
  };
  
  // Method 2: Enhanced keyboard activity tracking with system key detection
  let keyboardActivityDetected = false;
  let altPressed = false;
  let winPressed = false;
  
  const keyboardHandler = (event) => {
    keyboardActivityDetected = true;
    lastActiveTime = Date.now();
    
    // Detect system navigation keys
    const key = event.key;
    const keyCode = event.keyCode || event.which;
    const isKeyDown = event.type === 'keydown';
    
    // Track Alt key state
    if (key === 'Alt' || keyCode === 18) {
      altPressed = isKeyDown;
      if (isKeyDown) {
        console.log('🔍 Alt key detected - monitoring for Alt+Tab');
      }
    }
    
    // Track Windows/Meta key state
    if (key === 'Meta' || key === 'OS' || keyCode === 91 || keyCode === 92) {
      winPressed = isKeyDown;
      if (isKeyDown) {
        console.log('🔍 Windows key detected - monitoring for system navigation');
        // Windows key press often indicates system navigation
        setTimeout(() => {
          if (document.hidden || !document.hasFocus()) {
            console.log('🚨 Windows key navigation detected');
            onTabSwitch({
              method: 'windows-key-navigation',
              evidence: 'Windows key pressed followed by focus loss',
              confidence: 'high'
            });
          }
        }, 100);
      }
    }
    
    // Detect Alt+Tab combination
    if (altPressed && key === 'Tab') {
      console.log('🚨 Alt+Tab detected!');
      event.preventDefault(); // Try to prevent the action
      onTabSwitch({
        method: 'alt-tab-detected',
        evidence: 'Alt+Tab key combination pressed',
        confidence: 'very-high'
      });
      return false;
    }
    
    // Detect other suspicious key combinations
    if (event.ctrlKey && event.shiftKey && key === 'Tab') {
      console.log('🚨 Ctrl+Shift+Tab detected!');
      event.preventDefault();
      onTabSwitch({
        method: 'ctrl-shift-tab',
        evidence: 'Ctrl+Shift+Tab key combination pressed',
        confidence: 'very-high'
      });
      return false;
    }
    
    // Detect F11 (fullscreen toggle)
    if (key === 'F11' || keyCode === 122) {
      console.log('🚨 F11 (fullscreen toggle) detected!');
      setTimeout(() => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && !document.msFullscreenElement) {
          onTabSwitch({
            method: 'fullscreen-exit',
            evidence: 'F11 pressed - exited fullscreen mode',
            confidence: 'high'
          });
        }
      }, 100);
    }
    
    // Detect Escape in fullscreen (potential exit attempt)
    if (key === 'Escape' && (document.fullscreenElement || document.webkitFullscreenElement || 
                             document.mozFullScreenElement || document.msFullscreenElement)) {
      console.log('🚨 Escape in fullscreen detected!');
      setTimeout(() => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && !document.msFullscreenElement) {
          onTabSwitch({
            method: 'escape-fullscreen-exit',
            evidence: 'Escape pressed - exited fullscreen mode',
            confidence: 'high'
          });
        }
      }, 100);
    }
    
    clearTimeout(keyboardActivityTimeout);
    keyboardActivityTimeout = setTimeout(() => {
      keyboardActivityDetected = false;
      altPressed = false;
      winPressed = false;
    }, 2000);
  };
  
  // Method 3: Page focus tracking using requestAnimationFrame
  let animationFrameActive = true;
  let lastFrameTime = Date.now();
  
  const frameTracker = () => {
    if (!isActive) return;
    
    const now = Date.now();
    const timeSinceLastFrame = now - lastFrameTime;
    
    // If animation frame interval is too long, tab might be hidden
    if (timeSinceLastFrame > 100) { // Normal frame interval should be ~16ms
      console.log('🎬 Animation frame gap detected:', timeSinceLastFrame + 'ms');
      if (timeSinceLastFrame > 2000) {
        onTabSwitch({
          method: 'animation-frame',
          evidence: `Frame gap: ${timeSinceLastFrame}ms`,
          confidence: 'medium'
        });
      }
    }
    
    lastFrameTime = now;
    requestAnimationFrame(frameTracker);
  };
  
  // Method 4: Performance timing analysis
  let performanceCheckInterval;
  const performanceCheck = () => {
    if (!isActive) return;
    
    const now = performance.now();
    const timeSinceActivity = Date.now() - lastActiveTime;
    
    // If no user activity for a while, likely tab switch
    if (timeSinceActivity > 3000 && !mouseMovementDetected && !keyboardActivityDetected) {
      console.log('🕒 Prolonged inactivity detected:', timeSinceActivity + 'ms');
      onTabSwitch({
        method: 'inactivity',
        evidence: `No activity for ${timeSinceActivity}ms`,
        confidence: 'low'
      });
    }
  };
  
  // Method 5: Document state polling (bypasses event blocking)
  let documentStateInterval;
  let lastDocumentState = {
    hasFocus: document.hasFocus(),
    hidden: document.hidden,
    visibilityState: document.visibilityState
  };
  
  const documentStatePoller = () => {
    if (!isActive) return;
    
    const currentState = {
      hasFocus: document.hasFocus(),
      hidden: document.hidden,
      visibilityState: document.visibilityState
    };
    
    // Check for state changes that indicate tab switching
    if (currentState.hasFocus !== lastDocumentState.hasFocus) {
      console.log('📋 Document focus change detected:', currentState.hasFocus);
      if (!currentState.hasFocus) {
        onTabSwitch({
          method: 'document-focus',
          evidence: 'Document lost focus',
          confidence: 'high'
        });
      }
    }
    
    if (currentState.hidden !== lastDocumentState.hidden) {
      console.log('👁️ Document hidden state change:', currentState.hidden);
      if (currentState.hidden) {
        onTabSwitch({
          method: 'document-hidden',
          evidence: 'Document became hidden',
          confidence: 'high'
        });
      }
    }
    
    lastDocumentState = currentState;
  };
  
  // Method 6: Network request timing (tabs often pause network activity)
  let networkTestInterval;
  const networkActivityTest = () => {
    if (!isActive) return;
    
    const startTime = performance.now();
    
    // Make a small request to test network timing
    fetch('data:text/plain,test', { method: 'HEAD' })
      .then(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // If request takes unusually long, tab might be throttled
        if (duration > 50) {
          console.log('🌐 Network request delay detected:', duration + 'ms');
          onTabSwitch({
            method: 'network-timing',
            evidence: `Request delay: ${duration}ms`,
            confidence: 'low'
          });
        }
      })
      .catch(() => {
        // Ignore network errors
      });
  };
  
  // Method 7: Intersection Observer (detects when page elements become invisible)
  let intersectionObserver;
  const setupIntersectionObserver = () => {
    // Create a hidden element to observe
    const observedElement = document.createElement('div');
    observedElement.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(observedElement);
    
    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting && isActive) {
          console.log('👀 Intersection observer: element not visible');
          onTabSwitch({
            method: 'intersection-observer',
            evidence: 'Page elements not intersecting viewport',
            confidence: 'medium'
          });
        }
      });
    });
    
    intersectionObserver.observe(observedElement);
    
    return () => {
      intersectionObserver.disconnect();
      document.body.removeChild(observedElement);
    };
  };
  
  // Start all detection methods
  document.addEventListener('mousemove', mouseHandler);
  document.addEventListener('keydown', keyboardHandler);
  document.addEventListener('keyup', keyboardHandler);
  
  frameTracker();
  
  performanceCheckInterval = setInterval(performanceCheck, 1000);
  documentStateInterval = setInterval(documentStatePoller, 500);
  networkTestInterval = setInterval(networkActivityTest, 5000);
  
  const intersectionCleanup = setupIntersectionObserver();
  
  // Cleanup function
  return () => {
    isActive = false;
    
    document.removeEventListener('mousemove', mouseHandler);
    document.removeEventListener('keydown', keyboardHandler);
    document.removeEventListener('keyup', keyboardHandler);
    
    clearInterval(performanceCheckInterval);
    clearInterval(documentStateInterval);
    clearInterval(networkTestInterval);
    clearTimeout(mouseMovementTimeout);
    clearTimeout(keyboardActivityTimeout);
    
    intersectionCleanup();
    
    console.log('🧹 Bypass-resistant tab detection cleanup completed');
  };
};

/**
 * Direct test for Always Active Window extension by checking actual behavior
 * This function tests if tab switching detection is actually working in real-time
 * @returns {Object} Direct detection results
 */
export const directAlwaysActiveWindowTest = () => {
  const results = {
    detected: false,
    evidence: [],
    confidence: 'low',
    details: []
  };

  try {
    // Test 1: Check if document.hidden stays false when it should be true
    const originalHidden = document.hidden;
    results.details.push(`Initial document.hidden: ${originalHidden}`);

    // Test 2: Check if visibilitychange events are being suppressed
    let visibilityEventFired = false;
    const testHandler = () => { visibilityEventFired = true; };
    
    document.addEventListener('visibilitychange', testHandler, { once: true });
    
    // Manually trigger visibilitychange
    const event = new Event('visibilitychange', { bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    
    // Remove handler immediately
    document.removeEventListener('visibilitychange', testHandler);
    
    if (!visibilityEventFired) {
      results.detected = true;
      results.evidence.push('Visibility change events are being blocked');
      results.confidence = 'high';
    }
    results.details.push(`Visibility event fired: ${visibilityEventFired}`);

    // Test 3: Check for specific Always Active Window patterns
    const checkExtensionPatterns = () => {
      // Check for injected scripts
      const scripts = Array.from(document.scripts);
      for (let script of scripts) {
        if (script.src && (
          script.src.includes('always') || 
          script.src.includes('active') ||
          script.src.includes('window-extension')
        )) {
          results.detected = true;
          results.evidence.push(`Suspicious script found: ${script.src}`);
          results.confidence = 'high';
        }
      }

      // Check for extension content scripts
      const extensionElements = document.querySelectorAll('[data-always-active], [id*="always-active"], [class*="always-active"]');
      if (extensionElements.length > 0) {
        results.detected = true;
        results.evidence.push(`Extension DOM elements found: ${extensionElements.length}`);
        results.confidence = 'high';
      }

      // Check for modified window properties
      const suspiciousProps = ['alwaysActive', 'keepAlive', 'stayAwake', 'noSleep'];
      suspiciousProps.forEach(prop => {
        if (window[prop] !== undefined) {
          results.detected = true;
          results.evidence.push(`Suspicious window property found: ${prop}`);
          results.confidence = 'high';
        }
      });
    };

    checkExtensionPatterns();

    // Test 4: Behavior-based detection - Check if focus events are artificially maintained
    let focusEventCount = 0;
    const focusCounter = () => focusEventCount++;
    
    window.addEventListener('focus', focusCounter);
    
    // Trigger multiple blur/focus events rapidly
    for (let i = 0; i < 3; i++) {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
    }
    
    window.removeEventListener('focus', focusCounter);
    
    if (focusEventCount > 3) {
      results.detected = true;
      results.evidence.push(`Abnormal focus event count: ${focusEventCount} (expected: 3 or less)`);
      results.confidence = 'medium';
    }
    results.details.push(`Focus event count: ${focusEventCount}`);

    // Test 5: Check if Page Visibility API is being overridden
    const visibilityDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    if (visibilityDescriptor && visibilityDescriptor.get) {
      const getterSource = visibilityDescriptor.get.toString();
      if (!getterSource.includes('[native code]')) {
        results.detected = true;
        results.evidence.push('Page Visibility API has been overridden');
        results.confidence = 'high';
        results.details.push(`Hidden getter: ${getterSource.substring(0, 100)}...`);
      }
    }

    // Test 6: Check performance timing for extension interference
    if (window.performance && window.performance.getEntries) {
      const entries = window.performance.getEntries();
      const extensionEntries = entries.filter(entry => 
        entry.name && entry.name.includes('chrome-extension://')
      );
      if (extensionEntries.length > 0) {
        results.detected = true;
        results.evidence.push(`Extension performance entries found: ${extensionEntries.length}`);
        results.confidence = 'medium';
      }
    }

    // Test 7: Direct behavioral test - simulate tab switch
    const testTabSwitchSimulation = () => {
      const before = Date.now();
      
      // Simulate what happens when user switches tabs
      Object.defineProperty(document, 'hidden', { 
        value: true, 
        configurable: true,
        writable: true 
      });
      
      const after = Date.now();
      const timeTaken = after - before;
      
      // Check if the property actually changed
      const actuallyHidden = document.hidden === true;
      
      // Restore original state
      Object.defineProperty(document, 'hidden', { 
        value: originalHidden, 
        configurable: true,
        writable: true 
      });
      
      if (!actuallyHidden) {
        results.detected = true;
        results.evidence.push('Cannot modify document.hidden property - likely blocked by extension');
        results.confidence = 'high';
      }
      
      results.details.push(`Property modification test: ${actuallyHidden ? 'success' : 'blocked'}`);
      results.details.push(`Time to modify property: ${timeTaken}ms`);
    };

    testTabSwitchSimulation();

    // Final confidence assessment
    if (results.evidence.length >= 3) {
      results.confidence = 'very-high';
    } else if (results.evidence.length >= 2) {
      results.confidence = 'high';
    } else if (results.evidence.length >= 1) {
      results.confidence = 'medium';
    }

    results.details.push(`Final detection result: ${results.detected ? 'EXTENSION DETECTED' : 'No extension detected'}`);
    results.details.push(`Confidence level: ${results.confidence}`);
    results.details.push(`Evidence count: ${results.evidence.length}`);

  } catch (error) {
    results.detected = true; // Assume detection if tests fail
    results.evidence.push(`Detection test failed: ${error.message}`);
    results.confidence = 'medium';
    results.details.push(`Error during detection: ${error.message}`);
  }

  return results;
};

/**
 * Performs a comprehensive real-time test to verify tab switching detection works
 * This function specifically tests for Always Active Window and similar extensions
 * @returns {Promise<Object>} Comprehensive test results
 */
export const performRealTimeTabSwitchTest = () => {
  return new Promise((resolve) => {
    const results = {
      visibilityApiWorking: false,
      focusEventsWorking: false,
      hiddenPropertyAccessible: false,
      visibilityStateAccessible: false,
      extensionInterference: false,
      overallWorking: false,
      details: []
    };

    // Test 1: Check if visibility API properties exist and are accessible
    try {
      results.hiddenPropertyAccessible = typeof document.hidden === 'boolean';
      results.visibilityStateAccessible = typeof document.visibilityState === 'string';
      results.details.push(`Hidden property: ${results.hiddenPropertyAccessible ? 'accessible' : 'blocked'}`);
      results.details.push(`VisibilityState property: ${results.visibilityStateAccessible ? 'accessible' : 'blocked'}`);
    } catch (e) {
      results.details.push(`Visibility API access error: ${e.message}`);
    }

    // Test 2: Test visibility change events
    let visibilityEventCount = 0;
    const visibilityHandler = () => {
      visibilityEventCount++;
      results.details.push(`Visibility change event triggered (count: ${visibilityEventCount})`);
    };

    document.addEventListener('visibilitychange', visibilityHandler);

    // Test 3: Test focus/blur events
    let focusEventCount = 0;
    let blurEventCount = 0;
    
    const focusHandler = () => {
      focusEventCount++;
      results.details.push(`Focus event triggered (count: ${focusEventCount})`);
    };
    
    const blurHandler = () => {
      blurEventCount++;
      results.details.push(`Blur event triggered (count: ${blurEventCount})`);
    };

    window.addEventListener('focus', focusHandler);
    window.addEventListener('blur', blurHandler);

    // Perform tests
    setTimeout(() => {
      // Test visibility change
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Test focus/blur
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
      
      setTimeout(() => {
        // Test manipulation detection
        const originalHidden = document.hidden;
        const originalVisibilityState = document.visibilityState;
        
        try {
          // Try to modify visibility state (Always Active Window might prevent this)
          Object.defineProperty(document, 'hidden', { value: true, configurable: true });
          Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
          
          document.dispatchEvent(new Event('visibilitychange'));
          
          setTimeout(() => {
            // Check if properties were actually changed
            const hiddenChanged = document.hidden === true;
            const visibilityChanged = document.visibilityState === 'hidden';
            
            results.details.push(`Hidden state change test: ${hiddenChanged ? 'worked' : 'blocked'}`);
            results.details.push(`Visibility state change test: ${visibilityChanged ? 'worked' : 'blocked'}`);
            
            // Restore original values
            try {
              Object.defineProperty(document, 'hidden', { value: originalHidden, configurable: true });
              Object.defineProperty(document, 'visibilityState', { value: originalVisibilityState, configurable: true });
            } catch (e) {
              results.details.push(`Failed to restore original values: ${e.message}`);
            }
            
            // Cleanup event listeners
            document.removeEventListener('visibilitychange', visibilityHandler);
            window.removeEventListener('focus', focusHandler);
            window.removeEventListener('blur', blurHandler);
            
            // Analyze results
            results.visibilityApiWorking = visibilityEventCount > 0;
            results.focusEventsWorking = focusEventCount > 0 && blurEventCount > 0;
            
            // Check for extension interference
            results.extensionInterference = 
              !results.visibilityApiWorking || 
              !results.focusEventsWorking ||
              !hiddenChanged ||
              !visibilityChanged;
            
            results.overallWorking = 
              results.visibilityApiWorking && 
              results.focusEventsWorking && 
              !results.extensionInterference;
            
            results.details.push(`Final assessment: ${results.overallWorking ? 'Tab switching detection working' : 'Tab switching detection compromised'}`);
            
            if (results.extensionInterference) {
              results.details.push('CRITICAL: Extension interference detected - Always Active Window or similar extension may be active');
            }
            
            resolve(results);
          }, 200);
        } catch (e) {
          results.details.push(`Property modification test failed: ${e.message}`);
          results.extensionInterference = true;
          resolve(results);
        }
      }, 100);
    }, 100);
  });
};

/**
 * Tests if tab switching and focus detection is working properly
 * @returns {Promise<Object>} Test results
 */
export const testTabSwitchingDetection = () => {
  return new Promise((resolve) => {
    let focusEvents = 0;
    let blurEvents = 0;
    let visibilityChanges = 0;
    
    const focusHandler = () => focusEvents++;
    const blurHandler = () => blurEvents++;
    const visibilityHandler = () => visibilityChanges++;
    
    // Add event listeners
    window.addEventListener('focus', focusHandler);
    window.addEventListener('blur', blurHandler);
    document.addEventListener('visibilitychange', visibilityHandler);
    
    // Test focus/blur events
    setTimeout(() => {
      // Simulate events
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
      
      // Test visibility API
      const originalHidden = document.hidden;
      const originalVisibilityState = document.visibilityState;
      
      // Try to simulate tab switch
      document.dispatchEvent(new Event('visibilitychange'));
      
      setTimeout(() => {
        // Cleanup
        window.removeEventListener('focus', focusHandler);
        window.removeEventListener('blur', blurHandler);
        document.removeEventListener('visibilitychange', visibilityHandler);
        
        const isWorking = focusEvents > 0 && blurEvents > 0 && visibilityChanges > 0;
        
        resolve({
          isTabSwitchingDetectionWorking: isWorking,
          focusEvents,
          blurEvents,
          visibilityChanges,
          canDetectHidden: document.hidden !== undefined,
          canDetectVisibilityState: document.visibilityState !== undefined,
          warning: !isWorking ? 'Tab switching detection may be compromised by browser extensions' : null
        });
      }, 100);
    }, 100);
  });
};

/**
 * Comprehensive security check for quiz environment
 * @returns {Object} Complete security assessment
 */
export const performComprehensiveSecurityCheck = async () => {
  const results = {
    overall: 'unknown',
    remoteConnection: null,
    extensions: null,
    incognitoMode: null,
    violations: [],
    recommendations: [],
    blocking: false,
    timestamp: new Date()
  };
  
  try {
    // 1. Check for remote connections
    console.log('🔍 Checking for remote connections...');
    results.remoteConnection = detectRemoteConnections();
    
    if (results.remoteConnection.remoteDesktopDetected) {
      results.violations.push({
        type: 'REMOTE_CONNECTION_DETECTED',
        severity: 'HIGH',
        message: 'Remote desktop software detected',
        detected: results.remoteConnection.detectedRemoteApps
      });
      results.blocking = true;
    }
    
    if (results.remoteConnection.screenSharingPossible) {
      results.violations.push({
        type: 'SCREEN_SHARING_POSSIBLE',
        severity: 'MEDIUM',
        message: 'Possible screen sharing detected',
        indicators: results.remoteConnection.suspiciousActivity
      });
    }
    
    // 2. Check browser extensions
    console.log('🔍 Checking for browser extensions...');
    results.extensions = detectChromeExtensions();
    
    if (results.extensions.detected.length > 0) {
      results.violations.push({
        type: 'EXTENSIONS_DETECTED',
        severity: 'MEDIUM',
        message: 'Browser extensions detected',
        extensions: results.extensions.detected
      });
    }
    
    // 3. Check incognito mode
    console.log('🔍 Checking incognito mode...');
    results.incognitoMode = await detectIncognitoMode();
    
    if (!results.incognitoMode) {
      results.recommendations.push({
        type: 'USE_INCOGNITO_MODE',
        message: 'Consider using incognito/private browsing mode for enhanced security',
        priority: 'MEDIUM'
      });
    }
    
    // 4. Generate recommendations
    if (results.violations.length === 0 && results.incognitoMode) {
      results.overall = 'SECURE';
      results.recommendations.push({
        type: 'ENVIRONMENT_SECURE',
        message: 'Quiz environment appears secure',
        priority: 'INFO'
      });
    } else if (results.blocking) {
      results.overall = 'BLOCKED';
      results.recommendations.push({
        type: 'SECURITY_BLOCK',
        message: 'Quiz cannot proceed due to security violations',
        priority: 'HIGH'
      });
    } else {
      results.overall = 'WARNING';
      results.recommendations.push({
        type: 'SECURITY_WARNING',
        message: 'Security concerns detected, proceed with caution',
        priority: 'MEDIUM'
      });
    }
    
    // 5. Add specific recommendations
    if (results.remoteConnection.remoteDesktopDetected) {
      results.recommendations.push({
        type: 'DISABLE_REMOTE_SOFTWARE',
        message: 'Please close all remote desktop applications before taking the quiz',
        priority: 'HIGH'
      });
    }
    
    if (results.extensions.detected.length > 0) {
      results.recommendations.push({
        type: 'DISABLE_EXTENSIONS',
        message: 'Please disable browser extensions or use incognito mode',
        priority: 'MEDIUM',
        instructions: getExtensionDisableInstructions()
      });
    }
    
  } catch (error) {
    console.error('Comprehensive security check failed:', error);
    results.overall = 'ERROR';
    results.violations.push({
      type: 'SECURITY_CHECK_FAILED',
      severity: 'HIGH',
      message: 'Unable to verify security environment',
      error: error.message
    });
  }
  
  return results;
};

/**
 * Gets instructions for disabling extensions based on browser
 * @returns {Array} Step-by-step instructions
 */
export const getExtensionDisableInstructions = () => {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome')) {
    return [
      'Press Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac) to open incognito mode',
      'Or go to Chrome Settings → Extensions → Toggle off all extensions',
      'Or use chrome://extensions/ to disable extensions manually'
    ];
  } else if (userAgent.includes('Firefox')) {
    return [
      'Press Ctrl+Shift+P (Windows) or Cmd+Shift+P (Mac) to open private browsing',
      'Or go to Firefox Menu → Add-ons → Extensions → Disable all extensions'
    ];
  } else if (userAgent.includes('Safari')) {
    return [
      'Press Cmd+Shift+N to open private browsing',
      'Or go to Safari → Preferences → Extensions → Uncheck all extensions'
    ];
  } else if (userAgent.includes('Edge')) {
    return [
      'Press Ctrl+Shift+N to open InPrivate browsing',
      'Or go to Edge Settings → Extensions → Toggle off all extensions'
    ];
  } else {
    return [
      'Open your browser in private/incognito mode',
      'Disable all browser extensions through browser settings'
    ];
  }
};