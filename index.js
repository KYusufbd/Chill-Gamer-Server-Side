const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const { initializeApp, applicationDefault } = require('firebase-admin/app');

const fbApp = initializeApp({
  credential: applicationDefault(),
  projectId: 'chill-gamer-6e64e',
});

const password = process.env.PASSWORD;
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { getAuth } = require('firebase-admin/auth');
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

// Add a new review:
app.post('/review', async (req, res) => {
  try {
    await client.connect();
    const idToken = req.headers.authorization;
    const decodedToken = await getAuth(fbApp).verifyIdToken(idToken);
    const email = decodedToken.email;
    const game = req.body.game;
    const review = req.body.review;
    const addedGame = await gameCollection.insertOne(game);
    const gameId = addedGame.insertedId.toHexString();
    const userObj = await userCollection.findOne({ email: email }, { projection: { _id: 1 } });
    const userId = userObj._id.toHexString();
    const reviewObj = { user: userId, game: gameId, review: review.review_description, rating: review.rating };
    const data = await reviewCollection.insertOne(reviewObj);
    console.log('Review added successfully');
    res.send(data);
  } catch {
    (error) => res.send(error);
  }
});

// Get all reviews:
app.get('/reviews', async (req, res) => {
  try {
    // Connect to MongoDB
    await client.connect();

    // Code for sorting and filtering:
    const sort = req.query.sort;
    const order = req.query.order;
    const genre = req.query.genre;

    // Sorting by rating:
    const sortOption = {};
    if (sort === 'rating') {
      sortOption.rating = order === 'des' ? -1 : 1;
    }

    // Find all reviews:
    const allReviews = sort === 'rating' ? await reviewCollection.find().sort(sortOption).toArray() : await reviewCollection.find().toArray();

    // Reviews with details
    const reviewsWithDetails = await Promise.all(
      allReviews.map(async (review) => {
        const userInfo = await userCollection.findOne({ _id: ObjectId.createFromHexString(review.user) }, { projection: { _id: 0, name: 1 } });
        const identifier = { _id: ObjectId.createFromHexString(review.game) };
        if (genre) {
          identifier.genre = genre;
        }
        const gameInfo = await gameCollection.findOne(identifier, {
          projection: {
            title: 1,
            image: 1,
            publishing_year: 1,
            _id: 0,
          },
        });
        if (gameInfo) {
          return {
            id: review._id,
            review: review.review,
            rating: review.rating,
            game: gameInfo,
            user: userInfo,
          };
        }
      })
    );

    const finalResponse = reviewsWithDetails.filter((review) => review !== undefined);

    // Sorting by publishing year:
    if (sort === 'year') {
      order === 'des' ? finalResponse.sort((a, b) => b.game.publishing_year - a.game.publishing_year) : finalResponse.sort((a, b) => a.game.publishing_year - b.game.publishing_year);
    }

    res.send(finalResponse);
  } catch {
    (error) => res.send(error);
  }
});

// Get top rated reviews:
app.get('/top-rated', async (req, res) => {
  try {
    // Connect to MongoDB
    await client.connect();

    // Find top rated reviews:
    const allReviews = await reviewCollection.find({ rating: 5 }).toArray();

    // Reviews with details
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
  }
});

