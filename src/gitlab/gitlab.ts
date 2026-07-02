import { colors } from '../colors';
import { getResponse } from '../http/http';
import { colorize, LogType, _LOG } from './../log/log';

const MAX_RETRIES = 3;

export type LogItem = {
    message: string;
    type: LogType;
    time: number;
    telemetry?: any;
};

export type ProjectResult = {
    items: any[];
    logger: _LOG;
    // logs: LogItem[];
};

type ProjectPage = {
    maxAvailableItems: number;
    maxAvailablePages: number;
    nextPage: number;
    projects: any[];
    target: string;
    time: number;
};

const getProjectsTarget = (
    endpoint: string,
    perPage: number,
    page: number
): string => `${endpoint}/projects?per_page=${perPage}&page=${page}`;

const appendUniqueProjects = (
    projects: any[],
    ids: number[],
    finalResult: any[]
): void => {
    for (const project of projects) {
        if (!ids.includes(project.id)) {
            ids.push(project.id);
            finalResult.push(project);
        }
    }
};

const parseProjects = (content: string, target: string, _log: _LOG): any[] | null => {
    try {
        return JSON.parse(content || '[]');
    } catch (error) {
        _log.WARN(`Invalid project response from ${target}`, { error, target });
        return null;
    }
};

const fetchProjectsPage = (
    endpoint: string,
    token: string,
    perPage: number,
    page: number,
    _log: _LOG,
    expectedMinItems?: number
): ProjectPage | null => {
    const target = getProjectsTarget(endpoint, perPage, page);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const result: any = getResponse(target, { token, isDev: false });
        const hasResponse = result?.success === true && result?.content !== '';

        if (!hasResponse) {
            if (attempt < MAX_RETRIES) {
                _log.WARN(
                    `No valid response for ${target}, retrying... [${attempt + 1}/${MAX_RETRIES}]`
                );
                continue;
            }

            _log.FAIL(`No valid response for ${target}, returning collected items...`);
            return null;
        }

        const projects = parseProjects(result.content, target, _log);
        if (!projects) {
            if (attempt < MAX_RETRIES) {
                _log.WARN(
                    `Invalid JSON for ${target}, retrying... [${attempt + 1}/${MAX_RETRIES}]`
                );
                continue;
            }

            _log.FAIL(`Invalid JSON for ${target}, returning collected items...`);
            return null;
        }

        if (
            expectedMinItems !== undefined &&
            projects.length < expectedMinItems
        ) {
            if (attempt < MAX_RETRIES) {
                _log.WARN(
                    `Incomplete response on page ${page}, retrying... [${attempt + 1}/${MAX_RETRIES}]`,
                    {
                        expectedMinItems,
                        page,
                        projects: projects.length,
                        target,
                    }
                );
                continue;
            }

            _log.FAIL(
                `Max retries reached for ${target} on page ${page}, returning collected items...`
            );
            return null;
        }

        return {
            maxAvailableItems: parseInt(result?.header['xTotal'], 10),
            maxAvailablePages: parseInt(result?.header['xTotalPages'], 10),
            nextPage: parseInt(result?.header['xNextPage'], 10) || 0,
            projects,
            target,
            time: result.time,
        };
    }

    return null;
};

export const getAllProjects = (
    endpoint: string,
    token: string,
    maxPage: number = -1,
    perPage: number = 100,
    _log: _LOG = new _LOG()
): ProjectResult => {
    const finalResult: any[] = [];
    const ids: number[] = [];
    const firstPage = fetchProjectsPage(endpoint, token, perPage, 1, _log);

    if (!firstPage) {
        return {
            items: [],
            logger: _log,
        };
    }

    const { maxAvailableItems, maxAvailablePages } = firstPage;
    console.log(`Max available items: ${maxAvailableItems}`);

    if (isNaN(maxAvailablePages)) {
        _log.WARN(`No xTotalPages header found in response from ${firstPage.target}`);
        return {
            items: [],
            logger: _log,
        };
    }

    const maxPages = maxPage === -1 ? maxAvailablePages : maxPage;
    if (maxPages < 1) {
        _log.WARN(`Invalid maxPage value: ${maxPage}`);
        console.log(
            `maxPage: ${maxPage}, maxAvailablePages: ${maxAvailablePages}`
        );
        return {
            items: [],
            logger: _log,
        };
    }

    _log.DEBUG(`Max pages: ${maxPages}`);
    _log.OK(
        `[1/${maxPages}][${colorize(firstPage.time + 'ms', colors.BgBlack, colors.FgYellow)}] received ${firstPage.projects.length} items from ${firstPage.target}`
    );
    appendUniqueProjects(firstPage.projects, ids, finalResult);

    let nextPage = firstPage.nextPage;
    console.log(`Next page: ${nextPage}`);

    if (nextPage > 0) {
        _log.DEBUG(`Next page: ${nextPage}`);
    }

    for (let page = nextPage; page > 0 && page <= maxPages; page++) {
        const expectedMinItems = page < maxPages ? perPage : undefined;
        const pageResult = fetchProjectsPage(
            endpoint,
            token,
            perPage,
            page,
            _log,
            expectedMinItems
        );
        if(!pageResult) {
            _log.WARN(`Failed to fetch page ${page}, stopping further requests.`);
            break;
        }

        _log.OK(
            `[${page}/${maxPages}][${colorize(pageResult.time + 'ms', colors.BgBlack, colors.FgYellow)}] received ${pageResult.projects.length} items from ${pageResult.target}`
        );
        finalResult.push(...pageResult.projects);
    }
    return {
        items: finalResult,
        logger: _log,
    }

    
};
