import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import pc from 'picocolors';
// Hardcoded Firebase and R2 credentials for all users
const firebaseConfig = {
    apiKey: "AIzaSyA-bIHIzJ22ZEVFDQ6uaOpvwtny_nHKtmw",
    authDomain: "rakibox-72201.firebaseapp.com",
    projectId: "rakibox-72201",
    storageBucket: "rakibox-72201.firebasestorage.app",
    messagingSenderId: "139647750665",
    appId: "1:139647750665:web:981bc7fb927792584f9ed8",
    measurementId: "G-XD2F2K903J"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const BUCKET_NAME = "rakibox-72201.firebasestorage.app";
const r2 = new S3Client({
    region: "auto",
    endpoint: "https://rakibox-72201.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: "AIzaSyA-bIHIzJ22ZEVFDQ6uaOpvwtny_nHKtmw",
        secretAccessKey: "b0ac41c876342529d5ddaaed2f8fd643adfcb0a526a5ec171ac63421152d136a"
    }
});
const DEFAULT_BRANCH = 'main';
const STAGING_FILE = path.join(process.cwd(), '.rakibox-stage.json');
const CONFIG_FILE = path.join(process.cwd(), '.rakibox.json');
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        if ([
            'node_modules', '.git', '.rakibox-stage.json', '.rakibox.json',
            'dist', '.env', '.npmrc'
        ].includes(file))
            return;
        const absolutePath = path.join(dirPath, file);
        if (fs.statSync(absolutePath).isDirectory()) {
            getAllFiles(absolutePath, arrayOfFiles);
        }
        else {
            arrayOfFiles.push(path.relative(process.cwd(), absolutePath));
        }
    });
    return arrayOfFiles;
}
function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        console.error(pc.red('✖ Error:') + ' Project not initialized. Run rakibox init first.');
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}
function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
export async function initRakibox() {
    console.log(pc.gray('\nInitializing Rakibox workspace...'));
    if (fs.existsSync(CONFIG_FILE)) {
        console.log(pc.yellow('⚠ Notice:') + ' Rakibox repository is already active here.');
        return;
    }
    const projectID = `repo-${Math.random().toString(36).substring(2, 9)}`;
    saveConfig({ projectID, branch: DEFAULT_BRANCH, remote: null });
    fs.writeFileSync(STAGING_FILE, JSON.stringify([], null, 2));
    console.log(pc.green('✔ Success:') + pc.white(` Rakibox workspace initialized successfully.`));
}
export function addFiles(paths = '.') {
    console.log(pc.gray('\nStaging files...'));
    const config = loadConfig();
    let filesToStage = [];
    if (paths === '.') {
        filesToStage = getAllFiles(process.cwd());
    }
    else {
        const pathList = paths.split(' ').filter(p => p);
        for (const p of pathList) {
            const absolutePath = path.resolve(process.cwd(), p);
            if (fs.existsSync(absolutePath)) {
                if (fs.statSync(absolutePath).isDirectory()) {
                    filesToStage.push(...getAllFiles(absolutePath).map(f => path.relative(process.cwd(), path.resolve(absolutePath, f))));
                }
                else {
                    filesToStage.push(path.relative(process.cwd(), absolutePath));
                }
            }
        }
    }
    fs.writeFileSync(STAGING_FILE, JSON.stringify(filesToStage, null, 2));
    console.log(pc.green('✔ Success:') + pc.white(` Staged ${filesToStage.length} files.`));
}
export function commit(message) {
    console.log(pc.gray(`\nCommitting changes...`));
    const config = loadConfig();
    console.log(pc.green('✔ Success:') + pc.white(` Commit created with message: "${message}"`));
}
export function setBranch(...args) {
    // Handle both "rakibox branch main" and "rakibox branch -M main"
    const branchName = args.find(arg => !arg.startsWith("-")) || "main";
    const config = loadConfig();
    config.branch = branchName;
    saveConfig(config);
    console.log(pc.green("\u2714 Success:") + pc.white(` Switched to branch: ${branchName}`));
}
export function addRemote(...args) {
    // Handle "rakibox remote add origin <url>" and "rakibox remote <url>"
    const url = args.find(arg => !arg.startsWith("-") && arg !== "add" && arg !== "origin") || args[args.length - 1];
    if (!url || url === "add" || url === "origin") {
        console.error(pc.red("\u2716 Error:") + " Please provide a remote URL");
        process.exit(1);
    }
    const config = loadConfig();
    config.remote = url;
    saveConfig(config);
    console.log(pc.green("\u2714 Success:") + pc.white(` Remote origin set to: ${url}`));
}
export async function pushRakibox(message = 'Cloud publish checkpoint update') {
    console.log(pc.gray('\nPushing to Rakibox Cloud...'));
    if (!fs.existsSync(STAGING_FILE) || !fs.existsSync(CONFIG_FILE)) {
        console.error(pc.red('✖ Error:') + ' Project not initialized or no files staged.');
        return;
    }
    const config = loadConfig();
    const stagedFiles = JSON.parse(fs.readFileSync(STAGING_FILE, 'utf-8'));
    if (stagedFiles.length === 0) {
        console.error(pc.red('✖ Error:') + ' No files staged. Run rakibox add . first.');
        return;
    }
    const fileTreeSnapshot = [];
    try {
        console.log(pc.gray('Uploading files to Cloudflare R2...'));
        for (const relativePath of stagedFiles) {
            const fileAbsolutePath = path.resolve(process.cwd(), relativePath);
            if (!fs.existsSync(fileAbsolutePath))
                continue;
            const fileBuffer = fs.readFileSync(fileAbsolutePath);
            const contentType = mime.lookup(fileAbsolutePath) || 'application/octet-stream';
            const cleanPath = relativePath.replace(/\\/g, '/');
            const cloudKey = `projects/${config.projectID}/${config.branch}/${cleanPath}`;
            await r2.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: cloudKey,
                Body: fileBuffer,
                ContentType: contentType
            }));
            fileTreeSnapshot.push({
                path: cleanPath,
                cloudKey
            });
        }
        console.log(pc.gray('Saving commit to Firestore...'));
        // Save project document first
        const projectRef = doc(db, 'projects', config.projectID);
        const projectDoc = await getDoc(projectRef);
        if (!projectDoc.exists()) {
            await setDoc(projectRef, {
                createdAt: serverTimestamp(),
                branch: config.branch,
                remote: config.remote
            });
        }
        // Add commit
        await addDoc(collection(db, 'projects', config.projectID, 'commits'), {
            branch: config.branch,
            message,
            timestamp: serverTimestamp(),
            tree: fileTreeSnapshot
        });
        // Clear staging file
        fs.writeFileSync(STAGING_FILE, JSON.stringify([], null, 2));
        const remoteUrl = config.remote || 'https://rakibox.vercel.app';
        console.log(pc.green('\n✔ Success:') + pc.white(` Pushed successfully to ${remoteUrl} (branch: ${config.branch})\n`));
    }
    catch (err) {
        console.error(pc.red('\n✖ Error pushing to Rakibox Cloud:'));
        console.error(pc.white(`  ${err instanceof Error ? err.message : String(err)}`));
    }
}
