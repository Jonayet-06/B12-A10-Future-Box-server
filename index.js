const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

const admin = require("firebase-admin");

const serviceAccount = require("./future-box-client-firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

const verifyFirebaseToken = async (req, res, next) => {
  console.log("In the verify middleware", req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch {
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

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
    app.get("/myhabits", verifyFirebaseToken, async (req, res) => {
      // console.log("headers", req.headers);
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

    // delete data
    app.delete("/habits/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await habitsCollection.deleteOne(query);
      res.send(result);
    });

    // mark complete with duplicate check
    app.post("/habits/:id/complete", async (req, res) => {
      const habitId = req.params.id;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      try {
        const result = await habitsCollection.updateOne(
          {
            _id: new ObjectId(habitId),
            completionHistory: {
              $not: { $elemMatch: { date: today.toISOString() } },
            },
          },
          {
            $push: { completionHistory: { date: today.toISOString() } },
          }
        );

        const updatedHabit = await habitsCollection.findOne({
          _id: new ObjectId(habitId),
        });

        if (result.modifiedCount === 0) {
          return res.json({
            message: "Already completed today",
            habit: updatedHabit,
          });
        }

        res.json({
          message: "Completed for today",
          habit: updatedHabit,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
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
