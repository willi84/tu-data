/**
 * 🎯 A utility class for http handling
 * @module backend/_shared/HTTP
 * @example getResponse('https://www.domain.de');
 * @version 0.0.1
 * @date 2026-09-19
 * @license MIT
 * @author Robert Willemelis <github.com/willi84>
 */

import { $string } from '../index.d';

import { LOG } from '../log/log';
import type { 
     CurlItem, HTTPStatusBase,
    HOSTNAME, HTTP_OPTS, SLD, URL
 } from './http.d';
import { CURL_CONFIG_STATUS,
    DOUBLE_REGEX,
     STANDARD_CURL_TIMEOUT } from './http.config';
import { convert2KeyValue, convertKey2CamelCase, convertNumber2String } from '../convert/convert';
import { command } from '../cmd/cmd';

/**
 * 🎯 get minimal http item
 * @param {string} header ➡️ The raw HTTP header string.
 * @returns {HTTPStatusBase} 📤 The parsed HTTP status object.
 */
export const getHttpItemFromHeader = (header: string): HTTPStatusBase => {
    const httpItem: any = {};
    const lines = header
        .split('\n')
        .filter((line: string) => line.trim() !== '');
    lines.forEach((line: string) => {
        const item = convert2KeyValue(line.trim());
        const key = convertKey2CamelCase(item.key);

        // if (key.trim() !== '') {
        //     // avoid empty key
        //     httpItem[`${key}`] = item.value;
        // }
        // detect httpStatus
        if (key.indexOf('http/') === 0) {
            const version = key.split('/')[1];
            const status = item.value.split(' ')[0];
            const message = item.value.replace(status, '').trim();
            httpItem.protocol = 'http';
            httpItem.protocolVersion = version;
            httpItem.status = status;
            httpItem.statusMessage = message;
            // httpItem.statusMessage = item.value
            //     .replace(status, '')
            //     // .replace(httpItem.status, '')
            //     .trim();
        } else if (key.trim() !== '') {
            // avoid empty key
            httpItem[`${key}`] = item.value;
        }
    });
    if (httpItem.status === undefined) {
        httpItem.status = '0';
        LOG.WARN('no status code found. set to 0');
        LOG.DEBUG(`header no status-code: ${header}`);
    }
    return httpItem;
};

/**
 * 🎯 get the time of connecting to an url
 * @param {string} url ➡️ The URL to connect to.
 * @returns {string} 📤 The connection time in seconds as a string.
 */
export const getConnectionTime = (url: string): string => {
    // return just time
    const cmd = `curl -o /dev/null -s -w '%{time_total}\\n' ${url}`;
    const status = command(`${cmd}`);
    return status;
};

/**
 * 🎯 get http status value from specified url
 * @param {string} url ➡️ The URL to check.
 * @param {boolean} forwarding ➡️ Whether to follow redirects.
 * @param {number} [timeout] ➡️ Optional timeout in seconds.
 * @returns {string} 📤 The HTTP status code as a string.
 */
export const getHttpStatusValue = (
    url: string,
    forwarding = false,
    timeout?: number
) => {
    const httpItem = getHttpItem(url, forwarding, timeout);
    if (httpItem['maxRedirectsReached']) {
        LOG.FAIL(`max redirects reached for ${url}`);
    }
    return httpItem['status'];
};

/**
 * 🎯 get http status code from specified url
 * @param {string} url ➡️ The URL to check.
 * @param {boolean} forwarding ➡️ Whether to follow redirects.
 * @param {number} [timeout] ➡️ Optional timeout in seconds.
 * @returns {number} 📤 The HTTP status code as a number.
 */
export const getHttpStatus = (
    url: string,
    forwarding = false,
    timeout?: number
): number => {
    const statusStr = getHttpStatusValue(url, forwarding, timeout);
    const status = parseInt(statusStr, 10) || 0;
    return status;
};

/**
 * 🎯 create param based RegExp
 * @param {string} param ➡️ param to replace
 * @param {RegExp} regex ➡️ regex to find param value
 * @returns {RegExp} 📤 new RegExp
 */
