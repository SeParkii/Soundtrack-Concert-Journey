// Below we will use the Express Router to define a series of API endpoints.
// Express will listen for API requests and respond accordingly
import express from 'express'
const router = express.Router()

// Set this to match the model name in your Prisma schema
const model = 'tickets'

// Prisma lets NodeJS communicate with MongoDB
// Let's import and initialize the Prisma client
// See also: https://www.prisma.io/docs
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Connect to the database
prisma.$connect()
  .then(() => {
    console.log('Prisma connected to MongoDB')
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err)
  })

// -------------------------------------------------------
//  DEEZER SEARCH PROXY - fetch ALL pages for a query
//  Frontend calls:  GET /api/deezer-search?q=artist:"Taylor Swift"
//  This route loops through Deezer pages and merges them.
// -------------------------------------------------------
router.get('/api/deezer-search', async (req, res) => {
  const q = req.query.q

  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter q' })
  }

  // Deezer paging: limit = page size, index = offset
  const PAGE_SIZE = 50
  // Safety cap: how many tracks max we’ll fetch in total
  const MAX_TOTAL = 500

  try {
    let allTracks = []
    let index = 0

    while (allTracks.length < MAX_TOTAL) {
      const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${PAGE_SIZE}&index=${index}`
      console.log('Fetching from Deezer:', url)

      const deezerRes = await fetch(url)

      if (!deezerRes.ok) {
        const text = await deezerRes.text()
        console.error('Deezer API error:', deezerRes.status, text)
        return res
          .status(500)
          .json({ error: 'Failed to fetch from Deezer', status: deezerRes.status })
      }

      const pageData = await deezerRes.json()
      const tracks = Array.isArray(pageData.data) ? pageData.data : []

      allTracks = allTracks.concat(tracks)

      // If we got less than PAGE_SIZE, there are no more pages
      if (tracks.length < PAGE_SIZE) break

      index += PAGE_SIZE
    }

    console.log(`Total tracks fetched from Deezer: ${allTracks.length}`)

    // Keep a Deezer-like shape: { data: [...] }
    return res.json({ data: allTracks })
  } catch (err) {
    console.error('Deezer proxy error:', err)
    return res.status(500).json({
      error: 'Failed to fetch from Deezer',
      details: err.message || err
    })
  }
})

// -------------------------------------------------------
//  CRUD ROUTES FOR tickets
// -------------------------------------------------------

// ----- CREATE (POST) -----
// Create a new record for the configured model
// This is the 'C' of CRUD
router.post('/data', async (req, res) => {
  try {
    // Remove the id field from request body if it exists
    // MongoDB will auto-generate an ID for new records
    const { id, ...createData } = req.body

    // createData now includes songs if the frontend sent it.
    // Prisma will store it in the `songs` JSON field.
    const created = await prisma[model].create({
      data: createData
    })
    res.status(201).send(created)
  } catch (err) {
    console.error('POST /data error:', err)
    res.status(500).send({
      error: 'Failed to create record',
      details: err.message || err
    })
  }
})

// ----- READ (GET) list -----
router.get('/data', async (req, res) => {
  try {
    // fetch first 100 records from the database with no filter
    const result = await prisma[model].findMany({
      take: 100
    })
    res.send(result)
  } catch (err) {
    console.error('GET /data error:', err)
    res.status(500).send({
      error: 'Failed to fetch records',
      details: err.message || err
    })
  }
})

// ----- findMany() with search ------- 
// Accepts optional search parameter to filter by concertName field
router.get('/search', async (req, res) => {
  try {
    const searchTerms = req.query.terms || ''
    const result = await prisma[model].findMany({
      where: {
        concertName: {
          contains: searchTerms,
          mode: 'insensitive'
        }
      },
      orderBy: { concertName: 'asc' },
      take: 10
    })
    res.send(result)
  } catch (err) {
    console.error('GET /search error:', err)
    res.status(500).send({
      error: 'Search failed',
      details: err.message || err
    })
  }
})

// ----- UPDATE (PUT) -----
router.put('/data/:id', async (req, res) => {
  try {
    const { id, ...updateData } = req.body

    const updated = await prisma[model].update({
      where: { id: req.params.id },
      data: updateData
    })
    res.send(updated)
  } catch (err) {
    console.error('PUT /data/:id error:', err)
    res.status(500).send({
      error: 'Failed to update record',
      details: err.message || err
    })
  }
})

// ----- DELETE -----
router.delete('/data/:id', async (req, res) => {
  try {
    const result = await prisma[model].delete({
      where: { id: req.params.id }
    })
    res.send(result)
  } catch (err) {
    console.error('DELETE /data/:id error:', err)
    res.status(500).send({
      error: 'Failed to delete record',
      details: err.message || err
    })
  }
})

// export the api routes for use elsewhere in our app 
export default router
