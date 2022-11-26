const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId, } = require('mongodb');
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express()
const port = process.env.PORT || 5000


// middelware
app.use(cors())
app.use(express.json())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.j7rvpzy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({
            message: 'unauthorized access'
        })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({
                message: 'unauthorized access'
            })
        }
        req.decoded = decoded;
        next();
    })
};





async function run() {
    try {

        const catagoryCollection = client.db('phones').collection('productsCatagory');
        const productsCollection = client.db('phones').collection('products');
        const userCollection = client.db('phones').collection('users');
        const bookingCollection = client.db('phones').collection('bookings');
        const paymentsCollection = client.db('phones').collection('payments');






        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: ' forbidden access' })
            }
            next();
        }






        app.get('/products', async (req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        // product get by email 
        app.get('/myproducts', async (req, res) => {
            let email = req.query.email;
            const query = { email: email };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });


        // delete product 
        app.delete('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
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



        // jwt Sicrecet token

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '30d' })
            res.send({ token })
        });

        // post user details 
        app.post('/users', async (req, res) => {
            const user = req.body;
            user.verified = false;
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        //add products 
        app.post('/products', async (req, res) => {
            const user = req.body;
            const result = await productsCollection.insertOne(user);
            res.send(result);
        });

        // get all users 
        app.get('/users', async (req, res) => {
            const query = {}
            const users = await userCollection.find(query).toArray();
            res.send(users);

        });

        // get all seller 
        app.get('/allseller', async (req, res) => {
            const role = req.query.role
            const query = { designation: role }
            const users = await userCollection.find(query).toArray();
            res.send(users)
        });
        // make verify seller 
        app.put('/allseller/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    verified: true
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        });


        app.get('/user', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const users = await userCollection.findOne(query);
            res.send(users);
        });



        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });
        // booking Get by email 
        app.get('/bookings', verifyJWT, async (req, res) => {
            let email = req.query.email;
            const query = { email: email };
            const booking = await bookingCollection.find(query).toArray();
            res.send(booking);

        });
        app.get('/paybooking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await bookingCollection.findOne(filter);
            res.send(result);
        });

        // delete booking 
        app.delete('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await bookingCollection.deleteOne(filter);
            res.send(result);
        });



        // payment methode 
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingCollection.updateOne(filter, updatedDoc)
            res.send(result);
        });



        //  seller role 
        app.get('/user/sellar/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const person = await userCollection.findOne(query);
            res.send({ isSellar: person?.designation === 'Seller' })
        })






        // make admin role 
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })

        app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        });
        // delete user 
        app.delete('/user/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(filter);
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