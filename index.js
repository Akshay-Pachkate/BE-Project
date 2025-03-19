require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
const axios = require('axios');
const userSchema = require('./types');
const validate = require('./middlewares/validate');
const User = require('./db');


const PORT = process.env.PORT || 3000;
const SALT = bcrypt.genSaltSync(10);
const JWT_SECRET = process.env.JWT_SECRET;
const app = express();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json());
app.use(cors());



const genAI = new GoogleGenerativeAI(GEMINI_API_KEY); // Replace with your actual API key
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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



app.post("/evaluate", async (req, res) => {
    const { article, summary } = req.body;
    

    // Validate input
    if (!article || !summary) {
        return res.status(400).json({
            error: "Both 'article' and 'summary' are required in the request body.",
        });
    }

    try {
        // Construct the prompt
        const prompt = `
            You are an expert in text summarization evaluation. 
            Evaluate the provided article and its summary. 
            Give a score between 1 and 100 based on coherence, fluency, relevance, and accuracy. 

            Article: ${article}
            Summary: ${summary}
            just give the score nothing else
        `;

        

        // Call the model
        const response = await model.generateContent(prompt);
        

        const score = response.response.text(); // Extract the generated score

        console.log("Score:", score);

        res.status(200).json({ score });
        } catch (error) {
        console.error("Error evaluating text:", error.message || error);
        res.status(500).json({
            error: "Failed to evaluate the text. Please try again later.",
        });
        }
    });


app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});