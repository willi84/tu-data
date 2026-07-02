import { LogItem } from '../gitlab/gitlab';
import { colors } from './../colors';
import * as path from 'path';
// TODO: move to other file
// const isMicrosoft = os.release().toLocaleLowerCase().includes('microsoft');
// const hasLinuxPlattform = process.platform.includes('linux');
// const isVSCode = (process.env.TERM_PROGRAM && process.env.TERM_PROGRAM.includes('vscode'));
// let noEmojis = isMicrosoft && hasLinuxPlattform && (!isVSCode);
// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color

export enum LogType {
    OK = 'OK',
    FAIL = 'FAIL',
    WARN = 'WARN',
    NEWLINE = 'NEWLINE',
    INFO = 'INFO',
    DEFAULT = 'DEFAULT',
    INLINE = 'INLINE',
    DEBUG = 'DEBUG',
}

export type COLOR_SET = {
    id: string;
    fg: string;
    bg: string;
};
export const COLOR_SETS = {
    [LogType.OK]: { id: 'OK', fg: colors.FgBlack, bg: colors.BgGreen },
    [LogType.FAIL]: { id: 'FAIL', fg: colors.FgWhite, bg: colors.BgRed },
    [LogType.WARN]: { id: 'WARN', fg: colors.FgWhite, bg: colors.BgYellow },
    [LogType.INFO]: { id: 'INFO', fg: colors.FgBlack, bg: colors.BgWhite },
    [LogType.DEFAULT]: {
        id: 'DEFAULT',
        fg: colors.FgWhite,
        bg: colors.BgBlack,
    },
    [LogType.INLINE]: { id: 'INLINE', fg: colors.FgWhite, bg: colors.BgBlack },
    [LogType.DEBUG]: { id: 'DEBUG', fg: colors.FgBlack, bg: colors.BgWhite },
    // [LogType.NEWLINE]: { id: 'NEWLINE', fg: colors.FgWhite, bg: colors.BgBlack },
};
const getColorSet = (type: LogType): COLOR_SET => {
    const resolvedType = type as keyof typeof COLOR_SETS;
    const colorSet: COLOR_SET = COLOR_SETS[resolvedType] as COLOR_SET;
    return colorSet;
};
export type LogOpts = {
    icon?: string;
    newline?: boolean;
};
const makeLogger = (type: LogType) => (msg: string, opts?: LogOpts) => {
    LOG.logger(type, msg, opts || { icon: '', newline: false });
};

export const colorize = (msg: string, bg: string, fg: string) => {
    const colorSet = ` ${fg} ${bg} `;
    const result = `${colorSet}  ${msg}  ${colors.Reset} `;
    return msg !== '' ? `${result}` : '';
};

export class LOG {
    static colorize = colorize;
    static output = (msg: string) => {
        process.stdout.write(`${msg}`);
    };
    static logger(type: LogType, msg: string, opts?: LogOpts) {
        const color = getColorSet(type);
        const icon = opts?.icon || '';
        const isInline = type === LogType.INLINE || type === LogType.DEFAULT;
        const needSpaces = type.length < 4;
        const spaces = needSpaces ? ' '.repeat((4 - type.length) / 2) : '';
        const txt = isInline ? '' : `[${spaces}${color.id}${spaces}]`;
        const status = LOG.colorize(txt, color.bg, color.fg);
        const isNewline = type !== LogType.INLINE;
        LOG.output(`${status}${icon}${msg}${isNewline ? '\n' : ''}`);
    }
    static OK = makeLogger(LogType.OK);
    static FAIL = makeLogger(LogType.FAIL);
    static WARN = makeLogger(LogType.WARN);
    static INFO = makeLogger(LogType.INFO);
    static DEFAULT = makeLogger(LogType.DEFAULT);
    static INLINE = makeLogger(LogType.INLINE);
    static DEBUG = makeLogger(LogType.DEBUG);
}
export const getCallerInfo = (
    classHint?: string,
    depth: number = 2
): string => {
    const stack = new Error().stack;
    if (!stack) return '(unknown)';

    const lines = stack.split('\n');
    const callerLine = lines[depth] || '';

    let match = callerLine.match(/at\s+(.*?)\s+\((.+):(\d+):(\d+)\)/);
    if (!match) {
        match = callerLine.match(/\s*at\s+(.*):(\d+):(\d+)/);
        if (!match) return '(unknown)';
        const [, file, line] = match;
        const relFile = path.relative(process.cwd(), file);
        return `anonymous()@${relFile}:${line}`;
    }

    const [, rawFn, file, line] = match;
    const relFile = path.relative(process.cwd(), file);

    const fn = rawFn
        .replace(/^Object\./, '')
        .replace(/^Function\./, '')
        .replace(/<anonymous>/, 'anonymous');

    const finalFn = classHint ? `${classHint}.${fn}` : fn;

    return `${finalFn}()@${relFile}:${line}`;
};
export const CI = getCallerInfo;

// export const _LOGGER = (type: LogType, msg: string, items: LogItem[]) => {
//     const time = new Date().getTime();
//     const logItem: LogItem = {
//         message: msg,
//         type,
//         time,
//     };
//     items.push(logItem);
// };
export class _LOG {
    items: LogItem[];
    constructor() {
        this.items = [];
    }
    doLog(type: LogType, msg: string, items: LogItem[], telemetry: any = {}) {
        const time = new Date().getTime();
        const logItem: LogItem = {
            message: msg,
            type,
            time,
            telemetry,
        };
        items.push(logItem);
    }
    getItems() {
        return this.items.map((item: LogItem) => {
            return {
                message: item.message,
                type: item.type,
            };
        });
    }

    OK(msg: string, telemetry: any = {}) {
        this.doLog(LogType.OK, msg, this.items, telemetry);
    }
    FAIL(msg: string, telemetry: any = {}) {
        this.doLog(LogType.FAIL, msg, this.items, telemetry);
    }
    WARN(msg: string, telemetry: any = {}) {
        this.doLog(LogType.WARN, msg, this.items, telemetry);
    }
    INFO(msg: string, telemetry: any = {}) {
        this.doLog(LogType.INFO, msg, this.items, telemetry);
    }
    DEFAULT(msg: string, telemetry: any = {}) {
        this.doLog(LogType.DEFAULT, msg, this.items, telemetry);
    }
    INLINE(msg: string, telemetry: any = {}) {
        this.doLog(LogType.INLINE, msg, this.items, telemetry);
    }
    DEBUG(msg: string, telemetry: any = {}) {
        this.doLog(LogType.DEBUG, msg, this.items, telemetry);
    }
}