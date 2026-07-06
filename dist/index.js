// src/index.ts
import { Command } from "commander";

// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
var firebaseConfig = {
  apiKey: "AIzaSyA-bIHIzJ22ZEVFDQ6uaOpvwtny_nHKtmw",
  authDomain: "rakibox-72201.firebaseapp.com",
  projectId: "rakibox-72201",
  storageBucket: "rakibox-72201.firebasestorage.app",
  messagingSenderId: "139647750665",
  appId: "1:139647750665:web:981bc7fb927792584f9ed8",
  measurementId: "G-XD2F2K903J"
};
var app = initializeApp(firebaseConfig);
var db = getFirestore(app);

// src/lib/r2.ts
import { S3Client } from "@aws-sdk/client-s3";
var r2 = new S3Client({
  region: "auto",
  endpoint: "https://f96be84ba985f486f6c14f39115fcafc.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "95aa8be23809629532faa6fe71e1a3bd",
    secretAccessKey: "b0ac41c876342529d5ddaaed2f8fd643adfcb0a526a5ec171ac63421152d136a"
  }
});
var BUCKET_NAME = "rakibox";

// src/commands/rakiboxActions.ts
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import pc from "picocolors";
var DEFAULT_BRANCH = "main";
var STAGING_FILE = path.join(process.cwd(), ".rakibox-stage.json");
var CONFIG_FILE = path.join(process.cwd(), ".rakibox.json");
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    if ([
      "node_modules",
      ".git",
      ".rakibox-stage.json",
      ".rakibox.json",
      "dist",
      ".env",
      ".npmrc"
    ].includes(file)) return;
    const absolutePath = path.join(dirPath, file);
    if (fs.statSync(absolutePath).isDirectory()) {
      getAllFiles(absolutePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.relative(process.cwd(), absolutePath));
    }
  });
  return arrayOfFiles;
}
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error(pc.red("\u2716 Error:") + " Project not initialized. Run rakibox init first.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
}
function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
async function initRakibox() {
  console.log(pc.gray("\nInitializing Rakibox workspace..."));
  if (fs.existsSync(CONFIG_FILE)) {
    console.log(pc.yellow("\u26A0 Notice:") + " Rakibox repository is already active here.");
    return;
  }
  const projectID = `repo-${Math.random().toString(36).substring(2, 9)}`;
  saveConfig({ projectID, branch: DEFAULT_BRANCH, remote: null });
  fs.writeFileSync(STAGING_FILE, JSON.stringify([], null, 2));
  console.log(pc.green("\u2714 Success:") + pc.white(` Rakibox workspace initialized successfully.`));
}
function addFiles(paths = ".") {
  console.log(pc.gray("\nStaging files..."));
  const config = loadConfig();
  let filesToStage = [];
  if (paths === ".") {
    filesToStage = getAllFiles(process.cwd());
  } else {
    const pathList = paths.split(" ").filter((p) => p);
    for (const p of pathList) {
      const absolutePath = path.resolve(process.cwd(), p);
      if (fs.existsSync(absolutePath)) {
        if (fs.statSync(absolutePath).isDirectory()) {
          filesToStage.push(...getAllFiles(absolutePath).map((f) => path.relative(process.cwd(), path.resolve(absolutePath, f))));
        } else {
          filesToStage.push(path.relative(process.cwd(), absolutePath));
        }
      }
    }
  }
  fs.writeFileSync(STAGING_FILE, JSON.stringify(filesToStage, null, 2));
  console.log(pc.green("\u2714 Success:") + pc.white(` Staged ${filesToStage.length} files.`));
}
function commit(message) {
  console.log(pc.gray(`
Committing changes...`));
  const config = loadConfig();
  console.log(pc.green("\u2714 Success:") + pc.white(` Commit created with message: "${message}"`));
}
function setBranch(...args) {
  const branchName = args.find((arg) => !arg.startsWith("-")) || "main";
  const config = loadConfig();
  config.branch = branchName;
  saveConfig(config);
  console.log(pc.green("\u2714 Success:") + pc.white(` Switched to branch: ${branchName}`));
}
function addRemote(...args) {
  const url = args.find((arg) => !arg.startsWith("-") && arg !== "add" && arg !== "origin") || args[args.length - 1];
  if (!url || url === "add" || url === "origin") {
    console.error(pc.red("\u2716 Error:") + " Please provide a remote URL");
    process.exit(1);
  }
  const config = loadConfig();
  config.remote = url;
  saveConfig(config);
  console.log(pc.green("\u2714 Success:") + pc.white(` Remote origin set to: ${url}`));
}
async function pushRakibox(message = "Cloud publish checkpoint update") {
  console.log(pc.gray("\nPushing to Rakibox Cloud..."));
  if (!fs.existsSync(STAGING_FILE) || !fs.existsSync(CONFIG_FILE)) {
    console.error(pc.red("\u2716 Error:") + " Project not initialized or no files staged.");
    return;
  }
  const config = loadConfig();
  const stagedFiles = JSON.parse(fs.readFileSync(STAGING_FILE, "utf-8"));
  if (stagedFiles.length === 0) {
    console.error(pc.red("\u2716 Error:") + " No files staged. Run rakibox add . first.");
    return;
  }
  const fileTreeSnapshot = [];
  try {
    console.log(pc.gray("Uploading files to Cloudflare R2..."));
    for (const relativePath of stagedFiles) {
      const fileAbsolutePath = path.resolve(process.cwd(), relativePath);
      if (!fs.existsSync(fileAbsolutePath)) continue;
      const fileBuffer = fs.readFileSync(fileAbsolutePath);
      const contentType = mime.lookup(fileAbsolutePath) || "application/octet-stream";
      const cleanPath = relativePath.replace(/\\/g, "/");
      const r2Path = `${config.projectID}/${config.branch}/${cleanPath}`;
      const publicUrl = `https://pub-904a6a35d4aa484093d0c9d6f913308b.r2.dev/${r2Path}`;
      await r2.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: r2Path,
        Body: fileBuffer,
        ContentType: contentType
      }));
      fileTreeSnapshot.push({
        path: cleanPath,
        url: publicUrl
      });
    }
    console.log(pc.gray("Saving commit to Firestore..."));
    const projectRef = doc(db, "projects", config.projectID);
    const projectDoc = await getDoc(projectRef);
    if (!projectDoc.exists()) {
      await setDoc(projectRef, {
        createdAt: serverTimestamp(),
        branch: config.branch,
        remote: config.remote
      });
    }
    await addDoc(collection(db, "projects", config.projectID, "commits"), {
      branch: config.branch,
      message,
      timestamp: serverTimestamp(),
      tree: fileTreeSnapshot
    });
    fs.writeFileSync(STAGING_FILE, JSON.stringify([], null, 2));
    const remoteUrl = config.remote || "https://rakibox.vercel.app";
    console.log(pc.green("\n\u2714 Success:") + pc.white(` Pushed successfully to ${remoteUrl} (branch: ${config.branch})
`));
  } catch (err) {
    console.error(pc.red("\n\u2716 Error pushing to Rakibox Cloud:"));
    console.error(pc.white(`  ${err instanceof Error ? err.message : String(err)}`));
  }
}

