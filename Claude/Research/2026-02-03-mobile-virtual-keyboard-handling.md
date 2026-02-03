# Mobile Virtual Keyboard Handling in Web Applications

## Overview

This research document covers techniques for detecting, managing, and responding to on-screen virtual keyboards on mobile devices in web applications.

---

## 1. Detecting When the Virtual Keyboard is Shown/Hidden

### Modern Approach: VirtualKeyboard API (Chromium Only)

The VirtualKeyboard API provides direct control over keyboard detection and behavior.

**Feature Detection:**
```javascript
if ('virtualKeyboard' in navigator) {
  // VirtualKeyboard API is supported
}
```

**Detecting Keyboard Visibility:**
```javascript
if ('virtualKeyboard' in navigator) {
  navigator.virtualKeyboard.overlaysContent = true;

  navigator.virtualKeyboard.addEventListener('geometrychange', (event) => {
    const { x, y, width, height } = event.target.boundingRect;

    if (height > 0) {
      console.log('Keyboard is visible');
      console.log('Keyboard height:', height);
    } else {
      console.log('Keyboard is hidden');
    }
  });
}
```

**Browser Support:** Chromium 94+ only (Chrome, Edge on desktop and mobile). **Not supported in Safari/WebKit.**

### Fallback Approach: Visual Viewport API (Cross-Browser)

The Visual Viewport API has much broader support and can indirectly detect keyboard presence.

```javascript
function setupKeyboardDetection() {
  if (!window.visualViewport) return;

  let lastHeight = window.visualViewport.height;
  const KEYBOARD_THRESHOLD = 150; // pixels

  window.visualViewport.addEventListener('resize', () => {
    const currentHeight = window.visualViewport.height;
    const heightDiff = lastHeight - currentHeight;

    if (heightDiff > KEYBOARD_THRESHOLD) {
      console.log('Keyboard likely appeared');
      onKeyboardShow(currentHeight);
    } else if (heightDiff < -KEYBOARD_THRESHOLD) {
      console.log('Keyboard likely hidden');
      onKeyboardHide();
    }

    lastHeight = currentHeight;
  });
}

function onKeyboardShow(viewportHeight) {
  // Adjust UI accordingly
}

function onKeyboardHide() {
  // Restore UI
}
```

### Focus/Blur Detection (Simple but Less Reliable)

```javascript
const inputs = document.querySelectorAll('input, textarea, [contenteditable]');

inputs.forEach(input => {
  input.addEventListener('focus', () => {
    // Keyboard likely opening
    document.body.classList.add('keyboard-open');
  });

  input.addEventListener('blur', () => {
    // Keyboard likely closing (with delay for iOS)
    setTimeout(() => {
      document.body.classList.remove('keyboard-open');
    }, 100);
  });
});
```

---

## 2. Programmatically Dismissing the Keyboard

### Method 1: blur() - Most Reliable Cross-Browser

```javascript
function dismissKeyboard() {
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.tagName === 'INPUT' ||
                         activeElement.tagName === 'TEXTAREA' ||
                         activeElement.isContentEditable)) {
    activeElement.blur();
  }
}
```

### Method 2: VirtualKeyboard API (Chromium Only)

```javascript
function dismissKeyboard() {
  if ('virtualKeyboard' in navigator) {
    navigator.virtualKeyboard.hide();
  } else {
    // Fallback to blur
    document.activeElement?.blur();
  }
}
```

**Important:** `navigator.virtualKeyboard.hide()` only works when:
- The focused element has `virtualKeyboardPolicy="manual"`
- `inputmode` is not set to `none`

### Method 3: Dismiss on Enter Key

```javascript
inputElement.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.keyCode === 13) {
    event.preventDefault();
    inputElement.blur();
  }
});
```

### Method 4: Dismiss on Outside Tap

```javascript
document.addEventListener('touchstart', (event) => {
  const activeElement = document.activeElement;
  const isInput = activeElement?.tagName === 'INPUT' ||
                  activeElement?.tagName === 'TEXTAREA';

  if (isInput && !activeElement.contains(event.target)) {
    activeElement.blur();
  }
});
```

