import { db } from '../lib/firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import pc from 'picocolors';

const DEFAULT_BRANCH = 'rakibox.vercel.app';
const STAGING_FILE = path.join(process.cwd(), '.rakibox-stage.json');

// --- OUR CENTRALIZED CLOUDFLARE R2 CONFIGURATION ---
// These credentials are baked directly into the library for all users on Earth
const BUCKET_NAME = "rakibox-72201.firebasestorage.app"; // Using your project storage identifier
const r2 = new S3Client({
  region: "auto",
  endpoint: "https://rakibox-72201.r2.cloudflarestorage.com", // Your R2 Account Endpoint
  credentials: {
    accessKeyId: "AIzaSyA-bIHIzJ22ZEVFDQ6uaOpvwtny_nHKtmw", // Your specific master R2 Token ID
    secretAccessKey: "YOUR_CENTRAL_R2_SECRET_KEY_HERE"       // Your master R2 Secret Key
  },
});

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    if ([
      'node_modules', '.git', '.rakibox-stage.json', '.rakibox.json', 
      'dist', '.env', '.npmrc'
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

export async function initRakibox() {
  console.log(pc.gray('\nInitializing global Rakibox workspace...'));
  
  const configPath = path.join(process.cwd(), '.rakibox.json');
  if (fs.existsSync(configPath)) {
    console.log(pc.yellow('⚠ Notice:') + ' Rakibox repository is already active here.');
    return;
  }

  // Generate a unique repository ID for this user's project
  const projectID = `repo-${Math.random().toString(36).substring(2, 9)}`;

  fs.writeFileSync(configPath, JSON.stringify({ projectID, branch: DEFAULT_BRANCH }, null, 2));
  fs.writeFileSync(STAGING_FILE, JSON.stringify([], null, 2));

  console.log(pc.green('✔ Connected:') + pc.white(` Created local repository mapped securely to Rakibox Central.`));
}

export function stageFiles() {
  console.log(pc.gray('\nScanning workspace changes...'));
  if (!fs.existsSync(path.join(process.cwd(), '.rakibox.json'))) {
    console.error(pc.red('✖ Error:') + ' Project not initialized. Run rakibox init first.');
    return;
  }

  const files = getAllFiles(process.cwd());
  fs.writeFileSync(STAGING_FILE, JSON.stringify(files, null, 2));

  console.log(pc.green('✔ Staged:') + pc.white(` Tracking ${files.length} files successfully.`));
}

export async function pushRakibox(message: string) {
  console.log(pc.gray('\nStreaming files securely to Rakibox Cloud servers...'));
  
  if (!fs.existsSync(STAGING_FILE) || !fs.existsSync(path.join(process.cwd(), '.rakibox.json'))) {
    console.error(pc.red('✖ Error:') + ' Missing initialization layout configurations.');
    return;
  }

  const { projectID, branch } = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.rakibox.json'), 'utf-8'));
  const stagedFiles: string[] = JSON.parse(fs.readFileSync(STAGING_FILE, 'utf-8'));

  const fileTreeSnapshot: Array<{ path: string; cloudUrl: string }> = [];

  for (const relativePath of stagedFiles) {
    const fileAbsolutePath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(fileAbsolutePath)) continue;

    const fileBuffer = fs.readFileSync(fileAbsolutePath);
    const contentType = mime.lookup(fileAbsolutePath) || 'application/octet-stream';
    const cleanPath = relativePath.replace(/\\/g, '/');
    
    // Structured cloud tracking filename keys
    const cloudKey = `public/${projectID}/${branch}/${cleanPath}`;

    // Upload to OUR central storage directly
    await r2.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cloudKey,
      Body: fileBuffer,
      ContentType: contentType
    }));

    fileTreeSnapshot.push({
      path: cleanPath,
      cloudUrl: `https://rakibox.vercel.app/cdn/${cloudKey}` // Public file URL format matching your domain branch preference
    });
  }

  // Record snapshot state to OUR Firebase Firestore database
  console.log(pc.gray('Finalizing tracking tree records on Firestore...'));
  await addDoc(collection(db, 'projects', projectID, 'commits'), {
    branch,
    message,
    timestamp: serverTimestamp(),
    tree: fileTreeSnapshot
  });

  fs.writeFileSync(STAGING_FILE, JSON.stringify([], null, 2));
  console.log(pc.green('\n✔ Success:') + pc.white(` Successfully deployed to https://rakibox.vercel.app [Branch: ${branch}]\n`));
}