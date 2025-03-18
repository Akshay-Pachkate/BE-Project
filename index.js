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

const GEMINI_API_URL = "https://api.gemini.com/v1/completions"; // Replace with actual Gemini API endpoint
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Replace with your API key

app.post('/evaluate', async (req, res) => {
    const { article, summary } = req.body;

    if (!article || !summary) {
        return res.status(400).json({ error: "Both 'article' and 'summary' are required in the request body." });
    }

    try {
        const prompt = `You are an expert in text summarization evaluation. Evaluate the provided article and its summary and give a score on a scale of 1 to 100. Here are the inputs:
        
        Article: ${article}
        Summary: ${summary}`;

        const response = await axios.post(
            GEMINI_API_URL,
            {
                model: "your-model-id", // Replace with the specific Gemini model ID, if needed
                prompt: prompt,
                max_tokens: 100, // Adjust based on expected response size
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${GEMINI_API_KEY}`, // Authorization header
                },
            }
        );

        // Assuming the API returns a score in the `choices` array
        const score = response.data.choices[0].text.trim();

        res.status(200).json({ score });
    } catch (error) {
        console.error("Error evaluating text:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to evaluate text. Please try again later." });
    }
});


app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});