---

## 3. Visual Viewport API

The Visual Viewport API provides information about the visible portion of the page, which is affected by the on-screen keyboard.

### Key Properties

| Property | Description |
|----------|-------------|
| `visualViewport.height` | Height of visible area (shrinks when keyboard appears) |
| `visualViewport.width` | Width of visible area |
| `visualViewport.offsetTop` | Offset from top of layout viewport |
| `visualViewport.offsetLeft` | Offset from left of layout viewport |
| `visualViewport.scale` | Current pinch-zoom scale factor |
| `visualViewport.pageTop` | Y coordinate relative to page origin |
| `visualViewport.pageLeft` | X coordinate relative to page origin |

### Events

- `resize` - Fired when viewport size changes (keyboard show/hide)
- `scroll` - Fired when visual viewport scrolls within layout viewport
- `scrollend` - Fired when scrolling ends

### Practical Usage: Keep Element Above Keyboard

```javascript
function keepElementAboveKeyboard(element) {
  if (!window.visualViewport) return;

  const update = () => {
    const keyboardHeight = window.innerHeight - window.visualViewport.height;
    element.style.transform = `translateY(-${keyboardHeight}px)`;
  };

  window.visualViewport.addEventListener('resize', update);
  window.visualViewport.addEventListener('scroll', update);
}
```

### Simulate `position: device-fixed`

```javascript
function deviceFixed(element) {
  const viewport = window.visualViewport;
  if (!viewport) return;

  const update = () => {
    // Position element at bottom of visual viewport
    const offsetTop = viewport.height + viewport.offsetTop - element.offsetHeight;
    element.style.position = 'absolute';
    element.style.top = '0';
    element.style.transform = `translateY(${offsetTop}px)`;
  };

  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  update();
}
```

### Browser Support

**Baseline: Widely available** since August 2021. Works in all modern browsers including Safari.

---

## 4. Best Practices for Modals/Dialogs with Keyboards

### Problem Areas

1. Modal content gets hidden behind keyboard
2. Background scrolling when keyboard is open
3. Fixed positioning issues on iOS
4. Scroll trapping within modal

### Recommended Approaches

#### 1. Use Full-Screen Modals on Mobile

```css
@media (max-width: 768px) {
  .modal {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh; /* Dynamic viewport height */
    max-height: none;
    border-radius: 0;
  }
}
```

#### 2. Allow Internal Scrolling

```css
.modal {
  display: flex;
  flex-direction: column;
  max-height: 100dvh;
  overflow: hidden;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain; /* Prevent scroll chaining */
}
```

#### 3. Scroll Input Into View

```javascript
inputElement.addEventListener('focus', () => {
  // Wait for keyboard to fully open
  setTimeout(() => {
    inputElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }, 300);
});
```

#### 4. Prevent Background Scroll (with position restoration)

```javascript
let scrollPosition = 0;

function lockScroll() {
  scrollPosition = window.pageYOffset;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollPosition}px`;
  document.body.style.width = '100%';
}

function unlockScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, scrollPosition);
}
```

#### 5. Use Sticky Instead of Fixed for Buttons

```css
/* Prefer this */
.submit-button {
  position: sticky;
  bottom: 0;
}

/* Over this (problematic with keyboards) */
.submit-button {
  position: fixed;
  bottom: 0;
}
```

---

## 5. iOS vs Android Differences

### iOS Safari Behavior

| Aspect | Behavior |
|--------|----------|
| Layout Viewport | **Does not resize** when keyboard opens |
| Visual Viewport | Shrinks to account for keyboard |
| `resize` event on `window` | **Does not fire** |
| `position: fixed` bottom elements | Can get hidden under keyboard |
| VirtualKeyboard API | **Not supported** |
| Address bar | Included in `100vh`, causing issues |

### Android Chrome Behavior (Post Chrome 108)

| Aspect | Behavior |
|--------|----------|
| Layout Viewport | **No longer resizes** (changed in Chrome 108) |
| Visual Viewport | Shrinks to account for keyboard |
| `resize` event on `window` | No longer fires (since Chrome 108) |
| `position: fixed` bottom elements | Can get hidden under keyboard |
| VirtualKeyboard API | **Supported** (Chrome 94+) |
| Configurable | Yes, via `interactive-widget` meta tag |

### Android Chrome `interactive-widget` Option

```html
<!-- Opt into old behavior where layout viewport resizes -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content">

