const path = require('path')
const chokidar = require('chokidar')
const Websocket = require('ws')

const wss = new Websocket.WebSocketServer({ port: 5000 })

wss.on('connection', ws => {
  const watcher = chokidar.watch(path.resolve(__dirname), {
    ignored: ['./node_modules/**'],
    ignoreInitial: true,
    ignorePermissionErrors: true,
    disableGlobbing: true,
  })
  watcher.on('change', path => {
    handleHMRUpdate(path)
  })

  function handleHMRUpdate(path) {
    // css 文件改变通知客户端
    if (path.endsWith('.css')) {
      ws.send(
        JSON.stringify({
          type: 'css',
          path,
        })
      )
    }
  }
})
