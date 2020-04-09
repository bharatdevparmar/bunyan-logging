const bunyan = require('bunyan');
const {LoggingBunyan, LOGGING_TRACE_KEY} = require('@google-cloud/logging-bunyan');
// const BunyanStackDriver = require("bunyan-stackdriver");
const httpContext = require('express-http-context');
const path = require('path');
const PROJECT_ROOT = path.join(__dirname, '..');
console.log(`Service => ${process.env.GAE_SERVICE} Version => ${process.env.GAE_VERSION}`);
const projectId = 'bharat-log';
// const bunyanStack = new BunyanStackDriver({
//     projectId,
//     keyFilename: `./${projectId}.json`,
//     logName: 'bharatLog',
//     writeInterval: 2000
// });

const showFileAndLine = process.env.NODE_ENV !== 'production';
console.log(`Show file & line => ${showFileAndLine}`);

let logger = undefined;
function getLogger() {
    try{
    if (!logger) {
        // Creates a Bunyan Stackdriver Logging client
        const loggingBunyan = new LoggingBunyan({
            projectId,
            keyFilename: `./${projectId}.json`, 
        });

        // Create a Bunyan logger that streams to Stackdriver Logging
        logger = bunyan.createLogger({
            name: "bharatLog",
            streams: [
                // { stream: bunyanStack },
                process.env.NODE_ENV === 'dev' ?
                 {stream: process.stdout, level: 'info'}             
                :loggingBunyan.stream('info')
                    ],
            //stream: bunyanStack,
            serviceContext: {
                service: process.env.GAE_SERVICE,
                version: process.env.GAE_VERSION
            }
        });
        logger.on('error', function (err) {
            logger = undefined;
        });
    }
        return logger;
    } catch(err){
        console.error(err);
    }
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
        [LOGGING_TRACE_KEY] : getTraceId()
    };
}
const MAX_LOG_SIZE_IN_KB = 5;
module.exports.log = {
    end:()=>{
        try {
            if (typeof (getLogger().streams[0]) !== 'object') return;
            // close stream, flush buffer to disk
            getLogger().streams[0].stream.end();
        } catch (err) {
            console.error(err);
        }
    },
    log: (level, message) => {
        try {
            if (message instanceof Object) {
                message = JSON.stringify(message);
            }
            if (message &&
                typeof message === 'string' &&
                getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
                message = message.substr(0, 2000);
            }
            getLogger().log(level, showFileAndLine ? formatLogArguments(message) : message, getMeta());
        } catch (err) {
            console.error(err);
        }
    },
    error(message) {
        try {
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
        } catch (err) {
            console.error(err);
        }
    },
    warn(message) {
        try {
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
        } catch (err) {
            console.error(err);
        }
    },
    verbose(message) {
        try {
            if (message instanceof Object) {
                message = JSON.stringify(message);
            }
            if (message &&
                typeof message === 'string' &&
                getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
                message = message.substr(0, 2000);
            }
            getLogger().verbose(showFileAndLine ? formatLogArguments(message) : message, getMeta());
        } catch (err) {
            console.error(err);
        }
    },
    info(message) {
        try {
            if (message instanceof Object) {
                message = JSON.stringify(message);
            }
            if (message &&
                typeof message === 'string' &&
                getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
                message = message.substr(0, 2000);
            }
            getLogger().info(showFileAndLine ? formatLogArguments(message) : message, getMeta());
        } catch (err) {
            console.error(err);
        }
    },
    debug(message) {
        try {
            if (message instanceof Object) {
                message = JSON.stringify(message);
            }
            if (message &&
                typeof message === 'string' &&
                getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
                message = message.substr(0, 2000);
            }
            getLogger().debug(showFileAndLine ? formatLogArguments(message) : message, getMeta());
        } catch (err) {
            console.error(err);
        }
    },
    silly(message) {
        try {
            if (message instanceof Object) {
                message = JSON.stringify(message);
            }
            if (message &&
                typeof message === 'string' &&
                getKBSize(message) > MAX_LOG_SIZE_IN_KB) {
                message = message.substr(0, 2000);
            }
            getLogger().silly(showFileAndLine ? formatLogArguments(message) : message, getMeta());
        } catch (err) {
            console.error(err);
        }
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