export const regParam = (param: string, regex: RegExp): RegExp => {
    const newRegex = new RegExp(`\\s-${param}\\s+${regex.source}`, regex.flags);
    return newRegex;
};

/**
 * 🎯 replace params in a curl
 * @param {string} input ➡️ curl command
 * @param {string} param ➡️ param to replace
 * @param {RegExp} regex ➡️ regex to find param value
 * @param {string} value ➡️ new value
 * @returns {string} 📤 modified curl command
 */
export const replaceParam = (
    input: string,
    param: string,
    regex: RegExp,
    value: string
): string => {
    const newRegex = regParam(param, regex);
    if (input.search(newRegex) === -1) {
        return input + ` -${param} ${value}`;
    }
    return input.replace(newRegex, ` -${param} ${value}`);
};

/**
 * 🎯 centralize handling for curl options
 * @param {string} cmd ➡️ curl command
 * @param {HTTP_OPTS} opts ➡️ options
 * @returns {string} 📤 modified curl command
 */
export const getCurlOptions = (cmd: string, opts: HTTP_OPTS) => {
    let newCmd = cmd.trim();
    const timeout = opts.timeout as number | undefined;
    const newTime = convertNumber2String(timeout || STANDARD_CURL_TIMEOUT);
    const keys = Object.keys(opts);
    const regex = /".*?"/;
    for (const key of keys) {
        const value = (opts as any)[key];
        switch (key) {
            case 'timeout':
                const regexTO = /[0-9]+(\.[0-9]+)?/;
                newCmd = replaceParam(newCmd, 'm', regexTO, newTime);
                break;
            case 'ua':
                newCmd = replaceParam(newCmd, 'A', regex, `"${value}"`);
                break;
            case 'acceptHeader':
                newCmd = replaceParam(newCmd, 'H', regex, `"Accept: ${value}"`);
                break;
            case 'method':
                const regexMethod = /[A-Z]+/;
                const VALUE = value.toUpperCase();
                newCmd = replaceParam(newCmd, 'X', regexMethod, VALUE);
                break;
            default:
                break;
        }
    }
    return newCmd;
};

/**
 * 🎯 get base http item for url
 * @param {string} url ➡️ The URL to check.
 * @param {number} [timeout] ➡️ Optional timeout in seconds.
 * @returns {HeaderItem} 📤 The parsed HTTP status object.
//  * @returns {HTTPStatusBase} 📤 The parsed HTTP status object.
 */
export const getHttpBase = (
    url: string,
    // timeout?: number,
    options: HTTP_OPTS = {}
): HTTPStatusBase => {
    // TODO: return HeaderItem
    const timeout = options.timeout as number | undefined;
    const oldTime = convertNumber2String(STANDARD_CURL_TIMEOUT);
    const newTime = convertNumber2String(timeout || STANDARD_CURL_TIMEOUT);
    let config = timeout
        ? CURL_CONFIG_STATUS.replace(oldTime, newTime)
        : CURL_CONFIG_STATUS;
    const ua = options.ua ? options.ua : '';
    if (ua) {
        config += ` -A "${ua}" `;
    }
    if (options.acceptHeader) {
        config += ` -H  "Accept: ${options.acceptHeader}" `;
    }
    const method = options.method ? options.method.toUpperCase() : '';
    if (method) {
        config += ` -X ${method} `;
    }
    // const method = (options as any).method || '';
    const finalURL = url;
    // const finalURL = encodeURI(url);
    // const finalURL = isEncoded ? url : encodeURI(url);
    const fullCommand = `curl -I "${finalURL}" ${config}`;

    const header = command(`${fullCommand}`);
    // const httpItem2 = getResponse(url);
    // const httpItem = getHttpItemFromHeader(httpItem2.header);
    const httpItem = getHttpItemFromHeader(header);
    return httpItem;
};

/**
 * 🎯 get base http item for url with forwarding
 * @todo refactor with getHttpBase and getResponse
 * @todo forwarding and timeout as optional paramaters
 * @param {string} url ➡️ The URL to check.
 * @param {number} [timeout] ➡️ Optional timeout in seconds.
 * @param {boolean} forwarding ➡️ Whether to follow redirects.
 * @returns {HTTPStatusBase} 📤 The parsed HTTP status object.
 */
