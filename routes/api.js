// Below we will use the Express Router to define a read only API endpoint
// Express will listen for API requests and respond accordingly
import express from 'express'
const router = express.Router()

// Set this to match the model name in your Prisma schema
const model = 'items'

// Prisma lets NodeJS communicate with MongoDB
// Let's import and initialize the Prisma client
// See also: https://www.prisma.io/docs
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()


// ----- basic findMany() -------
// This endpoint uses the Prisma schema defined in /prisma/schema.prisma
// This gives us a cleaner data structure to work with. 
router.get('/data', async (req, res) => {
    try {
        // fetch first 10 records from the database with no filter
        const result = await prisma[model].findMany({
            take: 10
        })
        res.send(result)
    } catch (err) {
        console.log(err)
        res.status(500).send(err)
    }
})


// ----- findMany() with search ------- 
// Accepts optional search parameter to filter by name field
// See also: https://www.prisma.io/docs/orm/reference/prisma-client-reference#examples-7
router.get('/search', async (req, res) => {
    try {
        // get search terms from query string, default to empty string
        const searchTerms = req.query.terms || ''
        // fetch the records from the database
        const result = await prisma[model].findMany({
            where: {
                name: {
                    contains: searchTerms,
                    mode: 'insensitive'  // case-insensitive search
                }
            },
            orderBy: { name: 'asc' },
            take: 10
        })
        res.send(result)
    } catch (err) {
        console.log(err)
        res.status(500).send(err)
    }
})


// ----- findRaw() -------
// Returning Raw records from MongoDB
// This endpoint does not use any schema. 
// This is can be useful for testing and debugging.
router.get('/raw', async (req, res) => {
    try {
        // raw queries use native MongoDB query syntax
        // e.g. "limit" instead of "take"
        const options = { limit: 10 };
        const results = await prisma[model].findRaw({ options });
        res.send(results);
    } catch (err) {
        console.log(err)
        res.status(500).send(err)
    }
})


// export the api routes for use elsewhere in our app 
// (e.g. in index.js )
export default router;

