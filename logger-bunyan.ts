import bunyan from 'bunyan';

import { LoggingBunyan, LOGGING_TRACE_KEY } from '@google-cloud/logging-bunyan';
import * as httpContext from 'express-http-context';
import * as path from 'path';



const PROJECT_ROOT = path.join(__dirname, '..');
console.log(`Service => ${process.env.GAE_SERVICE} Version => ${process.env.GAE_VERSION}`);
const projectId = process.env.NODE_ENV === 'production'
    ? 'highlevel-backend'
    : 'highlevel-staging';

const showFileAndLine = process.env.NODE_ENV !== 'production';
console.log(`Show file & line => ${showFileAndLine}`);

let logger = undefined;
function getLogger() {
  try {
    if (!logger) {
      const loggingBunyan = new LoggingBunyan({
        projectId,
        keyFilename: `./${projectId}.json`,
        // autoRetry:"",
        // maxRetries:"",
      });
      // Create a Bunyan logger that streams to Stackdriver Logging
      logger = bunyan.createLogger({
        name: "bharatLog",
        streams: [
          process.env.NODE_ENV === 'dev'
            ? { stream: process.stdout, level: 'info' }
            : loggingBunyan.stream('info')
        ],
        serviceContext: {
          service: process.env.GAE_SERVICE,
          version: process.env.GAE_VERSION
        }
      });
      logger.on('error', function (err) {
        logger = undefined;
        console.error("logger creation:" + err);
      });
    }
    return logger;
  } catch (err) {
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
        [LOGGING_TRACE_KEY]: getTraceId()
    };
}
export const log = {
  end:() => {
    try {
      if (getLogger().streams.length === 0 || typeof (getLogger().streams[0]) !== 'object') return;
      // close stream, flush buffer to disk
      getLogger().streams[0].stream.end();

      // let streams = getLogger().streams;
      // streams.map((s)=>{
      //   if (typeof(s) !== 'object') return;
      //   // close stream, flush buffer to disk
      //   s.stream.end();
      // })
    } catch (err) {
      console.error(err);
    }
  },
  log: (level, message: any) => {
    try {
      if (message instanceof Object) {
        message = JSON.stringify(message);
      }
      getLogger().log(
        level,
        showFileAndLine ? formatLogArguments(message) : message,
        getMeta()
      );
    } catch (err) {
      console.error(err);
    }
  },
  error(message: any) {
    try {
      if (message instanceof Error) {
        if (message.stack) {
          getLogger().error(
            showFileAndLine ? formatLogArguments([message.stack]) : message.stack,
            getMeta()
          );
        } else {
          getLogger().error(
            showFileAndLine
              ? formatLogArguments([message.message])
              : message.message,
            getMeta()
          );
        }
      } else {
        if (message instanceof Object) {
          message = JSON.stringify(message);
        }
        getLogger().error(
          showFileAndLine ? formatLogArguments(message) : message,
          getMeta()
        );
      }
    } catch (err) {
      console.error('LOG ERROR' + err);
    }
  },
  warn(message: any) {
    try {
      if (message instanceof Error) {
        if (message.stack) {
          getLogger().error(
            showFileAndLine ? formatLogArguments([message.stack]) : message.stack,
            getMeta()
          );
        } else {
          getLogger().warn(
            showFileAndLine
              ? formatLogArguments([message.message])
              : message.message,
            getMeta()
          );
        }
      } else {
        if (message instanceof Object) {
          message = JSON.stringify(message);
        }
        getLogger().warn(
          showFileAndLine ? formatLogArguments(message) : message,
          getMeta()
        );
      }
    } catch (err) {
      console.error(err);
    }
  },
  verbose(message: any) {
    try {
      if (message instanceof Object) {
        message = JSON.stringify(message);
      }
      getLogger().verbose(
        showFileAndLine ? formatLogArguments(message) : message,
        getMeta()
      );
    } catch (err) {
      console.error(err);
    }
  },
  info(message: any) {
    try {
      if (message instanceof Object) {
        message = JSON.stringify(message);
      }
      getLogger().info(
        showFileAndLine ? formatLogArguments(message) : message,
        getMeta()
      );
    } catch (err) {
      console.error(err);
    }
  },
  debug(message: any) {
    try {
      if (message instanceof Object) {
        message = JSON.stringify(message);
      }
      getLogger().debug(
        showFileAndLine ? formatLogArguments(message) : message,
        getMeta()
      );
    } catch (err) {
      console.error(err);
    }
  },
  silly(message: any) {
    try {
      if (message instanceof Object) {
        message = JSON.stringify(message);
      }
      getLogger().silly(
        showFileAndLine ? formatLogArguments(message) : message,
        getMeta()
      );
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
    } else {
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
