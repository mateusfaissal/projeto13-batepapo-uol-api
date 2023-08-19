import express from 'express';
import cors from 'cors';
import Joi from 'joi';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

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


const PORT = 5000;
server.listen(PORT, () => console.log('Server running on PORT 5000'));