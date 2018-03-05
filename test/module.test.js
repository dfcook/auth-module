const { Nuxt, Builder } = require('nuxt')
const puppeteer = require('puppeteer')

const config = require('./fixtures/basic/nuxt.config')

const url = path => `http://localhost:3000${path}`

describe('auth', () => {
  let nuxt
  let browser

  beforeAll(async () => {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    nuxt = new Nuxt(config)
    await new Builder(nuxt).build()
    await nuxt.listen(process.env.PORT)
  }, 60000)

  afterAll(async () => {
    await browser.close()
    await nuxt.close()
  })

  test('initial state', async () => {
    const page = await browser.newPage()
    await page.goto(url('/'))

    const state = await page.evaluate(() => window.__NUXT__.state)
    expect(state.auth).toEqual({ user: null, loggedIn: false, strategy: 'local' })

    await page.close()
  })

  test('login', async () => {
    const page = await browser.newPage()
    await page.goto(url('/'))
    await page.waitForFunction('!!window.$nuxt')

    const { token, user, axiosBearer } = await page.evaluate(async () => {
      await window.$nuxt.$auth.loginWith('local', {
        data: { username: 'test_username', password: '123' }
      })

      return {
        axiosBearer: window.$nuxt.$axios.defaults.headers.common.Authorization,
        token: window.$nuxt.$auth.getToken(),
        user: window.$nuxt.$auth.state.user
      }
    })

    expect(axiosBearer).toBeDefined()
    expect(token).toBeDefined()
    expect(user.username).toBe('test_username')
  })

  test('logout', async () => {
    const page = await browser.newPage()
    await page.goto(url('/'))
    await page.waitForFunction('!!window.$nuxt')

    const { loginAxiosBearer, loginToken } = await page.evaluate(async () => {
      await window.$nuxt.$auth.loginWith('local', {
        data: { username: 'test_username', password: '123' }
      })

      return {
        loginAxiosBearer: window.$nuxt.$axios.defaults.headers.common.Authorization,
        loginToken: window.$nuxt.$auth.getToken()
      }
    })

    expect(loginAxiosBearer).toBeDefined()
    expect(loginToken).toBeDefined()

    const { logoutToken, logoutAxiosBearer } = await page.evaluate(async () => {
      await window.$nuxt.$auth.logout()

      // eslint-disable-next-line no-console
      console.log('nuxt: ' + window.$nuxt)

      return {
        logoutAxiosBearer: window.$nuxt.$axios.defaults.headers.common.Authorization,
        logoutToken: window.$nuxt.$auth.getToken()
      }
    })

    expect(logoutToken).toBeNull()
    expect(logoutAxiosBearer).toBeUndefined()
  })
})
