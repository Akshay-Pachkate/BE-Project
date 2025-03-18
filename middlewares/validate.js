const z = require('zod');

module.exports = (schema) => {
    return (req, res, next) => {
        try {
            const {success} = schema.safeParse(req.body);

            if (!success) 
                throw new Error('Invalid data');
            
            next();
        } catch (error) {
            res.status(400).send(error.errors);
        }
    }
}