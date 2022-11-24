const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');

const cors = require('cors')
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express()
const port = process.env.PORT || 5000


// middelware
app.use(cors())
app.use(express.json())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.j7rvpzy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {

        const catagoryCollection = client.db('phones').collection('productsCatagory');
        const productsCollection = client.db('phones').collection('products');
        const userCollection = client.db('phones').collection('users');
        const bookingCollection = client.db('phones').collection('bookings');


        app.get('/products', async (req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });
        app.get('/catagorys', async (req, res) => {
            const query = {};
            const catagory = await catagoryCollection.find(query).toArray();
            res.send(catagory);
        });

        app.get('/catagory/Products/:name', async (req, res) => {
            const catagory = req.params.name;
            const catagoryName = await productsCollection.find({ categoryName: catagory }).toArray();
            res.send(catagoryName);
        });

        // post user details 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // get all users 
        app.get('/users', async (req, res) => {
            const query = {}
            const users = await userCollection.find(query).toArray();
            res.send(users);

        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });



    } catch (error) {

    }
}

run().catch(console.log)






app.get('/', (req, res) => {
    res.send('phone srver server is running')
})
app.listen(port, (req, res) => {
    console.log(`phone server  server is running port ${port}`);
})