// src/index.ts
var program = new Command();
program.name("rakibox").description("Rakibox - Custom version control system using Firestore and R2").version("1.0.0");
program.command("init").description("Initialize Rakibox workspace").action(async () => await initRakibox());
program.command("add").description("Stage files").argument("[paths...]", "Files or directories to stage", ["."]).action((paths) => addFiles(paths.join(" ")));
program.command("commit").description("Commit staged changes").requiredOption("-m, --message <message>", "Commit message").action((options) => commit(options.message));
program.command("branch").description("Set branch name").allowUnknownOption().argument("[args...]", "Branch arguments (name or -M name)").action((args, options) => {
  const allArgs = process.argv.slice(process.argv.indexOf("branch") + 1);
  setBranch(...allArgs);
});
program.command("remote").description("Add remote URL").argument("[args...]", "Remote arguments (add origin <url> or just <url>)").action((args) => addRemote(...args));
program.command("push").description("Push changes to Rakibox Cloud").allowUnknownOption().argument("[args...]", "Push arguments (message, -u origin main, etc.)").action(async (args) => {
  const allArgs = process.argv.slice(process.argv.indexOf("push") + 1);
  const message = allArgs.find((a) => !a.startsWith("-")) || "Cloud publish checkpoint update";
  await pushRakibox(message);
});
program.parse(process.argv);
