# Obsidian Mobile Modal API Research

**Date:** 2026-02-03

## Summary

This document summarizes research findings on Obsidian's APIs for handling mobile keyboards, modal dialogs on mobile, mobile-specific CSS classes, and the Modal class's mobile capabilities.

---

## 1. Obsidian Mobile Keyboard APIs

### Finding: No Dedicated Mobile Keyboard API

Obsidian does **not** provide a dedicated plugin API for handling mobile keyboards. The mobile implementation uses CapacitorJS under the hood, which handles keyboard events internally.

**Key Points:**
- Obsidian Mobile is built using CapacitorJS (not Electron like desktop)
- The `Keyboard` Capacitor plugin is registered by Obsidian internally
- Plugins cannot directly access or control the mobile keyboard through Obsidian's API
- A known bug (August 2025) shows: "Capacitor plugin 'Keyboard' already registered" warning after reload

**Workaround Approaches:**
- Use standard DOM event listeners (`keydown`, `keyup`) on modal elements
- The Modal class's `scope` property (Scope class) handles keyboard events within the modal context
- Focus management must be done manually for input elements

### References:
- [Obsidian Forum - Capacitor Keyboard Bug](https://forum.obsidian.md/t/bug-mobile-capacitor-plugin-keyboard-already-registered-cannot-register-plugins-twice/104014)
- [Obsidian Changelog](https://obsidian.md/changelog/) - Mobile v1.10.6 fixed scroll position loss when keyboard closes

---

## 2. Modal Dialogs on Mobile - Best Practices

### How Other Plugins Handle Mobile Modals

**Common Challenges:**
1. Modal sizing - dialogs can be too large for phone screens
2. Keyboard coverage - input fields may be hidden behind the virtual keyboard
3. Close button visibility - 'X' buttons can be covered by iOS Dynamic Island or input fields
4. Scrolling behavior - modal content may not scroll properly

**Solutions Used by Community Plugins:**

#### Responsive Layout (Obsidian Tasks Plugin)
- Rearranges UI elements (like priority buttons) in narrower windows
- Uses `overflow: auto` on content areas to enable scrolling
- Keeps action buttons outside the scrollable content area
- Released compact modal redesign in v1.17.0

#### UI Simplification
- Use icons with placeholder text instead of labels to reduce vertical space
- Move help text to tooltips instead of inline display
- Implement persistent action buttons using separate divs with `overflow: auto`

#### Focus and Input Handling (obsidian-enhanced-focus-highlight)
- Addresses that "Obsidian mobile does not insert a cursor after focus and highlight"
- Manually manages focus states for input elements

### References:
- [Obsidian Tasks GitHub Discussion #1215](https://github.com/obsidian-tasks-group/obsidian-tasks/discussions/1215)
- [obsidian-enhanced-focus-highlight](https://github.com/uoFishbox/obsidian-enhanced-focus-highlight)
- [obsidian-modal-form](https://github.com/danielo515/obsidian-modal-form)

---

## 3. Obsidian Mobile-Specific CSS Classes

### Body Element Classes

Obsidian adds CSS classes to the `<body>` element for platform detection:

| Class | Description |
|-------|-------------|
| `.is-mobile` | Added on mobile devices (phones and tablets) |
| `.is-phone` | Added specifically for phones (smaller screens) |
| `.is-tablet` | Added specifically for tablets |

### Usage Pattern

```css
/* Target all mobile devices */
body.is-mobile .modal {
  /* mobile-specific styles */
}

/* Target phones only */
body.is-phone .modal {
  max-height: 80vh;
  width: 95vw;
}

/* Target tablets only */
body.is-tablet .modal {
  max-width: 600px;
}
```

**Important Note:** CSS that works on tablets may not work on phones because:
- Tablet layout is similar to desktop
- Phone layout is significantly different

### Modal CSS Variables

Obsidian provides CSS variables for modals (from `docs.obsidian.md/Reference/CSS+variables/Components/Modal`):

```css
/* Common modal customization variables */
--modal-width
--modal-height
--modal-max-width
--modal-max-height
--modal-border-radius
--modal-background
```

### References:
- [Obsidian Forum - Mobile Only CSS Snippet](https://forum.obsidian.md/t/mobile-only-css-snippet/64355)
- [Obsidian Forum - CSS on Mobile Devices](https://forum.obsidian.md/t/how-to-make-this-css-code-effective-on-mobile-devices/102315)
- [Modal CSS Variables Documentation](https://docs.obsidian.md/Reference/CSS+variables/Components/Modal)

---

## 4. Modal Class Mobile-Specific Methods/Options

### Modal Class Properties

```typescript
class Modal {
  app: App;                    // Reference to the application instance
  scope: Scope;                // Keymap scope for modal-specific hotkeys
  modalEl: HTMLElement;        // Container element for the modal
  titleEl: HTMLElement;        // Title section
  contentEl: HTMLElement;      // Main content area

  open(): void;                // Display the modal
  close(): void;               // Close the modal
  onOpen(): void;              // Override to populate content
  onClose(): void;             // Override for cleanup
}
```

### No Mobile-Specific Methods

The Modal class does **not** have mobile-specific methods or options. Key points:
- Modal automatically handles Escape key to close (via `scope`)
- Focus management is automatic
- Backdrop click handling is automatic
- No built-in keyboard avoidance or mobile-specific positioning

### Scope Class for Keyboard Handling

The `scope` property provides keyboard event handling within the modal:
- Manages keyboard shortcuts specific to the modal context
- Can be used to register custom key handlers
- Handles Escape key to close by default

### Platform Detection API

For conditional mobile behavior, use the `Platform` API:

```typescript
import { Platform } from "obsidian";

// Platform properties
Platform.isDesktopApp: boolean   // Desktop environment
Platform.isMobileApp: boolean    // Mobile environment (iOS or Android)
Platform.isIosApp: boolean       // iOS specifically
Platform.isAndroidApp: boolean   // Android specifically
Platform.isMacOS: boolean
Platform.isWin: boolean
Platform.isLinux: boolean

// Alternative via App instance
this.app.isMobile: boolean

// Emulation for testing
this.app.emulateMobile(true);    // Enable mobile emulation
this.app.emulateMobile(false);   // Disable mobile emulation
```

### References:
- [Obsidian Modal Documentation](https://docs.obsidian.md/Plugins/User+interface/Modals)
- [Modal TypeScript API](https://docs.obsidian.md/Reference/TypeScript+API/Modal)
- [Mobile Development Guide](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development)
- [DeepWiki - UI Components](https://deepwiki.com/obsidianmd/obsidian-api/5.3-common-interfaces-and-types)
- [Plugin Developer Docs - Mobile Devices](https://marcusolsson.github.io/obsidian-plugin-docs/testing/mobile-devices)

---

## 5. Recommendations for Mobile Modal Development

### Best Practices

1. **Use Platform Detection**
   ```typescript
   import { Platform } from "obsidian";

   if (Platform.isMobileApp) {
     // Apply mobile-specific adjustments
   }
   ```

2. **Responsive CSS**
   ```css
   .my-plugin-modal {
     max-width: 90vw;
     max-height: 80vh;
   }

   body.is-phone .my-plugin-modal {
     max-width: 95vw;
     max-height: 70vh;
   }
   ```

3. **Handle Keyboard Visibility**
   - Keep important action buttons at the top or use sticky positioning
   - Use `overflow: auto` on content containers
   - Consider the virtual keyboard taking ~40% of screen height

4. **Input Focus Management**
   - Manually scroll input elements into view when focused
   - Add delay before focusing to allow keyboard animation
   - Consider using `scrollIntoView()` on input focus

5. **Test on Actual Devices**
   - Desktop mobile emulation is not identical to actual mobile
   - Use ADB debugging for Android
   - Test on both phones and tablets

### Avoiding Common Issues

- Do not use Node.js or Electron APIs (they crash on mobile)
- Avoid regex lookbehind on iOS (not supported)
- Test scrolling behavior with keyboard open
- Verify close button visibility on devices with notches/Dynamic Island

---

## Additional Resources

- [Obsidian Developer Documentation](https://docs.obsidian.md/Home)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian API Type Definitions](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts)
- [Obsidian Forum - Plugin Development](https://forum.obsidian.md/c/developers-api/14)
- [Mobile-Compatible Plugins List](https://publish.obsidian.md/hub/02+-+Community+Expansions/02.01+Plugins+by+Category/Mobile-compatible+plugins)