export const getHttpItem = (
    url: string,
    forwarding = false,
    timeout?: number
): HTTPStatusBase => {
    const initialUrl = url;
    const maxRedirects = 5;
    let redirects = 0;
    let httpItem: HTTPStatusBase = {} as HTTPStatusBase;
    if (forwarding) {
        while (forwarding) {
            redirects += 1;
            httpItem = getHttpBase(url, { timeout });
            if (redirects > maxRedirects) {
                httpItem['maxRedirectsReached'] = 'true';
                httpItem['lastStatus'] = httpItem['status'];
                httpItem['status'] = '0';
                httpItem['redirects'] = `${redirects}`;
                httpItem['lastLocation'] = url;
                httpItem['initialUrl'] = initialUrl;
                LOG.FAIL(`max redirects reached for ${url}`);
                return httpItem;
            } else {
                // TODO: check valid url
                const location = httpItem['location'];
                if (location) {
                    url = location;
                } else {
                    forwarding = false;
                    httpItem['initialUrl'] = initialUrl; // TODO: testing
                    httpItem['lastLocation'] = url; // TODO: testing
                    httpItem['redirects'] = `${redirects}`;
                    return httpItem;
                }
            }
        }
    } else {
        httpItem = getHttpBase(url, { timeout });
        httpItem['lastLocation'] = url;
    }
    return httpItem;
};

/**
 * 🎯 get full response for url
 * @todo refactor with getHttpItem
 * @param {string} url ➡️ The URL to fetch.
 * @param {object} [opts] ➡️ Optional settings (e.g., token, isDev).
 * @returns {CurlItem} 📤 The response object containing header, content, status, success, and time.
 */
export const getResponse = (url: string, opts: HTTP_OPTS = {}): CurlItem => {
    const token = (opts as any).token || '';
    const isDev = (opts as any).isDev || false;
    const showLog = (opts as any).showLog !== undefined ? (opts as any).showLog : true;
    const customUA = (opts as any).ua || '-A "nodejs" ';
    const start = new Date().getTime();
    const isGithubApi = url.indexOf('api.github.com') !== -1;
    const isGitlabApi = url.indexOf('gitlab') !== -1;
    const type = opts.type ? opts.type : '';

    if (isGithubApi && !token) {
        LOG.FAIL('Please set a GITHUB_TOKEN in the environment variables.');
        return {
            header: {},
            content: '',
            status: '0',
            success: false,
            time: new Date().getTime() - start,
        };
    }

    // setup auth header if token is provided
    const TOKEN_KEYS: { [key: string]: string } = {
        github: 'Authorization: token',
        gitlab: 'PRIVATE-TOKEN:',
    };
    const urlKey = isGithubApi ? 'github' : isGitlabApi ? 'gitlab' : 'default';
    const auth = `${TOKEN_KEYS[urlKey] ? `-H "${TOKEN_KEYS[urlKey]} ${token}" ` : ''}`;

    const ua = isGithubApi ? '' : customUA;
    // encodeURI important to avoid issues
    const finalCommand = `curl -s ${auth} ${ua} -i "${encodeURI(url)}" ${type}`; // no end space needed
    const rawData = command(finalCommand);
    if (!rawData || rawData.length === 0) {
        LOG.FAIL(`No response received from ${url}`);
        return {
            header: {},
            content: '',
            status: '0',
            success: false,
            time: new Date().getTime() - start,
        };
    }

    if (typeof rawData !== 'string') {
        LOG.FAIL(`Invalid response type from ${url}`);
        return {
            header: {},
            content: '',
            status: '0',
            success: false,
            time: new Date().getTime() - start,
        };
    }

    let data = rawData.replace(/^\n/, ''); // remove first empty line if exists
    // TODO: splitted auslagern
    const splitted = data.split(/\r?\n\r?\n/);
    const header = splitted[0];
    const httpItem = getHttpItemFromHeader(header);
    if(showLog === true){
        if (httpItem['status'] === '0') {
            // TBD
        } else if (httpItem['status'] !== '200') {
            LOG.WARN(
                `HTTP Status for ${url}: ${httpItem['status']} - ${httpItem['statusMessage']}`
            );
            LOG.DEBUG(finalCommand);
        }
    }
    // all splitted except 0
    // TODO: check if hasHeader for opencode
    const hasHeader =
        httpItem['status'] !== undefined && httpItem['status'] !== '0';
    const hasData =
        httpItem['status'] === '0' && Object.keys(httpItem).length === 1;
    const contentItem = splitted.slice(1).join('\n');
    const content = hasHeader ? contentItem : hasData ? data : '';
    const status = parseInt(httpItem.status, 10) || 0;
    if (httpItem['status'] === '0') {
        LOG.WARN(`no status code found. set to 0`);
    }
    const success = status >= 200 && status < 400;
    if (isDev) {
        const type = success ? 'OK' : 'INFO';
        LOG[type](`Response: ${url}: ${status} - ${httpItem.statusMessage}`);
    }
    // TODO: handling rate limits in extra function
    // if (isGithubApi) {
    //     const keysRemain = ['x-ratelimit-remaining', 'xRatelimitRemaining'];
    //     const keysLimit = ['x-ratelimit-limit', 'xRatelimitLimit'];
    //     const remaining = parseInt(getHttpProp(httpItem, keysRemain), 10);
    //     const limit = parseInt(getHttpProp(httpItem, keysLimit), 10);
    //     if (remaining && limit) {
    //         remainingTokenWarning(limit, remaining);
    //     } else {
    //         LOG.WARN('No rate limit information found in response headers');
    //     }
    // }
    return {
        header: httpItem,
        content: content.trim(), // TODO: check trim()
        status: status.toString(),
        success,
        time: new Date().getTime() - start,
    };
};

