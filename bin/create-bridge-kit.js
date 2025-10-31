#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_NAME = process.argv[2] || 'bridge-kit-app';
const CURRENT_DIR = process.cwd();
const PROJECT_PATH = path.join(CURRENT_DIR, PROJECT_NAME);
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  createDirectory(destDir);
  fs.copyFileSync(src, dest);
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  
  createDirectory(dest);
  
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  });
}

function createProject() {
  // Check if directory already exists
  if (fs.existsSync(PROJECT_PATH)) {
    log(`❌ Directory "${PROJECT_NAME}" already exists!`, 'red');
    process.exit(1);
  }

  log(`\n🚀 Creating bridge kit project: ${PROJECT_NAME}`, 'cyan');
  log(`📍 Location: ${PROJECT_PATH}\n`, 'blue');

  // Create project directory
  createDirectory(PROJECT_PATH);

  // Copy template files
  log('📦 Copying template files...', 'yellow');
  copyDirectory(TEMPLATE_DIR, PROJECT_PATH);

  log('✅ Project scaffolded successfully!', 'green');
  log('\n📋 Next steps:', 'cyan');
  log(`   cd ${PROJECT_NAME}`, 'blue');
  log('   npm install', 'blue');
  log('   npm run dev', 'blue');
  log('\n💡 The bridge modal is ready to use!', 'green');
  log('   Import BridgeModal from src/components/BridgeModal.tsx\n', 'blue');
}

// Run the generator
try {
  createProject();
} catch (error) {
  log(`\n❌ Error creating project: ${error.message}`, 'red');
  process.exit(1);
}

