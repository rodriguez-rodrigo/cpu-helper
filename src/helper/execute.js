const { exec } = require('child_process');
const Sudo = require('sudo-prompt');

const execute = (command) => {
    return new Promise((resolve, reject) => {
        try {
            exec(command, (error, stdout, stderr) => {
                if (!error) {
                    resolve(stdout);
                } else {
                    console.error(error);
                }
            });
        } catch (e) {
            console.error(e);
        }
    });
};

const sudoExecute = (command) => {
    return new Promise((resolve, reject) => {
        try {
            Sudo.exec(command,
                {
                    name: 'Electron',
                    icns: '/Applications/Electron.app/Contents/Resources/Electron.icns', // (optional)
                }, (error, stdout, stderr) => {
                    if (!error) {
                        resolve(stdout);
                    } else {
                        console.error(error);
                    }
                });
        } catch (e) {
            console.error(e);
        }
    });
};

module.exports = {
    execute,
    sudoExecute
}