<!-- Default: overlays-content (keyboard overlays content) -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, interactive-widget=overlays-content">

<!-- Visual viewport resizes, layout stays same -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, interactive-widget=resizes-visual">
```

### Cross-Platform Strategy

```javascript
function setupCrossPlatformKeyboardHandling(element) {
  // Use VirtualKeyboard API if available (Android Chrome)
  if ('virtualKeyboard' in navigator) {
    navigator.virtualKeyboard.overlaysContent = true;
    navigator.virtualKeyboard.addEventListener('geometrychange', (event) => {
      const { height } = event.target.boundingRect;
      element.style.paddingBottom = `${height}px`;
    });
    return;
  }

  // Fallback to Visual Viewport API (iOS Safari, others)
  if (window.visualViewport) {
    const update = () => {
      const keyboardHeight = window.innerHeight - window.visualViewport.height;
      element.style.paddingBottom = `${Math.max(0, keyboardHeight)}px`;
    };

    window.visualViewport.addEventListener('resize', update);
    window.visualViewport.addEventListener('scroll', update);
  }
}
```

---

## 6. CSS Viewport Units (dvh, svh, lvh)

### The Problem with `100vh`

On mobile browsers, `100vh` includes the browser's address bar, which can collapse when scrolling. This causes layout issues where content is taller than the visible area.

### New Viewport Units

| Unit | Name | Description |
|------|------|-------------|
| `svh` | Small Viewport Height | Height when browser UI is **expanded** (smallest visible area) |
| `lvh` | Large Viewport Height | Height when browser UI is **collapsed** (largest visible area) |
| `dvh` | Dynamic Viewport Height | Adjusts dynamically as browser UI expands/collapses |
| `svw`, `lvw`, `dvw` | Viewport Width variants | Same concept for width |

### Important Note About Keyboards

**The on-screen keyboard is NOT considered part of browser UI.** Therefore:
- `svh`, `lvh`, `dvh` do **not** automatically adjust for keyboard presence
- You need VirtualKeyboard API or Visual Viewport API for keyboard-aware layouts

### Practical Usage

```css
/* Full-height container that respects dynamic browser UI */
.container {
  min-height: 100vh;  /* Fallback */
  min-height: 100dvh; /* Modern browsers */
}

/* Safe approach for modals */
.modal {
  height: 100vh;  /* Fallback */
  height: 100svh; /* Use small viewport to ensure content fits */
}

/* Hero section */
.hero {
  height: 100vh;  /* Fallback */
  height: 100lvh; /* Use large viewport for full-screen effect */
}
```

### With Keyboard Consideration

Combine `dvh` with VirtualKeyboard CSS environment variables:

```css
.chat-container {
  height: 100dvh;
  padding-bottom: env(keyboard-inset-height, 0px);
}

/* Or using CSS Grid */
.app {
  display: grid;
  height: 100dvh;
  grid-template-rows: auto 1fr auto env(keyboard-inset-height, 0px);
}
```

### Browser Support

- **dvh, svh, lvh**: Supported in all modern browsers (Safari 15.4+, Chrome 108+, Firefox 101+)
- **keyboard-inset-* variables**: Chromium only

### Recommendation

Use `svh` for ~90% of layouts. Only use `dvh` when you specifically need dynamic behavior, as constant height changes can feel jarring.

```css
/* Recommended approach with fallbacks */
.full-height {
  height: 100vh;
  height: 100svh;
}