// Get reviews of logged in user:
app.get('/my-reviews', async (req, res) => {
  try {
    await client.connect();
    const idToken = req.headers.authorization;
    const decodedToken = await getAuth(fbApp).verifyIdToken(idToken);
    const email = decodedToken.email;
    const user = await userCollection.findOne({ email: email }, { projection: { _id: 1 } });
    const userId = user._id.toHexString();

    // Get users reviews:
    const myReviews = await reviewCollection.find({ user: userId }).toArray();

    // Reviews with details
    const reviewsWithDetails = await Promise.all(
      myReviews.map(async (review) => {
        const userInfo = await userCollection.findOne({ _id: ObjectId.createFromHexString(review.user) }, { projection: { _id: 0, name: 1 } });
        const gameInfo = await gameCollection.findOne({ _id: ObjectId.createFromHexString(review.game) }, { projection: { title: 1, image: 1, genre: 1, description: 1, publishing_year: 1, _id: 0 } });
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
  }
});

// Get a single detaild review:
app.get('/review/:id', async (req, res) => {
  try {
    // Connect to MongoDB
    await client.connect();

    const review_id = req.params.id;

    // Get desired review:
    const review = await reviewCollection.findOne({ _id: ObjectId.createFromHexString(review_id) });
    const game = await gameCollection.findOne({ _id: ObjectId.createFromHexString(review.game) });
    const user = await userCollection.findOne({ _id: ObjectId.createFromHexString(review.user) }, { projection: { name: 1, email: 1, _id: 0 } });
    const detailedReview = { review, game, user };

    res.json(detailedReview);
  } catch {
    (error) => res.send(error);
  }
});

// Update a review:
app.put('/review/:id', async (req, res) => {
  try {
    await client.connect();
    const idToken = req.headers.authorization;
    const decodedToken = await getAuth(fbApp).verifyIdToken(idToken);
    const email = decodedToken.email;
    const user = await userCollection.findOne({ email: email }, { projection: { _id: 1 } });
    const userId = user._id.toHexString();
    const review_id = req.params.id;
    const reviewObj = await reviewCollection.findOne({ _id: ObjectId.createFromHexString(review_id) });
    const gameId = reviewObj.game;
    const review = req.body.review;
    const game = req.body.game;
    const updatedGame = await gameCollection.updateOne(
      { _id: ObjectId.createFromHexString(gameId) },
      { $set: { title: game.title, image: game.image, genre: game.genre, description: game.description, publishing_year: game.publishing_year } }
    );
    const updatedReview = await reviewCollection.updateOne({ _id: ObjectId.createFromHexString(review_id), user: userId }, { $set: { review: review.review, rating: review.rating } });
    const data = [updatedGame, updatedReview];
    res.send(data);
    console.log('Review updated successfully');
  } catch {
    (error) => res.send(error);
  }
});

// Delete a review:
app.delete('/review/:id', async (req, res) => {
  try {
    await client.connect();
    const idToken = req.headers.authorization;
    const decodedToken = await getAuth(fbApp).verifyIdToken(idToken);
    const email = decodedToken.email;
    const user = await userCollection.findOne({ email: email }, { projection: { _id: 1 } });
    const userId = user._id.toHexString();
    const review_id = req.params.id;
    const reviewObj = await reviewCollection.findOne({ _id: ObjectId.createFromHexString(review_id) }, { projection: { game: 1 } });
    const gameId = reviewObj.game;
    const deletedGame = await gameCollection.deleteOne({ _id: ObjectId.createFromHexString(gameId) });
    const deletedReview = await reviewCollection.deleteOne({ _id: ObjectId.createFromHexString(review_id), user: userId });
    const data = [deletedGame, deletedReview];
    res.send(data);
    console.log('Review deleted successfully');
  } catch {
    (error) => res.send(error);
  }
});

// Add to watchlist
app.post('/watchlist', async (req, res) => {
  try {
    await client.connect();
    const idToken = req.headers.authorization;
    getAuth(fbApp) // Firebase Auth
      .verifyIdToken(idToken)
      .then(async (decodedToken) => {
        const email = decodedToken.email;
        const game = req.body.game;
        const myWatchlist = await watchlistCollection.findOne({ email: email });
        if (!myWatchlist?.watchlist?.includes(game)) {
          const cursor = await watchlistCollection.updateOne({ email: email }, { $push: { watchlist: game } }, { upsert: true });
          res.send(cursor);
          console.log('Added to watchlist successfully');
        }
      });
  } catch {
    (error) => res.send(error);
  }
});

// Get watchlist data
app.get('/watchlist', async (req, res) => {
  try {
    await client.connect();
    const idToken = req.headers.authorization;
    getAuth(fbApp)
      .verifyIdToken(idToken)
      .then(async (decodedToken) => {
        const email = decodedToken.email;
        const watchlistObj = await watchlistCollection.findOne({ email: email }, { projection: { _id: 0, watchlist: 1 } });
        const watchlistArray = watchlistObj.watchlist;
        await Promise.all(
          watchlistArray.map(async (game) => {
            const gameInfo = await gameCollection.findOne({ _id: ObjectId.createFromHexString(game) });
            return gameInfo;
          })
        ).then((watchlist) => {
          res.send(watchlist);
        });
      });
  } catch {
    (error) => res.send(error);
  }
});

// Remove from watchlist
app.delete('/watchlist/:gameId', async (req, res) => {
  try {
    await client.connect();
    const idToken = req.headers.authorization;
    getAuth(fbApp)
      .verifyIdToken(idToken)
      .then(async (decodedToken) => {
        const email = decodedToken.email;
        const game = req.params.gameId;
        const cursor = await watchlistCollection.updateOne({ email: email }, { $pull: { watchlist: game } });
        res.send(cursor);
        console.log('Removed from watchlist successfully');
      });
  } catch {
    (error) => res.send(error);
  }
});

// Add new user
app.post('/user', async (req, res) => {
  try {
    await client.connect();
    const user = req.body;
    const cursor = await userCollection.findOne({ email: user.email });

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
