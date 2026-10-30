// @vitest-environment node
import http from 'node:http'
import type { HttpBindings } from '@hono/node-server'
import {
  createTestHttpServer,
  type TestHttpServer,
} from '@epic-web/test-server/http'
import { HttpRequestInterceptor } from '#/src/interceptors/http'
import { toWebResponse } from '#/test/helpers'

let httpServer: TestHttpServer
let interceptor: HttpRequestInterceptor

beforeAll(async () => {
  httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/echo', (ctx) => {
        const { incoming } = ctx.env as HttpBindings
        const header = incoming.headers['x-test']
        const value = Array.isArray(header) ? header[0] : (header ?? 'none')
        return new Response(value)
      })
    },
  })
})

beforeEach(() => {
  interceptor = new HttpRequestInterceptor()
  interceptor.on('request', ({ request }) => {
    // Force the header rewrite path to run when the request is passed through.
    request.headers.set('x-rewrite', 'yes')
  })
  interceptor.apply()
})

afterEach(() => {
  interceptor.dispose()
})

afterAll(async () => {
  await httpServer.close()
})

it('passthroughs a request whose header value contains a colon-space', async () => {
  const request = http.request(httpServer.http.url('/echo').href, {
    method: 'POST',
    headers: {
      'x-test': 'a: b',
    },
  })
  request.end()
  const [response] = await toWebResponse(request)

  expect(await response.text()).toBe('a: b')
})

it('passthroughs a request whose header value is plain', async () => {
  const request = http.request(httpServer.http.url('/echo').href, {
    method: 'POST',
    headers: {
      'x-test': 'a b',
    },
  })
  request.end()
  const [response] = await toWebResponse(request)

  expect(await response.text()).toBe('a b')
})
