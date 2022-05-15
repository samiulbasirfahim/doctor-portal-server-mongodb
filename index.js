const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const { MongoClient, ServerApiVersion } = require("mongodb")
require("dotenv").config()
const app = express()

app.use(express.json())
app.use(cors())

const verifyToken = (req, res, next) => {
	const token = req?.headers?.authorization?.split(" ")[1]
	jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
		if (err) {
			res.status(403).send({ message: "unauthorized" })
		} else {
			if (decoded.email === req.headers.email) {
				req.decoded = decoded
				next()
			} else {
				res.status(403).send({ message: "forbidden" })
			}
		}
	})
}

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.fnda1.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverApi: ServerApiVersion.v1,
})

const run = async () => {
	try {
		client.connect()
		const treatmentCollection = client
			.db("doctorsPortal")
			.collection("treatments")
		const bookingCollection = client
			.db("doctorsPortal")
			.collection("bookings")
		const userCollection = client.db("doctorsPortal").collection("users")

		app.get("/user", verifyToken, async (req, res) => {
			res.send(await userCollection.find({}).toArray())
		})

		app.get("/user/:email", async (req, res) => {
			res.send(await userCollection.findOne({ email: req.params.email }))
		})

		app.put("/admin/:email", async (req, res) => {
			const query = { email: req.params.email }
			const updatedDoc = {
				$set: {
					role: "admin",
				},
			}
			res.send(await userCollection.updateOne(query, updatedDoc))
		})
		app.put("/admin-remove/:email", verifyToken,  async (req, res) => {
			const query = { email: req.params.email }
			const updatedDoc = {
				$set: {
					role: "users",
				},
			}
			res.send(await userCollection.updateOne(query, updatedDoc))
		})

		app.put("/user", async (req, res) => {
			const query = { email: req.headers.email }
			const options = { upsert: true }
			const exist = await userCollection.findOne(query)
			let updatedDoc
			if (exist) {
				updatedDoc = {
					$set: { ...req.body },
				}
			} else {
				updatedDoc = {
					$set: { ...req.body, role: "users" },
				}
			}

			const result = await userCollection.updateOne(
				query,
				updatedDoc,
				options
			)
			result.token = jwt.sign(
				{ email: req.body.email },
				process.env.SECRET_KEY,
				{
					expiresIn: "1hr",
				}
			)
			res.send(result)
		})

		app.get("/treatment", verifyToken, async (req, res) => {
			res.send(await treatmentCollection.find({}).toArray())
		})

		app.get("/available", verifyToken,  async (req, res) => {
			const treatments = await treatmentCollection.find({}).toArray()
			const booking = await bookingCollection
				.find({ date: req.query.date })
				.toArray()
			treatments.forEach((treatment) => {
				const bookedTreatment = booking.filter(
					(b) => b.treatment === treatment.name
				)
				const bookedSlot = bookedTreatment.map((b) => b.slot)
				treatment.slots = treatment.slots.filter(
					(t) => !bookedSlot.includes(t)
				)
			})
			res.send(treatments)
		})

		app.post("/booking", verifyToken, async (req, res) => {
			res.send(await bookingCollection.insertOne(req.body))
		})

		app.get("/my-appointments", verifyToken, async (req, res) => {
			res.send(
				await bookingCollection
					.find({ email: req.query.email })
					.toArray()
			)
		})
	} finally {
	}
}

run().catch(() => console.dir)

app.listen(process.env.PORT || 4000, () =>
	console.log("listening on port 4000")
)
