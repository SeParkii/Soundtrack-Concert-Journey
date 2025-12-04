# API Endpoints for Publishing and Searching
This [NodeJS](https://nodejs.org/en) App uses [Express](https://www.npmjs.com/package/express) and [Prisma](https://www.npmjs.com/package/prisma) to publish a simple read-only API endpoint for a [MongoDB](https://www.mongodb.com/products/platform/atlas-database) data collection. This allows you to publish an existing dataset.

## Context
This demo assumes you already have an existing [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database) cluster with at least one data collection. For example, you might use one of the [sample datasets](https://www.mongodb.com/docs/atlas/sample-data/sample-airbnb/) provided by Atlas, or create your own dataset by [importing a CSV](https://www.mongodb.com/docs/compass/import-export/) through [MongoDB Compass](https://www.mongodb.com/docs/compass/). 

# Setup Process
1. Add an environment variable for your MongoDB connection string
2. Setup Prisma to communicate with MongoDB
3. Define your API endpoints
4. Run the app

# 1. Environment Variables
You must create an environment variable called `DATABASE_URL`, containing the connection string that points to your MongoDB Atlas Cluster. You can retrieve your own connection string from the MongoDB Atlas dashboard. TIP: You may also be able to retrieve your connection string from the MongoDB Compass Desktop client if you're already connected there.  

The example below shows what your `.env` may look like. Note that the trailing end of this string `sample_airbnb` refers to the name of a database. You may substitute any other database here including one you create yourself.  
```DATABASE_URL=mongodb+srv://username:password@cluster.abc.mongodb.net/sample_airbnb```

When working locally, create a file called `.env` and add the `DATABASE_URL` variable to it. For an example, see the file called `.env.example`. 

When deploying your project to a server, set the environment variable using the appropriate settings (See, for example, [Environment Variables on Vercel](https://vercel.com/docs/environment-variables)).  

# 2. Setup Prisma 
Prisma needs to model how your database is structured in order to communicate effectively. As an optional shortcut, you can run `npm run setup` to run all sub-steps automatically (the `setup` script is defined in `package.json`). Alternately, or if you have trouble, you can proceed step by step:

## 2.1. Install libraries
On the terminal, run `npm install`. This will fetch and install all the dependencies we need, including Prisma and Express. Dependencies will be placed in the `node_modules` folder.

## 2.2. Make a Schema (model the database structure)
Prisma uses a *Data Model* or [Schema](https://www.prisma.io/docs/orm/prisma-schema/overview) to understand and query your data collection. To infer a schema for your existing data, run this command:
```npx prisma db pull --force```
Prisma *introspects* the database to create a [Model](https://www.prisma.io/docs/orm/prisma-schema/data-model/models) based on the structure of your data. The schema is written to `/prisma/schema.prisma`. NOTE: this overwrites whatever may be there.

## 2.3. Mark Optional Fields  
Importantly, Prisma will assume that all fields are *required*. This is fine if your data is complete, but if there's any missing data, you will want to mark [optional fields](https://www.prisma.io/docs/orm/prisma-schema/data-model/models#optional-and-mandatory-fields) in your model. It's good to do this upfront to avoid problems later. To explore the structure of your data, you can use the [Schema](https://www.mongodb.com/docs/compass/schema/) tab in MongoDB Compass. You can also query MongoDB to check if data is missing for a given field. For example, looking at the `sample_restaurants` dataset, The following query shows two documents that are missing a GPS location: `{"address.longitude": {"$exists": false}}`. Based on this information we could mark the longitude field as optional in the Prisma schema.

## 2.4. Generate Prisma Client (to communicate effectively)
Once you have a schema, you can generate a [Prisma Client](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction). Here's the command:
```npx prisma generate```
The generated client is tailored to your data and can be used in our app to query the database. 

# 3. Setup API endpoint
Open the file called `/routes/api.js` and customize it to fit your needs. 
- Be sure to change the default model name from `items` to whichever model you want to work with. Models are defined in `/prisma/schema.prisma`. 
- The search endpoint assumes that you have a field called `name`. However, your data might not have such a field. In this case you should pick another field name to use in the search endpoint.
- The endpoints are setup to limit us to the first 10 results. You may like to tweak this to fit your own vision.

# 4. Start the app

## 4.1. Run locally
To launch the app, run `npm run start` in the terminal. This is a shortcut for launching node in `watch` mode with environment variables loaded. To see the full startup script, take a look at `package.json`

## 4.2. Deploying
When deploying to a server, we need to generate the Prisma Client on the server environment. As an example, on Vercel, you can define the following [Install Command](https://vercel.com/changelog/customizing-the-install-command-while-creating-projects) in your deployment settings:
`npm ci && npx prisma generate` 
This will install the libraries and generate the Prisma Client each time you push changes. NOTE: As a shortcut you can also use `npm run deploy`, since this is defined in `package.json`.