# Betaflight CLI WebSerial Interface

A web-based interface for interacting with Betaflight's CLI using WebSerial API.

## Features

- Connect to Betaflight-enabled flight controllers via USB
- Send CLI commands and view responses
- Clear output window
- Save output to a text file

## Usage

1. Connect your flight controller to your computer via USB
2. Open index.html in a WebSerial-compatible browser (like Chrome)
3. Click "Connect" and select your flight controller from the port list
4. Enter CLI commands and press Enter or click Send

## Requirements

- Web browser with WebSerial API support (Chrome/Edge)
- Betaflight-powered flight controller

## Files

- `index.html` - Main HTML structure
- `styles.css` - CSS styles for the interface
- `script.js` - JavaScript code for WebSerial functionality