@supports (height: 100dvh) {
  .full-height-dynamic {
    height: 100dvh;
  }
}
```

---

## Complete Implementation Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, interactive-widget=resizes-visual">
  <style>
    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
    }

    .chat-app {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 1rem;
    }

    .input-area {
      position: sticky;
      bottom: 0;
      padding: 1rem;
      background: white;
      border-top: 1px solid #ccc;
      /* Space for keyboard on supported browsers */
      padding-bottom: calc(1rem + env(keyboard-inset-height, 0px));
    }

    .input-area input {
      width: 100%;
      padding: 0.75rem;
      font-size: 16px; /* Prevents iOS zoom */
    }
  </style>
</head>
<body>
  <div class="chat-app">
    <div class="messages" id="messages">
      <!-- Messages here -->
    </div>
    <div class="input-area" id="inputArea">
      <input type="text" placeholder="Type a message..." id="messageInput">
    </div>
  </div>

  <script>
    const inputArea = document.getElementById('inputArea');
    const messageInput = document.getElementById('messageInput');

    // Modern approach: VirtualKeyboard API
    if ('virtualKeyboard' in navigator) {
      navigator.virtualKeyboard.overlaysContent = true;

      navigator.virtualKeyboard.addEventListener('geometrychange', (event) => {
        const { height } = event.target.boundingRect;
        // CSS env() variables handle this, but we can add JS logic here
        console.log('Keyboard height:', height);
      });
    }
    // Fallback: Visual Viewport API
    else if (window.visualViewport) {
      const viewport = window.visualViewport;

      function adjustForKeyboard() {
        const keyboardHeight = window.innerHeight - viewport.height;
        inputArea.style.paddingBottom = `calc(1rem + ${Math.max(0, keyboardHeight)}px)`;
      }

      viewport.addEventListener('resize', adjustForKeyboard);
      viewport.addEventListener('scroll', adjustForKeyboard);
    }

    // Scroll input into view on focus
    messageInput.addEventListener('focus', () => {
      setTimeout(() => {
        messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });

    // Dismiss keyboard on Enter
    messageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        // Handle send message
        event.preventDefault();
        messageInput.blur();
      }
    });
  </script>
</body>
</html>
```

---

## Summary of Recommendations

1. **Use Visual Viewport API** for cross-browser keyboard detection (works everywhere)
2. **Use VirtualKeyboard API** for enhanced control on Chromium browsers
3. **Always provide fallbacks** - Safari doesn't support VirtualKeyboard API
4. **Use `dvh`/`svh` units** instead of `100vh` for mobile layouts
5. **Use `blur()` method** as the most reliable way to dismiss keyboards
6. **Use `position: sticky`** instead of `fixed` for bottom elements
7. **Scroll inputs into view** after keyboard opens with `scrollIntoView()`
8. **Use full-screen modals** on mobile to avoid keyboard overlap issues
9. **Set `font-size: 16px`** on inputs to prevent iOS auto-zoom

---

## Sources

- [VirtualKeyboard API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API)
- [VisualViewport API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- [Full control with the VirtualKeyboard API - Chrome Developers](https://developer.chrome.com/docs/web-platform/virtual-keyboard)
- [The large, small, and dynamic viewport units - web.dev](https://web.dev/blog/viewport-units)
- [Prepare for viewport resize behavior changes - Chrome Developers](https://developer.chrome.com/blog/viewport-resize-behavior)
- [The virtual keyboard API - Ahmad Shadeed](https://ishadeed.com/article/virtual-keyboard-api/)
- [How to detect the on-screen keyboard in iOS Safari - Martijn Hols](https://martijnhols.nl/blog/how-to-detect-the-on-screen-keyboard-in-ios-safari)
- [on-screen-keyboard-detector - GitHub](https://github.com/semmel/on-screen-keyboard-detector)
- [HTMLElement: blur() method - MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/blur)
- [VirtualKeyboard: hide() method - MDN](https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard/hide)
- [Fix mobile keyboard overlap with VisualViewport - DEV Community](https://dev.to/franciscomoretti/fix-mobile-keyboard-overlap-with-visualviewport-3a4a)
- [CSS Viewport Units Guide - DEV Community](https://dev.to/encodedots/css-viewport-units-css-vh-dvh-lvh-svh-and-vw-units-2oo6)
