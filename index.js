const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');

const password = process.env.PASSWORD;
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
const reviewCollection = client.db('chill_gamer').collection('reviews');
const gameCollection = client.db('chill_gamer').collection('games');
const watchlistCollection = client.db('chill_gamer').collection('watchlist');

// Testing database when server runs first time:
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Testing purpose only:
app.get('/', (req, res) => {
  res.send(`Chill Gamer server is running!! on port: ${port}`);
});

// Get all reviews:
app.get('/reviews', async (req, res) => {
  try {
    // Connect to MongoDB
    await client.connect();

    // Get all reviews:
    const allReviews = await reviewCollection.find().toArray();

    // Regviews with details
    const reviewsWithDetails = await Promise.all(
      allReviews.map(async (review) => {
        const userInfo = await userCollection.findOne({ _id: ObjectId.createFromHexString(review.user) }, { projection: { _id: 0, name: 1 } });
        const gameInfo = await gameCollection.findOne({ _id: ObjectId.createFromHexString(review.game) }, { projection: { title: 1, image: 1, _id: 0 } });
        return {
          id: review._id,
          review: review.review,
          rating: review.rating,
          game: gameInfo,
          user: userInfo,
        };
      })
    );
    res.send(reviewsWithDetails);
  } catch {
    (error) => res.send(error);
  };
});

// Get a single detaild review:
app.get('/review/:id', async (req, res) => {
  try {
    // Connect to MongoDB
    await client.connect();

    const review_id = req.params.id;

    // Get desired review:
    const review = await reviewCollection.findOne({ _id: ObjectId.createFromHexString(review_id)});
    const game = await gameCollection.findOne({_id: ObjectId.createFromHexString(review.game)}, {projection: {_id: 0}});
    const user = await userCollection.findOne({_id: ObjectId.createFromHexString(review.user)}, {projection: {name: 1, email: 1, _id: 0}});
    const detailedReview = {review, game, user};

    res.json(detailedReview);
  } catch {
    error => res.send(error);
  }
});

// Add to watchlist
app.post('/watchlist', (req, res) => {
  res.send('Server is being updated!');
})

// Add new user
app.post('/user', async (req, res) => {
  try {
    await client.connect();
    const user = req.body;
    const cursor = await userCollection.findOne({email: user.email });
    
     if (cursor) {
      console.log('User already exists!');
      res.send('User registered previously!');
    } else {
      const data = await userCollection.insertOne(user);
      console.log('New user added!');
      res.send(data);
    }
  } catch {
    console.dir;
  } finally {
    // client.close();
  }
});

app.listen(port);
