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
    const validateUser = particpantsSchema.validate({ name }, {abortEarly: false});

    if (validateUser.error) {
        const errors = validateUser.error.details.map(det => det.message)
        return res.status(422).send(errors)
    }

    try {
        const userExists = await db.collection('participants').findOne({ name });
        if(userExists) return res.status(409).send("This user already exists!")

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
const PORT = 5000;
server.listen(PORT, () => console.log('Server running on PORT 5000'));