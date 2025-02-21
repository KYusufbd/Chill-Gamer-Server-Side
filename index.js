const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');

const password = process.env.PASSWORD;
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://yfaka001:${password}@cluster0.tiftb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const userCollection = client.db('chill_gamer').collection('users');

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send(`Chill Gamer server is running!! on port: ${port}`);
});

app.get('/users', async (req, res) => {
  await client.connect();
  const cursor = userCollection.find();
  const result = await cursor.toArray();
  res.send(result);
  client.close();
});

app.post('/user', async (req, res) => {
  await client.connect();
  const user = req.body;
  console.log(user);
  const result = await userCollection.insertOne(user);
  const response = JSON.stringify(result);
  res.send(response);
  client.close();
})

app.listen(port);
