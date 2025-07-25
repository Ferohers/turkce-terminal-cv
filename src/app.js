/**
 * @typedef Command
 * @property {string} command
 * @property {string} responseType
 * @property {string?} value
 * @property {string[]?} headers
 * @property {string[]?} rows
 */

/**
 * @type {Command[]} commands
 */
import commands from "./resources/commands.json";
import {
    getCV,
    pif,
    rmRf,
    setDarkMode,
    setHalloweenTheme,
    showSanta,
    showSantaAndRemoveListener
} from "./custom-comands";
import { stringToDom } from "./utils";
import { dragElement } from "./draggable";
import DOMPurify from 'dompurify';

// Table containing the orders (useful for the completion of the orders)
let commandsList = [];
commands.forEach((c) => {
  commandsList.push(c.command);
});

// Commands that require JS processing
const customCommands = ["temizle", "karanlık", "aydınlık", "cv indir", "pwd", "git"];
commandsList = commandsList.concat(customCommands);

// Eyster eggs' commands not available for autocompletion
const hiddenCommands = ["pif", "rm -rf /", "cd", "ls"];

// Added the ability to move the window for PCs
if (window.innerWidth > 1024) {
  dragElement(document.querySelector(".terminal"));
}

// Order history table
const commandsHistory = [];
let historyMode = false;
let historyIndex = -1;
const terminalBody = document.querySelector(".terminal__body");

// Adding the default line
addNewLine();

// December Easter egg, adding snowflakes
const now = new Date();
if (now.getMonth() === 11) {
  let htmlFlakes = "";
  for (let i = 0; i < 6; i++) {
    htmlFlakes += `<div class="snowflake">❅</div><div class="snowflake">❆</div>`;
  }
  const html = `<div class="snowflakes" aria-hidden="true">${htmlFlakes}</div>`;
  document.body.append(stringToDom(html));
}

// Christmas Easter egg, adding Santa
if (now.getMonth() === 11) {
  document.addEventListener('click', showSantaAndRemoveListener);
}


// Easter egg for Halloween, adding bats
if (now.getMonth() === 9 && now.getDate() >= 28) {
  setHalloweenTheme();
}


// Set to dark mode if the browser theme is dark
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  setDarkMode(true);
}

/**
 * Returns the HTML of the response for a given command
 * @param {string} command
 */
function getDomForCommand(command) {
  const commandObj = commands.find((el) => el.command === command);
  let purifiedCommand = DOMPurify.sanitize(command);
  purifiedCommand = purifiedCommand.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  console.log(purifiedCommand)
  let html = "";
  if (commandObj === undefined) {
    html = `zsh: komut bulunamadı: '${
      purifiedCommand.split(" ")[0]
    }' `;
  } else {
    if (commandObj.responseType === "list" && Array.isArray(commandObj.value)) {
      html = "<ul>";
      html += commandObj.value.map((s) => `<li>${s}</li>`).join("");
      html += "</ul>";
    } else if (commandObj.responseType === "text") {
      html = commandObj.value;
    } else if (commandObj.responseType === "table") {
      const headers = commandObj.headers;
      const rows = commandObj.rows;
      const thsHtml = headers.map((h) => `<th>${h}</th>`).join("");
      const tdsHtml = rows
        .map((r) => `<tr>${r.map((rtd) => `<td>${rtd}</td>`).join("")}</tr>`)
        .join("");
      html = `<table><thead><tr>${thsHtml}</tr></thead><tbody>${tdsHtml}</tbody></table>`;
    } else if (commandObj.responseType === "code") {
      html = `<pre>${commandObj.value.join("\n")}</pre>`;
    }
  }

  return html;
}

/**
 * Adds a new command input line and disables the previous one.
 * @param {string|null} previousUid uid de la ligne précédente.
 */
