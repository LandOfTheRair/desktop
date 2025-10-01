const { app, net, protocol } = require("electron");
const md5 = require("md5-file");

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const assetDir = `${app.getAppPath()}/assets`;

fs.mkdirSync(assetDir, { recursive: true });

app.whenReady().then(() => {
  protocol.handle("rairasset", (request) => {
    const { url } = request;
    const realPath = url
      .replace("rairasset://play.rair.land:443/assets", "")
      .replace(/\?[a-zA-Z0-9=]+/g, "");

    const probableLocalFilePath = path.normalize(`${assetDir}/${realPath}`);
    if (fs.existsSync(probableLocalFilePath)) {
      return net.fetch(pathToFileURL(probableLocalFilePath).toString());
    }

    const passthrough = url.replace("rairasset://", "https://");
    return net.fetch(passthrough);
  });
});

app.whenReady().then(async () => {
  const assetsToCache = await fetch(
    "https://play.rair.land/assets/generated/all-hashes.json"
  );
  const assetsJson = await assetsToCache.json();

  Object.keys(assetsJson).forEach(async (key) => {
    const filename = path.basename(key);
    const fullPath = `${assetDir}/${key.replace(filename, "")}`;
    const finalFilePath = `${fullPath}/${filename}`;

    if (fs.existsSync(finalFilePath)) {
      const hash = assetsJson[key];
      const localHash = md5.sync(finalFilePath);
      if (localHash === hash) {
        console.info(`Asset already cached: ${assetDir}/${key}@${hash}`);
        return;
      }
    }

    const url = `https://play.rair.land/assets/${key}`;
    const hash = assetsJson[key];

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    fs.mkdirSync(path.dirname(finalFilePath), { recursive: true });
    fs.writeFileSync(finalFilePath, Buffer.from(buffer));

    console.info(`Cached asset: ${assetDir}/${key}@${hash}`);
  });
});
