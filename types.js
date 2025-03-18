const z = require('zod');

const userSchema = z.object({
    name: z.string().min(5).max(50).optional(),
    email: z.string().email().min(5).max(255),
    password: z.string()
});

module.exports = userSchema;