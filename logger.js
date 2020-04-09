// const { LoggingWinston } = require('@google-cloud/logging-winston');
const bunyan = require('bunyan');
const { LoggingBunyan } = require('@google-cloud/logging-bunyan');
// const winston = require('winston');
const httpContext = require('express-http-context');
const path = require('path');
const PROJECT_ROOT = path.join(__dirname, '..');
console.log(`Service => ${process.env.GAE_SERVICE} Version => ${process.env.GAE_VERSION}`);
const projectId = 'bharat-log';
const loggingBunyan = new LoggingBunyan({
    projectId,
    keyFilename: `./${projectId}.json`,
    serviceContext: {
        //
        service: process.env.GAE_SERVICE,
        version: process.env.GAE_VERSION
    }
});

// const logger = winston.createLogger({
// 	level: 'info',
// 	transports: [
// 		process.env.NODE_ENV !== 'production'
// 			? new winston.transports.Console({
// 					format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
// 			  })
// 			: loggingWinston,
// 	],
// });
const showFileAndLine = process.env.NODE_ENV !== 'production';
console.log(`Show file & line => ${showFileAndLine}`);
let logger = undefined;
function getLogger() {
    //if (!logger) {
        logger = bunyan.createLogger({
            level: 'info',
            transports: [
                process.env.NODE_ENV === 'dev'
                    ? new winston.transports.Console({
                        format: winston.format.combine(winston.format.colorize(), winston.format.simple())
                    })
                    : loggingBunyan
            ]
        });
        // logger.on('error', function (err) {
        //     logger = undefined;
        // });
    //}
    return logger;
}
function getTraceId() {
    if (!httpContext.get('traceId'))
        return '';
    return `projects/${projectId}/traces/${httpContext.get('traceId')}`;
}
function getMeta() {
    if (!getTraceId())
        return {};
    return {
        [LoggingWinston.LOGGING_TRACE_KEY]: getTraceId()
    };
}
const MAX_LOG_SIZE_IN_KB = 5;
module.exports.log = {
    log: (level, message) => {
        if (message instanceof Object) {
            message = JSON.stringify(message);
        }
        if (message &&
            typeof message === 'string' &&
            getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
            message = message.substr(0, 2000);
        }
        getLogger().log(level, showFileAndLine ? formatLogArguments(message) : message, getMeta());
    },
    error(message) {
        if (message instanceof Error) {
            if (message.stack) {
                getLogger().error(showFileAndLine ? formatLogArguments([message.stack]) : message.stack, getMeta());
            }
            else {
                getLogger().error(showFileAndLine
                    ? formatLogArguments([message.message])
                    : message.message, getMeta());
            }
        }
        else {
            if (message instanceof Object) {
                message = JSON.stringify(message);
            }
            if (message &&
                typeof message === 'string' &&
                getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
                message = message.substr(0, 2000);
            }
            getLogger().error(showFileAndLine ? formatLogArguments(message) : message, getMeta());
        }
    },
    warn(message) {
        if (message instanceof Error) {
            if (message.stack) {
                getLogger().error(showFileAndLine ? formatLogArguments([message.stack]) : message.stack, getMeta());
            }
            else {
                getLogger().warn(showFileAndLine
                    ? formatLogArguments([message.message])
                    : message.message, getMeta());
            }
        }
        else {
            if (message instanceof Object) {
                message = JSON.stringify(message);
            }
            if (message &&
                typeof message === 'string' &&
                getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
                message = message.substr(0, 2000);
            }
            getLogger().warn(showFileAndLine ? formatLogArguments(message) : message, getMeta());
        }
    },
    verbose(message) {
        if (message instanceof Object) {
            message = JSON.stringify(message);
        }
        if (message &&
            typeof message === 'string' &&
            getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
            message = message.substr(0, 2000);
        }
        getLogger().verbose(showFileAndLine ? formatLogArguments(message) : message, getMeta());
    },
    info(message) {
        if (message instanceof Object) {
            message = JSON.stringify(message);
        }
        if (message &&
            typeof message === 'string' &&
            getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
            message = message.substr(0, 2000);
        }
        getLogger().info(showFileAndLine ? formatLogArguments(message) : message, getMeta());
    },
    debug(message) {
        if (message instanceof Object) {
            message = JSON.stringify(message);
        }
        if (message &&
            typeof message === 'string' &&
            getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
            message = message.substr(0, 2000);
        }
        getLogger().debug(showFileAndLine ? formatLogArguments(message) : message, getMeta());
    },
    silly(message) {
        if (message instanceof Object) {
            message = JSON.stringify(message);
        }
        if (message &&
            typeof message === 'string' &&
            getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
            message = message.substr(0, 2000);
        }
        getLogger().silly(showFileAndLine ? formatLogArguments(message) : message, getMeta());
    }
};
function getKBSize(string) {
    return Buffer.byteLength(string, 'utf8') / 1024;
}
function formatLogArguments(message) {
    const stackInfo = getStackInfo(1);
    if (stackInfo) {
        // get file path relative to project root
        const calleeStr = '(' + stackInfo.relativePath + ':' + stackInfo.line + ')';
        if (typeof message === 'string') {
            message = calleeStr + ' ' + message;
        }
        else {
            message = [calleeStr, message];
        }
    }
    return message;
}
function getStackInfo(stackIndex) {
    // get call stack, and analyze it
    // get all file, method, and line numbers
    const stacklist = new Error().stack.split('\n').slice(3);
    // stack trace format:
    // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
    // do not remove the regex expresses to outside of this method (due to a BUG in node.js)
    const stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
    const stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi;
    const s = stacklist[stackIndex] || stacklist[0];
    const sp = stackReg.exec(s) || stackReg2.exec(s);
    if (sp && sp.length === 5) {
        return {
            method: sp[1],
            relativePath: path.relative(PROJECT_ROOT, sp[2]),
            line: sp[3],
            pos: sp[4],
            file: path.basename(sp[2]),
            stack: stacklist.join('\n')
        };
    }
}
