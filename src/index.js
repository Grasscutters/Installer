/* Imports. */
const util = require('util');
const fs = require('fs');
const os = require('os');
const fse = require('fs-extra');
const stream = require('stream');
const unzip = require('unzipper');
const readline = require('readline-sync');
const fetch = require('node-fetch');

const {extractFull} = require('node-7z');
const {exec} = require('child_process');

/* Constants. */
const tempDirectory = os.tmpdir();
const installPath = `${process.env.LOCALAPPDATA}/Grasscutters`;
const execute = util.promisify(exec);
const streamPipeline = util.promisify(stream.pipeline);
const pathTo7zip = require('7zip-bin').path7za;

/* Localization. */
const languages = {
    en: require("../resources/en-US.json"),
    cn: require("../resources/zh-CN.json")
};

let messages = undefined;

function getMessage(...key) {
    let message = '';
    key.forEach(k => message += messages[k] + "\n");
    return message;
}

/* Utilities. */
function asDownload(user, repo, file) {
    return `https://github.com/${user}/${repo}/releases/latest/download/${file}`;
}

async function downloadAndInstall(application, file, installCallback = undefined) {
    const downloadUrl = asDownload("Grasscutters", application, file);
    
    const response = await fetch(downloadUrl);
    await streamPipeline(response.body, fs.createWriteStream(`${tempDirectory}/${file}`));
    
    if(installCallback) await installCallback(`${tempDirectory}/${file}`);
}

async function extractTo(file, destination) {
    const contents = fs.createReadStream(file);
    contents.pipe(unzip.Extract({path: destination}));
}

function exit() {
    console.log("Press any key to return to the main menu.");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', mainMenu);
}

/* Callbacks. */
async function installGrasscutter(file) {
    console.clear();
    console.log("Grasscutter has started installing. This may take a while.");
    
    // Make install directory.
    if(!fs.existsSync(`${installPath}/Grasscutter`))
        fs.mkdirSync(`${installPath}/Grasscutter`);
    
    // Copy file and remove temporary file.
    fs.copyFileSync(file, `${installPath}/Grasscutter/grasscutter.jar`);
    fs.unlinkSync(file);
    
    // Working directory for Grasscutter.
    const workingDir = `${installPath}/Grasscutter`;
    if(!fs.existsSync(`${workingDir}/resources`))
        fs.mkdirSync(`${workingDir}/resources`);
    
    // Clone required repositories.
    console.log("Downloading files from repositories...");
    
    await execute("git clone https://github.com/Dimbreath/GenshinData");
    const genshinData = `${process.cwd()}/GenshinData`;
    
    await execute("git clone https://github.com/radioegor146/gi-bin-output");
    const giBinOutput = `${process.cwd()}/gi-bin-output`;
    
    await execute("git clone https://github.com/Grasscutters/Grasscutter-Protos");
    const grasscutterProtos = `${process.cwd()}/Grasscutter-Protos`;
    
    await execute("git clone https://github.com/Grasscutters/Grasscutter");
    const grasscutter = `${process.cwd()}/Grasscutter`;
    
    console.log("Finishing downloading files!");
    
    // Copy required files to destination.
    console.log("Copying files...");
    const copyOptions = {overwrite: false};
    
    fse.copySync(`${genshinData}/TextMap`, `${workingDir}/resources/TextMap`, copyOptions);
    fse.copySync(`${genshinData}/Subtitle`, `${workingDir}/resources/Subtitle`, copyOptions);
    fse.copySync(`${genshinData}/Readable`, `${workingDir}/resources/Readable`, copyOptions);
    fse.copySync(`${genshinData}/ExcelBinOutput`, `${workingDir}/resources/ExcelBinOutput`, copyOptions);
    
    fse.copySync(`${giBinOutput}/2.5.52/Data/_BinOutput`, `${workingDir}/resources/BinOutput`, copyOptions);
    
    fse.copySync(`${grasscutterProtos}/proto`, `${workingDir}/proto`, copyOptions);
    
    fse.copySync(`${grasscutter}/keys`, `${workingDir}/keys`, copyOptions);
    fse.copySync(`${grasscutter}/data`, `${workingDir}/data`, copyOptions);
    fs.copyFileSync(`${grasscutter}/keystore.p12`, `${workingDir}/keystore.p12`);
    console.log("Finishing copying files!");
    
    // Cleanup.
    console.log("Cleaning up...");
    const removeOptions = {recursive: true, force: true};
    
    fs.rmSync(genshinData, removeOptions);
    fs.rmSync(giBinOutput, removeOptions);
    fs.rmSync(grasscutterProtos, removeOptions);
    fs.rmSync(grasscutter, removeOptions);
    
    console.log("Finished installing Grasscutter!"); exit();
}

async function installGrassclipper() {
    console.clear();
    
    const downloadUrl = asDownload("Grasscutters", "GrassClipper", "GrassClipper.zip");
    const response = await fetch(downloadUrl);
    
    console.log("GrassClipper has started installing. This may take a while.");
    await streamPipeline(response.body, unzip.Extract({path: `${installPath}`}));
    console.log("Finished downloading & extracting archive!");
    
    console.log("Finished installing GrassClipper!"); exit();
}

async function installGrassclipperX(file) {
    console.clear();
    console.log("GrassClipper has started installing. This may take a while.");
    
    console.log("Extracting archive...");
    const extract = extractFull(file, `${installPath}/GrassClipper-X`, {$bin: pathTo7zip});
    
    extract.on('end', () => {
        console.log("Finished extracting archive!");
        
        // Cleanup.
        console.log("Cleaning up...");
        fs.unlinkSync(`${tempDirectory}/GrassClipper-X-1.0.0-win-x64.7z`);
        
        console.log("Finished installing GrassClipper!"); exit();
    });
}

/* Screens. */
async function languagePicker() {
    const language = readline.question("Which language should the installer display text in?\n" +
        "1) en-US (English)" + "\n" + 
        "2) zh-CN (Chinese Simplified)" + "\n"
    );
    
    let langCode = "en";
    switch(language) {
        case "1":
            langCode = "en";
            break;
        case "2":
            langCode = "cn";
            break;
    }
    
    messages = languages[langCode];
    mainMenu(); // Forward to main menu.
}

async function mainMenu() {
    console.clear();
    
    const install = readline.question(getMessage("main.install") + "\n" +
        "1) " + getMessage("names.grasscutter") +
        "2) " + getMessage("names.grassclipper") +
        "3) " + getMessage("names.grassclipper_x") +
        "4) " + getMessage("main.install.exit")
    );
    
    switch(install) {
        case "1":
            await downloadAndInstall("Grasscutter", "grasscutter.jar", installGrasscutter);
            break;
        case "2":
            installGrassclipper();
            break;
        case "3":
            await downloadAndInstall("GrassClipper-X", "GrassClipper-X-1.0.0-win-x64.7z", installGrassclipperX);
            break;
        case "4":
            process.exit(0);
            return;
    }
}

/* Pre-execution tasks. */
if(!fs.existsSync(installPath))
    fs.mkdirSync(installPath);
/* Show screen. */
languagePicker();