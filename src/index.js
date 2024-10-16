const { app, BrowserWindow, shell } = require("electron");
const DiscordRPC = require("discord-rpc");
const startCase = require("lodash.startcase");
const path = require("path");
const { autoUpdater } = require("electron-updater");

const Config = require("electron-config");
const config = new Config();

console.log(process.argv);

const showDevTools = process.argv.includes("--dev");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

let mainWindow;

const createWindow = () => {
  const opts = {
    show: false,
    icon: __dirname + "/favicon.ico",
  };

  Object.assign(opts, config.get("winBounds"));

  if (!opts.height) opts.height = 900;
  if (!opts.width) opts.width = 1300;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    ...opts,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      nativeWindowOpen: true,
    },
  });

  mainWindow.setMenu(null);
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    autoUpdater.checkForUpdatesAndNotify();
  });

  mainWindow.on("close", () => {
    config.set("winBounds", mainWindow.getBounds());
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open the DevTools.
  if (showDevTools) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("web-contents-created", (e, contents) => {
  if (contents.getType() === "webview") {
    contents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });

    contents.addListener("will-navigate", (e, url) => {
      e.preventDefault();
      shell.openExternal(url);
    });
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const DISCORD_CLIENT_ID = "410478620096856064";

DiscordRPC.register(DISCORD_CLIENT_ID);

let startTimestamp;

const rpc = new DiscordRPC.Client({ transport: "ipc" });

const setActivity = () => {
  if (!rpc || !mainWindow) return;

  mainWindow.webContents
    .executeJavaScript(
      'document.getElementById("game").executeJavaScript("window.discordGlobalCharacter")'
    )
    .then(function (char) {
      if (!char) {
        rpc.clearActivity();
        startTimestamp = null;
        return;
      }

      if (!startTimestamp) startTimestamp = new Date();

      rpc.setActivity({
        startTimestamp,
        state: "Playing",
        details: "In " + startCase(char.map).split("Dungeon").join("(Dungeon)"),
        largeImageKey: char._gameImage || "game-image",
        largeImageText: "Level " + char.level + " " + char.baseClass,
      });
    });
};

rpc.on("ready", function () {
  setActivity();

  setInterval(function () {
    setActivity();
  }, 15000);
});

rpc.login({ clientId: DISCORD_CLIENT_ID }).catch(function (err) {
  console.error(err);
});
