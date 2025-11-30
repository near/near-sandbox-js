#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const NEARCORE_REPO = 'near/nearcore';
const CONSTANTS_TS_PATH = 'src/constants.ts'
async function makeRequest(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.text();
}

async function getLatestNearCoreVersion() {
    try {
        const url = `https://api.github.com/repos/${NEARCORE_REPO}/releases/latest`;
        const data = await makeRequest(url);
        const release = JSON.parse(data);
        const version = release.tag_name.replace(/^v/, '');
        console.log(`Latest NEAR Core version: ${version} (released on ${release.published_at})`);
        return { version, releaseDate: release.published_at };
    } catch (error) {
        console.error('Error fetching latest NEAR Core version:', error.message);
        throw error;
    }
}

function getCurrentVersion() {
    try {
        const constantsTsPath = path.join(process.cwd(), CONSTANTS_TS_PATH);
        const content = fs.readFileSync(constantsTsPath, 'utf8');
        const match = content.match(/DEFAULT_NEAR_SANDBOX_VERSION = "([^"]+)"/);

        if (!match) {
            throw new Error('Could not find DEFAULT_NEAR_SANDBOX_VERSION in constants.ts');
        }

        const version = match[1];
        console.log(`Current NEAR Core version: ${version}`);
        return version;
    } catch (error) {
        console.error('Error reading current version:', error.message);
        throw error;
    }
}

function updateConstantsTs(newVersion) {
    try {
        const constantsPath = path.join(process.cwd(), CONSTANTS_TS_PATH);
        let content = fs.readFileSync(constantsPath, 'utf8');

        content = content.replace(
            /DEFAULT_NEAR_SANDBOX_VERSION = "[^"]+"/,
            `DEFAULT_NEAR_SANDBOX_VERSION = "${newVersion}"`
        );

        fs.writeFileSync(constantsPath, content, 'utf8');
        console.log(`Updated ${CONSTANTS_TS_PATH} with version ${newVersion}`);
    } catch (error) {
        console.error('Error updating constants.ts:', error.message);
        throw error;
    }
}

async function main() {
    console.log('🔍 Checking for NEAR Core updates...\n');

    try {
        const currentVersion = getCurrentVersion();
        const { version: latestVersion, releaseDate } = await getLatestNearCoreVersion();

        if (currentVersion === latestVersion) {
            console.log('\n✅ No update needed. Current version is up to date.');
            return;
        }

        console.log(`\n🔄 Update needed: ${currentVersion} → ${latestVersion}\n`);

        updateConstantsTs(latestVersion, releaseDate);

        console.log('\n✅ Files updated successfully. Changes will be detected by git status.');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
}); 