/**
 * 🎯 get second level domain
 * @param {URL} url ➡️ full url
 * @returns {SLD} 📤 second level domain or empty string
 */
export const getSLD = (url: string): SLD => {
    const hostname = getHostname(url);

    const hasDoubleTLD = url.match(DOUBLE_REGEX);
    // extract SLD
    const parts = hostname.split('.');
    if (parts.length >= 2) {
        if (hasDoubleTLD) {
            return parts[parts.length - 3];
        }
        return parts[parts.length - 2];
    }
    return parts[0];
    // better extract SLD
    // https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
};
/**
 * 🎯 get hostname of an url (e.g. api.example.com)
 * @param {URL} url ➡️ full url
 * @returns {HOSTNAME} 📤 hostname only
 */
export const getHostname = (url: URL): HOSTNAME => {
    let result = url;
    result = result.replace(/^[a-z]*?:[\/]{2,}/, ''); // remove protocol also wrong ///
    result = result.replace(/^[w]{3,}\./, ''); // remove www. or wrong wwww
    result = result.replace(/\/\//, ''); // remove www.
    result = result.replace(/([^\/]+)\/.*?$/, '$1'); // remove folder
    return result;
};
/**
 * 🎯 get url param value as string
 * @param {string} url ➡️ full url
 * @param {string} key ➡️ param key
 * @returns {string} 📤 param value as string or null
 */
export const getUrlParam = (url: string, key: string): $string => {
    const params = new URLSearchParams(url.split('?')[1]);
    const value = params.get(key);
    return value;
};

/**
 * 🎯 get url param value as number
 * @param {string} url ➡️ full url
 * @param {string} key ➡️ param key
 * @param {string} [fallback='0'] ➡️ fallback value
 * @returns {number} 📤 param value as number
 */
export const getUrlParamNum = (
    url: string,
    key: string,
    fallback: string = '0'
): number => {
    const valueStr = getUrlParam(url, key) || fallback;
    const value = parseInt(valueStr, 10);
    return value;
};
export const getStatusBase = (status: number): HTTPStatusBase => {
    return {
        status: String(status),
        statusMessage: '',
        server: '',
        date: '',
        contentType: '',
        "xRatelimitRemaining": "0",
        "xRatelimitLimit": "0",
        "xRatelimitReset": "0",
        protocol: "https:",
        protocolVersion: "2.0",
    };
}