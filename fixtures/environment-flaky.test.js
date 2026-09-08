/**
 * Fixture: Environment Flake
 * Root Cause: Environmental dependency (unstable local HTTP service)
 * Resolving Condition: None (Flags for manual review)
 * Created by Ayush Dubey
 */
const http = require('http')

async function runTest() {
  // Spin up an ephemeral unstable local HTTP service
  let reqCount = 0
  const server = http.createServer((req, res) => {
    reqCount++
    // Fails on odd requests (~50% failure rate) simulating upstream endpoint degradation
    if (reqCount % 2 === 1) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Service Unavailable: upstream database timeout' }))
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', data: [1, 2, 3] }))
    }
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  try {
    const makeRequest = () =>
      new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}`, (res) => {
          let body = ''
          res.on('data', (chunk) => {
            body += chunk
          })
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, body })
          })
        })
        req.on('error', reject)
      })

    const response = await makeRequest()

    if (response.statusCode !== 200) {
      throw new Error(
        `HTTP request to local endpoint failed with status ${response.statusCode}: ${response.body}`
      )
    }

    return true
  } finally {
    server.close()
  }
}

runTest()
  .then(() => {
    if (process.env.FLAKERAD_DEBUG) {
      console.log('[PASS] environment-flaky.test.js')
    }
    process.exit(0)
  })
  .catch((err) => {
    console.error(`[FAIL] environment-flaky.test.js: ${err.message}`)
    process.exit(1)
  })