function addNewLine(previousUid = null) {
  const uid = Math.random().toString(36).replace("0.", "");
  // terminal__line
  const terminalLineEl = document.createElement("div");
  terminalLineEl.classList.add("terminal__line");

  // terminal__response
  const terminalResponseEl = document.createElement("div");
  terminalResponseEl.classList.add("terminal__response");
  terminalResponseEl.id = `response-${uid}`;

  // input text
  const inputEl = document.createElement("input");
  inputEl.type = "text";
  inputEl.id = `input-${uid}`;
  inputEl.autocapitalize = "off";
  inputEl.dataset.uid = uid;
  inputEl.dataset.active = "1"; // Needed for focus
  inputEl.addEventListener("keydown", onCommandInput);

  terminalLineEl.appendChild(inputEl);
  if (previousUid) {
    const previousInputEl = document.getElementById(previousUid);
    if (previousInputEl) {
      previousInputEl.setAttribute("disabled", "true");
      previousInputEl.removeEventListener("keydown", onCommandInput);
      delete previousInputEl.dataset.active;
    }
  }
  document.getElementById("terminal").appendChild(terminalLineEl);
  document.getElementById("terminal").appendChild(terminalResponseEl);

  inputEl.focus(); // Adds the focus as soon as the field is created
}

/**
 * Manages the keydown on the command input.
 * @param e
 */
function onCommandInput(e) {
  const commandValue = e.target.value.trim().toLowerCase();
  if (e.keyCode === 13) {
    // ENTER
    if (commandValue !== "") {
      historyMode = false;
      const idResponse = `response-${e.target.dataset.uid}`;
      const responseEl = document.getElementById(idResponse);
      let html;
      if (
        hiddenCommands.includes(commandValue) ||
        customCommands.includes(commandValue)
      ) {
        html = handleCustomCommands(commandValue);
      } else {
        html = getDomForCommand(commandValue);
      }
      if (responseEl) {
        responseEl.innerHTML = html;
        commandsHistory.push(commandValue);
        addNewLine(e.target.id);
      }
    }
  } else if (e.keyCode === 9) {
    // TAB
    e.preventDefault();
    if (commandValue === "") {
      this.value = "help";
    } else {
      const matchingCommand = commandsList.find((c) =>
        c.startsWith(commandValue)
      );
      if (matchingCommand) {
        this.value = matchingCommand;
      }
    }
    historyMode = false;
  } else if (e.keyCode === 38 || e.keyCode === 40) {
    // UP / DOWN
    // History management
    if (commandsHistory.length > 0) {
      if (historyMode === false) {
        historyIndex = commandsHistory.length - 1;
      } else {
        if (e.keyCode === 38 && historyIndex !== 0) {
          // UP
          historyIndex--;
        } else if (
          e.keyCode === 40 &&
          historyIndex !== commandsHistory.length - 1
        ) {
          historyIndex++;
        }
      }
      this.value = commandsHistory[historyIndex];
    }
    historyMode = true;
  }
}

/**
 * Allows to manage hidden commands (not proposed in the autocompletion)
 * @param {string} command
 * @returns {string|void} Html to be displayed in the response of the command
 */
function handleCustomCommands(command) {
  switch (command) {
    case "pif":
      pif();
      return "Hadi bakalım !!!";
    case "aydınlık":
      if (!document.body.classList.contains("dark-mode"))
        return "Zaten aydınlık moddasın.";
      setDarkMode(false);
      return "Şimdi aydınlık moda geçtin.";
    case "karanlık":
      if (document.body.classList.contains("dark-mode"))
        return "Zaten karanlık moddasın.";
      setDarkMode(true);
      return "Şimdi karanlık moda geçtin.";
    case "cv indir":
      getCV();
      return "CV indiriliyor.";
    case "git":
      return "Zavallı bir html dosyasına git komutu yazdın.";
    case "pwd":
      return "/Users/altan/Documents/project-cv";
    case "rm -rf /":
      rmRf();
      return "🎆 Bunu yazmaman gerekiyordu... ama artık çok geç.";
    case "temizle":
      terminalBody.innerHTML = `<div id="terminal"></div>`;
      return;
case "ls":
  return `<pre>
Dockerfile           dist                 package-lock.json
LICENCE              docker-compose.yml   package.json
README.md            node_modules         src
</pre>`;
    case "cd":
      return "Bu işleme izin verilmedi. Başka klasöre geçme yetkiniz yok.";
  }
}

// ------------------------------------------------------------------------------------
//                                EVENT LISTENNER
// ------------------------------------------------------------------------------------

// Added focus on the input even if you click on the body (to keep the cursor)
document.body.addEventListener("click", function (e) {
  if (e.target.tagName !== "INPUT") {
    const activeInput = document.querySelector("input[data-active]");
    activeInput.focus();
  }
});

document.querySelector(".fake-close").addEventListener("click", function (e) {
  const terminalEl = document.querySelector(".terminal");
  terminalEl.parentElement.removeChild(terminalEl);
});
