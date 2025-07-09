# CBAA Login Browser Extension

A clean and modern login popup extension for browsers with a 300x300 pixel popup window.

## Features

- **Compact Design**: Perfectly sized 300x300 popup window
- **Modern UI**: Clean, gradient-based design with smooth animations
- **Form Validation**: Client-side validation for username and password fields
- **Interactive Elements**: 
  - Username and password input fields
  - Login button with hover effects
  - Forgot password link
  - Sign up link
- **Storage Integration**: Uses Chrome extension storage for session management
- **Responsive Layout**: All elements fit perfectly within the popup dimensions

## Installation

### For Chrome/Edge/Brave:

1. Open your browser and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the folder containing this extension
5. The extension should now appear in your extensions list

### For Firefox:

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this extension
5. The extension should now be installed temporarily

## Usage

1. Click on the extension icon in your browser toolbar
2. The login popup will appear with a 300x300 window
3. Enter your username and password
4. Click "Sign In" to submit the form
5. Use the "Forgot Password?" or "Sign up" links as needed

## File Structure

```
CBAA/
├── manifest.json      # Extension configuration
├── popup.html         # Main popup HTML structure
├── popup.css          # Styling for the popup
├── popup.js           # JavaScript functionality
└── README.md          # This file
```

## Customization

### Styling
The popup uses a modern gradient design with purple/blue colors. You can customize the colors by modifying the CSS variables in `popup.css`.

### Functionality
The JavaScript in `popup.js` includes:
- Form validation
- Chrome storage integration
- Message display system
- Keyboard navigation support

### Authentication
Currently, the extension simulates login functionality. To integrate with a real authentication system:
1. Replace the setTimeout in the form submission handler
2. Add your API endpoint for authentication
3. Handle success/error responses appropriately

## Browser Compatibility

- Chrome 88+
- Edge 88+
- Firefox 85+
- Brave (Chromium-based)

## Notes

- The popup is designed to be exactly 300x300 pixels
- All interactive elements are properly contained within the popup
- The extension uses Manifest V3 for modern browser compatibility
- Storage permissions are included for session management

## Development

To modify the extension:
1. Edit the relevant files
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension
4. Test the changes

The extension will automatically reload when you refresh it in the extensions page. 