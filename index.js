const express = require("express")
const cors = require("cors")
const { MongoClient, ServerApiVersion } = require("mongodb")
require("dotenv").config()
const app = express()

app.use(express.json())
app.use(cors())

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

		app.get("/treatment", async (req, res) => {
			res.send(await treatmentCollection.find({}).toArray())
		})

		app.get("/available", async (req, res) => {
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

		app.post("/booking", async (req, res) => {
			res.send(await bookingCollection.insertOne(req.body))
		})

		app.get("/my-appointments", async (req, res) => {
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
