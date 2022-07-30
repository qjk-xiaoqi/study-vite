const fse = require('fs-extra')
const fs = require('fs')
const path = require('path')
const Koa = require('koa')
const compilerSfc = require('@vue/compiler-sfc') // .vue
const compilerDom = require('@vue/compiler-dom') // 模板

const app = new Koa()

const rewriteImport = content => {
  return content.replace(/ from ['|"]([^'"]+)['|"]/g, (s0, s1) => {
    // . ../ / 开头的 都是相对路径
    if (s1[0] !== '.' && s1[1] !== './') {
      // 说明去 node modules 中去找
      return `from '/@modules/${s1}'`
    } else {
      return s0
    }
  })
}

app.use(async ctx => {
  const {
    request: { url, query },
  } = ctx

  // if (url === '/') {
  //   ctx.type = 'text/html'
  //   ctx.body = fs.readFileSync('./index.html', 'utf-8')
  //   return
  // }

  if (url == '/') {
    ctx.type = 'text/html'
    let content = fs.readFileSync('./index.html', 'utf-8')
    content = content.replace(
      '<script ',
      `
      <script>
        window.process = {env:{ NODE_ENV:'dev'}}
      </script>
      <script
    `
    )

    ctx.body = content
    return
  }

  /**
   * 读取 js 文件
   */
  if (url.endsWith('.js')) {
    ctx.type = 'application/javascript'
    const content = fse.readFileSync(path.resolve(__dirname, url?.slice(1)), 'utf-8')
    ctx.body = rewriteImport(content)
    return
  }

  // /**
  //  * node_modules 文件
  //  */
  if (url.startsWith('/@modules/')) {
    const prefix = path.resolve(__dirname, 'node_modules', url.replace('/@modules/', ''))
    const module = require(prefix + '/package.json').module
    const content = fse.readFileSync(path.resolve(prefix, module), 'utf-8')
    ctx.type = 'application/javascript'
    ctx.body = rewriteImport(content)
    return
  }

  /**
   * vue 文件
   */
  if (url.indexOf('.vue') > -1) {
    const content = path.resolve(__dirname, url.split('?')[0].slice(1))
    /**
     * 使用 compilerSfc.parse 来解析 Vue 组件，通过返回的 descriptor.script 获取 js 代码，并发起一个 type = template 的方法来获取 render 函数。
     * 在 query.type 是template 的时候，调用 compilerDom.compiler 来解析 template 的内容，直接返回 render 函数
     */

    const { descriptor } = compilerSfc.parse(fse.readFileSync(content, 'utf-8'))
    if (!query.type) {
      ctx.type = 'application/javascript'
      // 借用 vue 自导的 compile 框架解析单文件组件，其实相当于 vue-loader 做的事
      ctx.body = `${rewriteImport(descriptor.script.content.replace('export default', 'const __script = '))}
      import {render as __render} from "${url}?type=template"
      __script.render = __render
      export default __script
      `
    } else if (query.type === 'template') {
      // 模板内容
      const template = descriptor.template
      const render = compilerDom.compile(template.content, { mode: 'module' }).code
      ctx.body = rewriteImport(render)
      ctx.type = 'application/javascript'
      return
    }
  }

  /**
   * css 文件
   */

  if (url.endsWith('.css')) {
    const file = fse.readFileSync(path.resolve(__dirname, url.slice(1)), 'utf-8')
    const content = `
      const css = "${file.replace(/\n/g, '')}"
      const link = document.createElement('style')
      link.setAttribute('type' ,'text/css')
      document.head.appendChild(link)
      link.innerHTML = css
      export default css
    `
    ctx.type = 'application/javascript'
    ctx.body = content
    return
  }
})

app.listen(8489, () => {
  console.log('监听端口 8489...')
})
