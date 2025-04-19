let port, writer, reader;
const outputDiv = document.getElementById("output");
const connectBtn = document.getElementById("connectBtn");
const sendBtn = document.getElementById("sendBtn");
const commandInput = document.getElementById("commandInput");

async function connect() {
    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        const textEncoderStream = new TextEncoderStream();
        textEncoderStream.readable.pipeTo(port.writable);
        writer = textEncoderStream.writable.getWriter();

        const textDecoderStream = new TextDecoderStream();
        port.readable.pipeTo(textDecoderStream.writable);
        reader = textDecoderStream.readable.getReader();

        log("✅ Connected to controller.");
        sendBtn.disabled = false;
        await delay(300);
        await sendCommand("#"); // enter CLI mode
        readLoop();
    } catch (err) {
        log("❌ Error: " + err);
    }
}

async function sendCommand(cmd) {
    if (!writer || !cmd.trim()) return;
    await writer.write(cmd + "\n");
    log("📤 Sent: " + cmd);
}

async function sendCommandWithResponse(cmd) {
    if (!writer || !cmd.trim()) return null;
    await writer.write(cmd + "\n");
    log("📤 Sent: " + cmd);

    let response = "";
    const originalProcessChunk = processChunk;

    return new Promise((resolve) => {
        processChunk = (chunk) => {
            response += chunk;
            if (response.includes("#")) { // Assuming '#' indicates the end of the response
                processChunk = originalProcessChunk; // Restore original processChunk
                resolve(response.trim());
            }
        };
    });
}

let readBuffer = "";

async function readLoop() {
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) processChunk(value);
    }
}

function processChunk(chunk) {
    readBuffer += chunk;
    let lines = readBuffer.split(/\r?\n/);

    // Save the last partial line (not yet complete)
    readBuffer = lines.pop();

    for (let line of lines) {
        log(line);
    }
}

function log(line) {
    outputDiv.textContent += line + "\n";
    outputDiv.scrollTop = outputDiv.scrollHeight;
    processLine(line);
}

function processLine(line) {
    // Process the line here if needed
    // For example, you can parse specific commands or responses
    console.log(line);
    // Add your custom processing logic here
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clearOutput() {
    outputDiv.textContent = "";
}

function saveOutput() {
    const blob = new Blob([outputDiv.textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "betaflight-cli-output.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function handleSend() {
    const cmd = commandInput.value.trim();
    if (cmd) {
        sendCommand(cmd);
        commandInput.value = "";
    }
}

connectBtn.addEventListener("click", connect);
sendBtn.addEventListener("click", handleSend);
document.getElementById("clearBtn").addEventListener("click", clearOutput);
document.getElementById("saveBtn").addEventListener("click", saveOutput);

// Pressing Enter sends the command
commandInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        handleSend();
    }
});

// Add logic to handle file selection and update the JSON file used for comparison
let selectedJsonFile = null;

// Handle file selection
const jsonFileInput = document.getElementById('jsonFileInput');
const selectJsonBtn = document.getElementById('selectJsonBtn');

selectJsonBtn.addEventListener('click', () => {
    jsonFileInput.click();
});

jsonFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                selectedJsonFile = JSON.parse(e.target.result);
                log('✅ JSON file loaded successfully.');
            } catch (error) {
                log('❌ Error parsing JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
});

// Update compareSettings to use the selected JSON file
async function compareSettings() {
    try {
        if (!selectedJsonFile) {
            log('❌ No JSON file selected. Please select a file first.');
            return;
        }

        const settings = selectedJsonFile;
        const results = [];

        for (const setting of settings) {
            const commandResponse = await sendCommandWithResponse(`get ${setting.name}`);

            const valueMatch = commandResponse.match(/=\s*(.+)/);
            if (!valueMatch) {
                results.push({
                    name: setting.name,
                    status: 'error',
                    message: 'Invalid response format'
                });
                continue;
            }

            const actualValue = valueMatch[1].trim();

            let isValid = false;
            if (setting.action === '=') {
                if (Array.isArray(setting.values)) {
                    isValid = setting.values.includes(actualValue);
                } else {
                    isValid = actualValue == setting.value;
                }
            } else if (setting.action === '!=') {
                isValid = actualValue != setting.value;
            }

            results.push({
                name: setting.name,
                status: isValid ? 'pass' : 'fail',
                actualValue,
                expectedValue: setting.value || setting.values
            });
        }

        const outputArea = document.getElementById('output');
        outputArea.innerHTML = '<h3>Settings Check Results</h3>';
        results.forEach(result => {
            const resultText = `Setting: ${result.name}, Status: ${result.status}, Actual: ${result.actualValue}, Expected: ${result.expectedValue}`;
            console.log(resultText);
            const resultElement = document.createElement('div');
            resultElement.textContent = resultText;
            outputArea.appendChild(resultElement);
        });
    } catch (error) {
        console.error('Error comparing settings:', error);
    }
}

// Attach the compareSettings function to the existing button in the HTML file
document.getElementById('compareBtn').addEventListener('click', compareSettings);

// Add a button to trigger the comparison
const compareButton = document.createElement('button');
compareButton.textContent = '🔍 Check Settings';
compareButton.addEventListener('click', compareSettings);
document.body.appendChild(compareButton);