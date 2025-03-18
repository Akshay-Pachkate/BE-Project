require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
const userSchema = require('./types');
const validate = require('./middlewares/validate');
const User = require('./db');


const PORT = process.env.PORT || 3000;
const SALT = bcrypt.genSaltSync(10);
const JWT_SECRET = process.env.JWT_SECRET;
const app = express();

app.use(express.json());
app.use(cors());


app.post('/register', validate(userSchema), async (req, res) => {

    const {name, email, password} = req.body;

    const hashedPassword = await bcrypt.hashSync(password, SALT);

    // Create a new user
    const user = new User({
        name,
        email,
        password: hashedPassword
    });
    try {
        await user.save();
        res.send(user);
    } catch (error) {
        res.status(400).send({error: 'Invalid data'});
    }
});


app.post('/login', validate(userSchema), async (req, res) => {
    const {email, password} = req.body;

    const userDoc = await User.findOne({email}).select('password');
    // console.log(passwordHash);

    bcrypt.compare(password, userDoc.password, async (err, result) => {
        if (err) {
            res.status(400).send('Invalid email or password');
        } else {
            const user = await User.findOne({email});
            if (!user) {
                res.status(400).send('Invalid email or password');
            } else {
                const token = await jwt.sign({email: user.email, id: userDoc._id}, JWT_SECRET);
                
                res.cookie('token', token).json({message: 'Logged in successfully', token});

            }
        }
    });

});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});