import { LOG } from '../log/log';
const execSync = require('child_process').execSync;
export const command = (command: string, doLog = false, showError = false) => {
    let output: string = '';
    let errorText: string = '';
    try {
        output = execSync(`${command}`, { 
            timeout: 50000,
            maxBuffer: 150 * 1024 * 1024 
        }); // 10000
    } catch (e: any) {
        errorText = e;
    }
    if (doLog) {
        LOG.DEBUG(`${output.toString()}`);
    }
    if (showError && errorText !== '') {
        LOG.FAIL(`${errorText}`);
        LOG.DEBUG(`${output.toString()}`);
    }
    return output.toString();
};
export const commandSafe = (cmd: string): string[] => {
    const result = command(cmd);
    if (!result || result.trim() === '') {
        return [];
    }
    const allLines = result
        .split(/\r?\n|\r/)
        .map((line) => line.trim())
        .filter((line) => line !== '');
    return allLines;
};
export const commandSafeFirst = (cmd: string): string => {
    const result = commandSafe(cmd);
    return result && result.length > 0 ? result[0] : '';
};

export const getCommandName = (command: string): string => {
    let result = '';
    const parts = command.trim().toLowerCase().split(/\s+/); //remove spaces
    if (parts.length > 0) {
        const cmdName = parts[0].replace('(', '').replace(')', '');
        result = cmdName;
    }
    return result;
};