const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u65jfbo.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Habit server is running");
});

async function run() {
  try {
    await client.connect();
    const db = client.db("habit-db");
    const habitsCollection = db.collection("habits");

    // all habits
    app.get("/habits", async (req, res) => {
      const cursor = habitsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // latest habits
    app.get("/latest-habits", async (req, res) => {
      const cursor = habitsCollection.find().sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // my habits data
    app.get("/myhabits", async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.userEmail = email;
      }
      const cursor = habitsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // insert data
    app.post("/habits", async (req, res) => {
      const habit = req.body;
      habit.createdAt = new Date();
      habit.completionHistory = [];
      const result = await habitsCollection.insertOne(habit);
      res.send(result);
    });

    // updated data
    app.patch("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const habit = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: habit,
      };
      const result = await habitsCollection.updateOne(query, update);
      res.send(result);
    });

    // handle delete
    app.delete("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await habitsCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Habit server is running on port: ${port}`);
});
