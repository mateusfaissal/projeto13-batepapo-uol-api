import express, { response } from 'express';
import cors from 'cors';
import Joi from 'joi';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import dayjs from 'dayjs';

const server = express();
server.use(cors());
server.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {

    await mongoClient.connect();
    console.log('MongoDB connected!')

} catch (err) {
    console.log(err.message);
}

const db = mongoClient.db();

const particpantsSchema = Joi.object({
    name: Joi.string().min(1).required(),
})

const messagesSchema = Joi.object({
    to: Joi.string().min(1).required(),
    text: Joi.string().min(1).required(),
    type: Joi.string().valid('message', 'private_message').required(),
})

server.post('/participants', async (req, res) => {
    const { name } = req.body;
    const validateUser = particpantsSchema.validate({ name }, { abortEarly: false });

    if (validateUser.error) {
        const errors = validateUser.error.details.map(det => det.message)
        return res.status(422).send(errors)
    }

    try {
        const userExists = await db.collection('participants').findOne({ name });
        if (userExists) return res.status(409).send("This user already exists!")

        await db.collection('participants').insertOne({
            name,
            lastStatus: Date.now(),
        })

        await db.collection('messages').insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs(Date.now()).format('hh:mm:ss'),
        })


        res.status(201).send("User successfully saved")

    } catch (err) {
        res.status(500).send(err.message)
    }


})

server.get('/participants', async (req, res) => {

    try {

        const participants = await db.collection('participants').find().toArray();
        res.send(participants);

    } catch (err) {
        res.status(500).send(err.message)
    }

})

server.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;
    const from = req.headers.user;


    const validateMessages = messagesSchema.validate({ to, text, type }, { abortEarly: false });

    if (validateMessages.error) {
        const errors = validateMessages.error.details.map(det => det.message)
        return res.status(422).send(errors)
    }

    try {

        if (!(await db.collection('participants').findOne({ name: from }))) {
            return res.status(422).send("This user isn't logged!");
        }

        await db.collection('messages').insertOne({
            to,
            text,
            type,
            from,
            time: dayjs(Date.now()).format('hh:mm:ss'),
        });

        res.status(201).send("Message successfully sent");

    } catch (err) {
        res.status(500).send(err.message)
    }

})

server.get('/messages', async (req, res) => {
    const { user } = req.headers
    const limit = parseInt(req.query.limit);

    if (isNaN(limit) || limit <= 0) return res.status(422).send("Invalid limit");

    try {

        const messageQuery = {
            $or: [
                { to: "Todos" },
                { to: user },
                { from: user, }
            ],
        };

        let messages;

        if (limit) {
            messages = await db
                .collection('messages')
                .find(messageQuery)
                .sort({ _id: -1 })
                .limit(limit)
                .toArray();
        } else {
            messages = await db.collection("messages").find(queryMessage).toArray();
        }

        return res.status(200).send(messages);


    } catch (err) {
        res.status(500).send(err.message)
    }
})

server.post('/status', async (req, res) => {
    const user = req.headers.user

    if (!user) return res.status(404).send("Invalid user!")

    try {

        const participant = await db.collection('participants').findOne({ name: user });

        if (participant) {
            await db.collection('participants').updateOne({ name: user }, { $set: { lastStatus: Date.now() } })
            return res.status(200).send("Updated status successfully");

        } else return res.status(404).send("User not found");

    } catch (err) {
        res.status(500).send(err.message)
    }
})

async function handleInactive() {
     await db
     .collection('participants')
     .find()
     .forEach(async (user) => {

        const inactiveStatus = user.lastStatus + 10000;

        if (Date.now() > inactiveStatus) {

            await db.collection('participants').deleteOne({_id: user._id});
           
            const message = {
                from: user.name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: dayjs().format("HH:mm:ss"),
              };

            await db.collection('messages').insertOne(message);
        }
     })
}

setInterval(handleInactive, 15000);



const PORT = 5000;
server.listen(PORT, () => console.log('Server running on PORT 5000'));