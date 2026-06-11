import { execFile } from "node:child_process";

export const decompiledBridgeSnippets = [
  "Origin check used a substring match for driverhub.asus.com before accepting the RPC request.",
  "Update URL validation used a substring match for .asus.com before calling the updater.",
  'fetch("http://127.0.0.1:53000/asus/v1.0/UpdateApp", { method: "POST" });',
  "UpdateApp manifest: download signed installer from https://driverhub.asus.com/AsusSetup.exe",
];

export const runDownloadedInstaller = (installerPath: string) => execFile(installerPath, ["-s"]);
