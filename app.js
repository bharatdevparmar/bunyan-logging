'use strict';

// [START gae_node_request_example]
const express = require('express');
const httpContext = require('express-http-context');
const extName = require('ext-name');
const mime = require('mime-types');
const mtype = require('mime');
// const { log } = require('./logger');
const { log } = require('./logger-bunyan');
const fetch = require('axios')
const app = express();

app.use(httpContext.middleware);
app.use(function (req, res, next) {
  const traceContext = req.headers['x-cloud-trace-context'];
  if (traceContext) {
    const traceId = traceContext.split('/')[0];
    httpContext.set('traceId', traceId);
  }
  next();
});
// process.on('unhandledRejection', (reason, p) => {
//   log.error(`${new Date().toUTCString()} uncaughtException: ${reason ? reason.message : ''}`);
//   reason && log.error(reason.stack);
//   log.info(p)
// });

// process.on('uncaughtException', function (err) {
//   log.error(`${new Date().toUTCString()} uncaughtException: ${err ? err.message : ''}`);
//   err && log.error(err.stack);
// });

function replaceErrors(key, value) {
  if (value instanceof Error) {
      var val = {};
      Object.getOwnPropertyNames(value).forEach(function (key) {
          val[key] = value[key];
      });
      return val;
  }
  return value;
}
process.on('unhandledRejection', (reason, p) => {
  console.error("unhandledRejectionError " + JSON.stringify(reason,replaceErrors));
  gracefulShutdown();
});

process.on('uncaughtException', function(err) {
  console.error("uncaughtExceptionError " + JSON.stringify(err,replaceErrors));
  gracefulShutdown();
});

app.get('/', (req, res) => {  
  
  const cnt = 50 
  for(var i=0;i<cnt; i++){
    log.info('log test count:'+ new Date().getTime());
  }
  res
    .status(200)
    .send('Hello, world!')
    .end();
});
app.get('/multi',(req, res)=>{
  const cnt = 100;
  for(var i=0;i<cnt; i++){
    fetch('https://bharat-log.appspot.com/')
  }
  res.status(200).send("done")
})
app.get('/crash', (req, res) => {  
  let cnt = 20 
  if(req.query.cnt)
    cnt = req.query.cnt;
  for(var i=0;i<cnt; i++){   
      log.error(i);   
  }
  if(cnt<20)
   {
    process.exit()
   }
  else 
   res
    .status(200)
    .send('Hello, world!')
    .end();
});
app.get('/go',(req,res) => {
  res.send('working fine');
})

app.get('/extname',(req,res) => {
  const type = 'audio/amr';
  console.log('type:' + type);
  // const result = extName.mime('image/jpeg');
  const result = mtype.getExtension(type);
  console.log("result: " + result);
  res.send('working fine');
})


function gracefulShutdown() {
  // server.isClosing = true;
  // server.close(function() {
  // log.warn('Server is closed!');
  setTimeout(() => {
    process.exit(1);
  }, 1);
  // });
}

process.on('exit', function() {
  try {
    console.info('on-exit: cleaning connections');
    log.end()
    //esClient.close();
    // redisCacheClient.quit().catch(err => {
    //   console.error(`error quitting redis cache ${JSON.stringify(err)}`)
    // });
    // redisStoreClient.quit().catch(err => {
    //   console.error(`error quitting redis store ${JSON.stringify(err)}`)
    // });
  } catch (err) {
    console.error(err.stack);
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
// [END gae_node_request_example]

module.exports = app;
