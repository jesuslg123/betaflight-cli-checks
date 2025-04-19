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